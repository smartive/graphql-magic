import { GraphQLResolveInfo } from 'graphql';
import { Knex } from 'knex';
import cloneDeep from 'lodash/cloneDeep';
import flatMap from 'lodash/flatMap';
import { Context, FullContext } from '../context';
import { NotFoundError } from '../errors';
import { get, summonByKey } from '../models/utils';
import { applyPermissions, collectCoveredLeafPaths, getPermissionStack } from '../permissions/check';
import { PermissionStack } from '../permissions/generate';
import { normalizeArguments } from './arguments';
import { applyFilters, collectUserLeavesByAlias } from './filters';
import { FieldResolverNode, ResolverNode, getFragmentSpreads, getInlineFragments, getJoins, getRootFieldNode } from './node';
import { applySelects } from './selects';
import {
  AliasGenerator,
  Entry,
  ID_ALIAS,
  Joins,
  applyJoins,
  getColumn,
  getNameOrAlias,
  getTechnicalDisplay,
  hydrate,
  isListType,
} from './utils';

export const queryResolver = (_parent: any, _args: any, ctx: Context, info: GraphQLResolveInfo) =>
  resolve({ ...ctx, info, aliases: new AliasGenerator() });

export const resolve = async (ctx: FullContext, id?: string) => {
  const fieldNode = summonByKey(ctx.info.fieldNodes, 'name.value', ctx.info.fieldName);
  const baseTypeDefinition = get(
    ctx.info.operation.operation === 'query' ? ctx.info.schema.getQueryType() : ctx.info.schema.getMutationType(),
    'astNode',
  );
  const node = getRootFieldNode({
    ctx,
    node: fieldNode,
    baseTypeDefinition,
  });
  const { query, verifiedPermissionStacks } = await buildQuery(node);

  if (ctx.info.fieldName === 'me') {
    if (!node.ctx.user?.id) {
      return undefined;
    }

    void query.where({ [getColumn(node, 'id')]: node.ctx.user.id });
  }

  if (id) {
    void query.where({ [getColumn(node, 'id')]: id });
  }

  if (!node.isList) {
    void query.limit(1);
  }

  if (process.env.DEBUG_GRAPHQL_MAGIC === 'true') {
    console.debug('QUERY', query.toString());
  }
  const raw = await query;

  const res = hydrate(node, raw);

  await applySubQueries(node, res, verifiedPermissionStacks);

  if (node.isList) {
    return res;
  }

  if (!res[0]) {
    throw new NotFoundError(`${getTechnicalDisplay(node.rootModel, { id })} not found`);
  }

  return res[0];
};

type VerifiedPermissionStacks = Record<string, PermissionStack>;

const buildQuery = async (
  node: FieldResolverNode,
  parentVerifiedPermissionStacks?: VerifiedPermissionStacks,
): Promise<{ query: Knex.QueryBuilder; verifiedPermissionStacks: VerifiedPermissionStacks; paginated: boolean }> => {
  const query = node.ctx.knex.fromRaw(`"${node.rootModel.name}" as "${node.ctx.aliases.getShort(node.resultAlias)}"`);
  const joins: Joins = [];
  const { paginated, includesDeletedRows } = await applyFilters(node, query, joins);
  applySelects(node, query, joins);
  applyJoins(node.ctx.aliases, query, joins);

  const tables = [
    [node.rootModel.name, node.rootTableAlias] satisfies [string, string],
    ...joins.map(({ table2Name, table2Alias }) => [table2Name, table2Alias] satisfies [string, string]),
  ];

  // Filter-join coverage: when the user's WHERE traverses a relation only
  // through field paths that are *already* constrained by the root entity's
  // own permission WHERE, the joined entity's own `Entity.WHERE` permission
  // adds nothing — every row it would filter out is one the root scope had
  // already excluded, and every row that survives the root scope is one the
  // user could have learned about by reading the root entity anyway. In that
  // case we skip the joined-entity permission check on the filter join.
  //
  // The check is deliberately narrow: it fires only for filter-joined aliases
  // (those produced by `applyWhere` — recognisable by the `__W__` / `__WS__`
  // marker), and only when *every* leaf the user supplied at or below that
  // join is in the root permission's covered leaf-path set. Any unrecognised
  // leaf — including filtering by a different field on the same relation —
  // falls back to the strict per-table permission application.
  //
  // Direct top-level `<entity>(where: …)` queries do not exercise this
  // codepath: they hit `applyPermissions` on the root alias, never on a
  // `__W__` alias, so an `Entity.WHERE` on the queried entity itself is
  // applied exactly as before.
  const rootPermissionStack = getPermissionStack(node.ctx, node.rootModel.name, 'READ');
  const coveredPaths =
    typeof rootPermissionStack === 'boolean' ? null : collectCoveredLeafPaths(rootPermissionStack);
  const userLeavesByAlias =
    coveredPaths === null || coveredPaths.size === 0
      ? null
      : collectUserLeavesByAlias(node.model, normalizeArguments(node).where);

  const verifiedPermissionStacks: VerifiedPermissionStacks = {};
  for (const [table, alias] of tables) {
    if (
      coveredPaths !== null &&
      userLeavesByAlias !== null &&
      alias !== node.rootTableAlias &&
      (alias.includes('__W__') || alias.includes('__WS__'))
    ) {
      const userLeaves = userLeavesByAlias.get(alias);
      if (userLeaves && userLeaves.size > 0 && [...userLeaves].every((p) => coveredPaths.has(p))) {
        // Every leaf the user supplied at or below this filter join is
        // already constrained by the root permission's WHERE — skip the
        // joined-entity permission check for this alias.
        continue;
      }
    }

    const verifiedPermissionStack = applyPermissions(
      node.ctx,
      table,
      node.ctx.aliases.getShort(alias),
      query,
      'READ',
      parentVerifiedPermissionStacks?.[alias.split('__').slice(0, -1).join('__')],
      includesDeletedRows,
    );

    if (typeof verifiedPermissionStack !== 'boolean') {
      verifiedPermissionStacks[alias] = verifiedPermissionStack;
    }
  }

  return { query, verifiedPermissionStacks, paginated };
};

