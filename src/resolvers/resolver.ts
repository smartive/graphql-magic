import { GraphQLResolveInfo } from 'graphql';
import { Knex } from 'knex';
import cloneDeep from 'lodash/cloneDeep';
import flatMap from 'lodash/flatMap';
import { Context, FullContext } from '../context';
import { NotFoundError } from '../errors';
import { get, summonByKey } from '../models/utils';
import { applyPermissions } from '../permissions/check';
import { PermissionStack } from '../permissions/generate';
import { applyFilters } from './filters';
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

  const raw = await query;

  const res = hydrate(node, raw);

  await applySubQueries(node, res, verifiedPermissionStacks);

  if (node.isList) {
    return res;
  }

  if (!res[0]) {
    console.error(`${getTechnicalDisplay(node.rootModel, { id })} not found`, query.toString());
    throw new NotFoundError(`${getTechnicalDisplay(node.rootModel, { id })} not found`);
  }

  return res[0];
};

type VerifiedPermissionStacks = Record<string, PermissionStack>;

const buildQuery = async (
  node: FieldResolverNode,
  parentVerifiedPermissionStacks?: VerifiedPermissionStacks,
): Promise<{ query: Knex.QueryBuilder; verifiedPermissionStacks: VerifiedPermissionStacks }> => {
  const query = node.ctx.knex.fromRaw(`"${node.rootModel.name}" as "${node.ctx.aliases.getShort(node.resultAlias)}"`);

  const joins: Joins = [];
  applyFilters(node, query, joins);
  applySelects(node, query, joins);
  applyJoins(node.ctx.aliases, query, joins);

  const tables = [
    [node.rootModel.name, node.rootTableAlias] satisfies [string, string],
    ...joins.map(({ table2Name, table2Alias }) => [table2Name, table2Alias] satisfies [string, string]),
  ];

  const verifiedPermissionStacks: VerifiedPermissionStacks = {};
  for (const [table, alias] of tables) {
    const verifiedPermissionStack = applyPermissions(
      node.ctx,
      table,
      node.ctx.aliases.getShort(alias),
      query,
      'READ',
      parentVerifiedPermissionStacks?.[alias.split('__').slice(0, -1).join('__')],
    );

    if (typeof verifiedPermissionStack !== 'boolean') {
      verifiedPermissionStacks[alias] = verifiedPermissionStack;
    }
  }

  return { query, verifiedPermissionStacks };
};

const applySubQueries = async (
  node: ResolverNode,
  entries: Entry[],
  parentVerifiedPermissionStacks: VerifiedPermissionStacks,
): Promise<void> => {
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
    const { query, verifiedPermissionStacks } = await buildQuery(subNode, parentVerifiedPermissionStacks);
    const shortTableAlias = subNode.ctx.aliases.getShort(subNode.tableAlias);
    const shortResultAlias = subNode.ctx.aliases.getShort(subNode.resultAlias);
    const queries = ids.map((id) =>
      query
        .clone()
        .select(`${shortTableAlias}.${foreignKey} as ${shortResultAlias}__${foreignKey}`)
        .where({ [`${shortTableAlias}.${foreignKey}`]: id }),
    );

    // TODO: make unionAll faster then promise.all...
    // const rawChildren = await node.ctx.knex.queryBuilder().unionAll(queries, true);
    const rawChildren = (await Promise.all(queries)).flat();
    const children = hydrate(subNode, rawChildren);

    for (const child of children) {
      for (const entry of entriesById[child[foreignKey] as string]) {
        if (isList) {
          (entry[fieldName] as Entry[]).push(cloneDeep(child));
        } else {
          entry[fieldName] = cloneDeep(child);
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
