import { GraphQLResolveInfo } from 'graphql';
import { Knex } from 'knex';
import cloneDeep from 'lodash/cloneDeep';
import flatMap from 'lodash/flatMap';
import { Context, FullContext } from '../context';
import { NotFoundError, PermissionError } from '../errors';
import { applyPermissions } from '../permissions/check';
import { PermissionStack } from '../permissions/generate';
import { get, summonByKey } from '../utils';
import { applyFilters } from './filters';
import {
  FieldResolverNode,
  ResolverNode,
  getFragmentSpreads,
  getInlineFragments,
  getJoins,
  getRootFieldNode,
  getSimpleFields,
} from './node';
import { AliasGenerator, Entry, ID_ALIAS, Joins, addJoin, applyJoins, getNameOrAlias, hydrate, isListType } from './utils';

export const queryResolver = (_parent: any, _args: any, ctx: Context, info: GraphQLResolveInfo) =>
  resolve({ ...ctx, info, aliases: new AliasGenerator() });

export const resolve = async (ctx: FullContext, id?: string) => {
  const fieldNode = summonByKey(ctx.info.fieldNodes, 'name.value', ctx.info.fieldName);
  const baseTypeDefinition = get(
    ctx.info.operation.operation === 'query' ? ctx.info.schema.getQueryType() : ctx.info.schema.getMutationType(),
    'astNode'
  );
  const node = getRootFieldNode({
    ctx,
    node: fieldNode,
    baseTypeDefinition,
  });
  const { query, verifiedPermissionStacks } = await buildQuery(node);

  if (ctx.info.fieldName === 'me') {
    // eslint-disable-next-line @typescript-eslint/no-floating-promises -- we do not need to await knex here
    query.where({ [`${node.shortTableAlias}.id`]: node.ctx.user.id });
  }

  if (!node.isList) {
    // eslint-disable-next-line @typescript-eslint/no-floating-promises -- we do not need to await knex here
    query.limit(1);
  }

  if (id) {
    // eslint-disable-next-line @typescript-eslint/no-floating-promises -- we do not need to await knex here
    query.where({ id });
  }

  const raw = await query;

  const res = hydrate(node, raw);

  await applySubQueries(node, res, verifiedPermissionStacks);

  if (node.isList) {
    return res;
  }

  if (!res[0]) {
    console.error('Entity not found', query.toString());
    throw new NotFoundError('Entity not found');
  }

  return res[0];
};

type VerifiedPermissionStacks = Record<string, PermissionStack>;

const buildQuery = async (
  node: FieldResolverNode,
  parentVerifiedPermissionStacks?: VerifiedPermissionStacks
): Promise<{ query: Knex.QueryBuilder; verifiedPermissionStacks: VerifiedPermissionStacks }> => {
  const { tableAlias, shortTableAlias, tableName, model, ctx } = node;
  const query = ctx.knex.fromRaw(`"${tableName}" as "${shortTableAlias}"`);

  const joins: Joins = {};
  applyFilters(node, query, joins);
  applySelects(node, query, joins);
  applyJoins(node.ctx.aliases, query, joins);

  const tables = [
    [model.name, tableAlias] as const,
    ...Object.keys(joins).map((tableName) => tableName.split(':') as [string, string]),
  ];
  const verifiedPermissionStacks: VerifiedPermissionStacks = {};
  for (const [table, alias] of tables) {
    const verifiedPermissionStack = applyPermissions(
      ctx,
      table,
      node.ctx.aliases.getShort(alias),
      query,
      'READ',
      parentVerifiedPermissionStacks?.[alias.split('__').slice(0, -1).join('__')]
    );

    if (typeof verifiedPermissionStack !== 'boolean') {
      verifiedPermissionStacks[alias] = verifiedPermissionStack;
    }
  }

  return { query, verifiedPermissionStacks };
};

const applySelects = (node: ResolverNode, query: Knex.QueryBuilder, joins: Joins) => {
  // Simple field selects
  // eslint-disable-next-line @typescript-eslint/no-floating-promises -- we do not need to await knex here
  query.select(
    ...[
      { field: 'id', alias: ID_ALIAS },
      ...getSimpleFields(node)
        .filter((n) => {
          const field = node.model.fields.find(({ name }) => name === n.name.value);

          if (!field || field.type === 'relation' || field.type === 'raw') {
            return false;
          }

          if (typeof field.queriable === 'object' && !field.queriable.roles?.includes(node.ctx.user.role)) {
            throw new PermissionError(
              'READ',
              `${node.model.name}'s field "${field.name}"`,
              'field permission not available'
            );
          }

          return true;
        })
        .map((n) => ({ field: n.name.value, alias: getNameOrAlias(n) })),
    ].map(
      ({ field, alias }: { field: string; alias: string }) =>
        `${node.shortTableAlias}.${field} as ${node.shortTableAlias}__${alias}`
    )
  );

  for (const subNode of getInlineFragments(node)) {
    applySelects(subNode, query, joins);
  }

  for (const subNode of getFragmentSpreads(node)) {
    applySelects(subNode, query, joins);
  }

  for (const subNode of getJoins(node, false)) {
    addJoin(joins, node.tableAlias, subNode.tableName, subNode.tableAlias, get(subNode, 'foreignKey'), 'id');

    applySelects(subNode, query, joins);
  }
};

const applySubQueries = async (
  node: ResolverNode,
  entries: Entry[],
  parentVerifiedPermissionStacks: VerifiedPermissionStacks
): Promise<void> => {
  if (!entries.length) {
    return;
  }

  const entriesById: { [id: string]: Entry[] } = {};
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
    const foreignKey = get(subNode, 'foreignKey');
    const { query, verifiedPermissionStacks } = await buildQuery(subNode, parentVerifiedPermissionStacks);
    const queries = ids.map((id) =>
      query
        .clone()
        .select(`${subNode.shortTableAlias}.${foreignKey} as ${subNode.shortTableAlias}__${foreignKey}`)
        .where({ [`${subNode.shortTableAlias}.${foreignKey}`]: id })
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
        })
      ),
      verifiedPermissionStacks
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
      parentVerifiedPermissionStacks
    );
  }
};