const applySubQueries = async (
  node: ResolverNode,
  entries: Entry[],
  parentVerifiedPermissionStacks: VerifiedPermissionStacks,
): Promise<void> => {
  if (node.isAggregate) {
    return;
  }

  if (!entries.length) {
    return;
  }

  const entriesById: Record<string, Entry[]> = {};
  for (const entry of entries) {
    if (!entriesById[entry[ID_ALIAS]]) {
      entriesById[entry[ID_ALIAS]] = [];
    }
    entriesById[entry[ID_ALIAS]].push(entry);
  }
  const ids = Object.keys(entriesById);

  // One to many
  for (const subNode of getJoins(node, true)) {
    const fieldName = getNameOrAlias(subNode.field);
    const isList = isListType(subNode.fieldDefinition.type);
    entries.forEach((entry) => (entry[fieldName] = isList ? [] : null));
    const foreignKey = subNode.foreignKey;
    const { query, verifiedPermissionStacks, paginated } = await buildQuery(subNode, parentVerifiedPermissionStacks);
    const shortTableAlias = subNode.ctx.aliases.getShort(subNode.tableAlias);
    const shortResultAlias = subNode.ctx.aliases.getShort(subNode.resultAlias);
    const foreignKeyColumn = `${shortTableAlias}.${foreignKey}`;

    let rawChildren: Record<string, Knex.Value>[];
    if (!paginated) {
      rawChildren = await query
        .select(`${foreignKeyColumn} as ${shortResultAlias}__${foreignKey}`)
        .whereIn(foreignKeyColumn, ids);
    } else {
      rawChildren = [];
      for (const id of ids) {
        const rows = await query
          .clone()
          .select(`${foreignKeyColumn} as ${shortResultAlias}__${foreignKey}`)
          .where({ [foreignKeyColumn]: id });
        rawChildren.push(...rows);
      }
    }
    const children = hydrate(subNode, rawChildren);

    for (const child of children) {
      for (const entry of entriesById[child[foreignKey] as string]) {
        const childClone = cloneDeep(child);
        childClone.PARENT = entry;
        if (isList) {
          (entry[fieldName] as Entry[]).push(childClone);
        } else {
          entry[fieldName] = childClone;
        }
      }
    }

    await applySubQueries(
      subNode,
      flatMap(
        entries.map((entry) => {
          const children = entry[fieldName];

          return (isList ? children : children ? [children] : []) as Entry[];
        }),
      ),
      verifiedPermissionStacks,
    );
  }

  for (const subNode of getInlineFragments(node)) {
    await applySubQueries(subNode, entries, parentVerifiedPermissionStacks);
  }

  for (const subNode of getFragmentSpreads(node)) {
    await applySubQueries(subNode, entries, parentVerifiedPermissionStacks);
  }

  for (const subNode of getJoins(node, false)) {
    await applySubQueries(
      subNode,
      entries.map((item) => item[getNameOrAlias(subNode.field)] as Entry).filter(Boolean),
      parentVerifiedPermissionStacks,
    );
  }
};
