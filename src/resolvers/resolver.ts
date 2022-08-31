import { FieldNode, GraphQLResolveInfo } from 'graphql';
import { Knex } from 'knex';
import cloneDeep from 'lodash/cloneDeep';
import flatMap from 'lodash/flatMap';
import { Context, FullContext } from '../context';
import { applyPermissions, PermissionError } from '../permissions/check';
import { get, summon } from '../utils';
import { applyFilters } from './filters';
import {
  FieldResolverNode,
  getFragmentSpreads,
  getInlineFragments,
  getJoins,
  getRootFieldNode,
  getSimpleFields,
  ResolverNode,
} from './node';
import { addJoin, applyJoins, Entry, getNameOrAlias, hydrate, ID_ALIAS, isListType, Joins } from './utils';

export const queryResolver = (_parent: unknown, _args: unknown, ctx: Context, info: GraphQLResolveInfo) =>
  resolve({ ...ctx, info });

export const resolve = async (ctx: FullContext, id?: string) => {
  const fieldNode = summon(ctx.info.fieldNodes, (n: FieldNode) => n.name.value === ctx.info.fieldName);
  const baseTypeDefinition = get(
    ctx.info.operation.operation === 'query' ? ctx.info.schema.getQueryType() : ctx.info.schema.getMutationType(),
    'astNode'
  );
  const node = getRootFieldNode({
    ctx,
    node: fieldNode,
    baseTypeDefinition,
  });
  const { query } = await buildQuery(node);

  if (ctx.info.fieldName === 'me') {
    // eslint-disable-next-line @typescript-eslint/no-floating-promises -- we do not need to await knex here
    query.where({ [`${node.tableAlias}.id`]: node.ctx.user.id });
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

  const res = hydrate(node.tableAlias, raw);

  await applySubQueries(node, res);

  return node.isList ? res : res[0];
};

const buildQuery = async (node: FieldResolverNode): Promise<{ query: Knex.QueryBuilder }> => {
  const query = node.ctx.knex.fromRaw(
    `"${node.tableName}"${node.tableAlias !== node.tableName ? ` as "${node.tableAlias}"` : ''}`
  );

  const joins: Joins = {};
  await applyFilters(node, query);
  applySelects(node, query, joins);
  applyJoins(query, joins);

  applyPermissions(node.ctx, node.model.name, node.tableAlias, query, 'READ');
  for (const table of Object.keys(joins)) {
    for (const alias of Object.keys(joins[table])) {
      applyPermissions(node.ctx, table, alias, query, 'READ');
    }
  }

  return { query };
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

          if (!field || field.relation || field.raw) {
            return false;
          }

          if (field.queriableBy && !field.queriableBy.includes(node.ctx.user.role)) {
            throw new PermissionError(node.model, 'READ', field);
          }

          return true;
        })
        .map((n) => ({ field: n.name.value, alias: getNameOrAlias(n) })),
    ].map(
      ({ field, alias }: { field: string; alias: string }) => `${node.tableAlias}.${field} as ${node.tableAlias}__${alias}`
    )
  );

  for (const subNode of getInlineFragments(node)) {
    applySelects(subNode, query, joins);
  }

  for (const subNode of getFragmentSpreads(node)) {
    applySelects(subNode, query, joins);
  }

  for (const subNode of getJoins(node, false)) {
    addJoin(
      joins,
      subNode.tableName,
      subNode.tableAlias,
      `${node.tableAlias}.${subNode.foreignKey}`,
      `${subNode.tableAlias}.id`
    );

    applySelects(subNode, query, joins);
  }
};

const applySubQueries = async (node: ResolverNode, entries: Entry[]): Promise<void> => {
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

    const query = node.ctx.knex.queryBuilder();
    entries.forEach((entry) => (entry[fieldName] = isList ? [] : null));
    const foreignKey = get(subNode, 'foreignKey');

    for (const id of ids) {
      const { query: subQuery } = await buildQuery(subNode);
      // eslint-disable-next-line @typescript-eslint/no-floating-promises -- we do not need to await knex here
      subQuery
        .select(`${subNode.tableAlias}.${foreignKey} as ${subNode.tableAlias}__${foreignKey}`)
        .where({ [`${subNode.tableAlias}.${foreignKey}`]: id });
      // eslint-disable-next-line @typescript-eslint/no-floating-promises -- we do not need to await knex here
      query.unionAll(subQuery, true);
    }

    const rawChildren = await query;

    const children = hydrate(subNode.tableAlias, rawChildren);

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
      )
    );
  }

  for (const subNode of getInlineFragments(node)) {
    await applySubQueries(subNode, entries);
  }

  for (const subNode of getFragmentSpreads(node)) {
    await applySubQueries(subNode, entries);
  }

  for (const subNode of getJoins(node, false)) {
    await applySubQueries(subNode, entries.map((item) => item[getNameOrAlias(subNode.field)] as Entry).filter(Boolean));
  }
};
