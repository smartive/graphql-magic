import { GraphQLResolveInfo } from 'graphql';
import { Knex } from 'knex';
import cloneDeep from 'lodash/cloneDeep';
import flatMap from 'lodash/flatMap';
import { Context, FullContext, NotFoundError, applyPermissions, applyJoins, summonByKey, get, getTypeName, isListType, isFieldNode, isInlineFragmentNode, isFragmentSpreadNode, getNameOrAlias, getFragmentTypeName, AliasGenerator, ID_ALIAS, concreteHydrate } from '../../../../src';
import type { Joins } from '../../../../src';
import type { ConcreteResolverNode, ConcreteFieldNode, Entry, VerifiedPermissionStacks } from '../../../../src';
import { applySomeObjectFilters } from './filters';
import { applySomeObjectSelects } from './selects';
import { applyAnotherObjectSubQueries } from '../another-object/resolver';
import { applyUserSubQueries } from '../user/resolver';

export const buildSomeObjectQuery = async (
  node: ConcreteFieldNode,
  parentVerifiedPermissionStacks?: VerifiedPermissionStacks,
): Promise<{ query: Knex.QueryBuilder; verifiedPermissionStacks: VerifiedPermissionStacks }> => {
  const query = node.ctx.knex.fromRaw(`"SomeObject" as "${node.ctx.aliases.getShort(node.resultAlias)}"`);

  const joins: Joins = [];
  await applySomeObjectFilters(node, query, joins);
  applySomeObjectSelects(node, query, joins);
  applyJoins(node.ctx.aliases, query, joins);

  const tables: [string, string][] = [
    ['SomeObject', node.rootTableAlias],
    ...joins.map(({ table2Name, table2Alias }) => [table2Name, table2Alias] as [string, string]),
  ];

  const verifiedPermissionStacks: VerifiedPermissionStacks = {};
  for (const [table, alias] of tables) {
    const verifiedPermissionStack = applyPermissions(
      node.ctx, table, node.ctx.aliases.getShort(alias), query, 'READ',
      parentVerifiedPermissionStacks?.[alias.split('__').slice(0, -1).join('__')],
    );
    if (typeof verifiedPermissionStack !== 'boolean') {
      verifiedPermissionStacks[alias] = verifiedPermissionStack;
    }
  }

  return { query, verifiedPermissionStacks };
}

export const applySomeObjectSubQueries = async (
  node: ConcreteResolverNode,
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

  for (const subField of node.selectionSet.filter(isFieldNode).filter(({ selectionSet }) => selectionSet)) {
    const fieldName = subField.name.value;
    const fieldAlias = getNameOrAlias(subField);

  }

  for (const subField of node.selectionSet.filter(isFieldNode).filter(({ selectionSet }) => selectionSet)) {
    const fieldName = subField.name.value;
    const fieldAlias = getNameOrAlias(subField);
    switch (fieldName) {
      case 'another': {
        await applyAnotherObjectSubQueries(
          {
            ...node,
            rootTableAlias: `${node.tableAlias}__${fieldAlias}`,
            tableAlias: `${node.tableAlias}__${fieldAlias}`,
            resultAlias: `${node.tableAlias}__${fieldAlias}`,
            selectionSet: subField.selectionSet!.selections,
            isAggregate: false,
          },
          entries.map((item) => item[fieldAlias] as Entry).filter(Boolean),
          parentVerifiedPermissionStacks,
        );
        break;
      }
      case 'createdBy': {
        await applyUserSubQueries(
          {
            ...node,
            rootTableAlias: `${node.tableAlias}__${fieldAlias}`,
            tableAlias: `${node.tableAlias}__${fieldAlias}`,
            resultAlias: `${node.tableAlias}__${fieldAlias}`,
            selectionSet: subField.selectionSet!.selections,
            isAggregate: false,
          },
          entries.map((item) => item[fieldAlias] as Entry).filter(Boolean),
          parentVerifiedPermissionStacks,
        );
        break;
      }
      case 'updatedBy': {
        await applyUserSubQueries(
          {
            ...node,
            rootTableAlias: `${node.tableAlias}__${fieldAlias}`,
            tableAlias: `${node.tableAlias}__${fieldAlias}`,
            resultAlias: `${node.tableAlias}__${fieldAlias}`,
            selectionSet: subField.selectionSet!.selections,
            isAggregate: false,
          },
          entries.map((item) => item[fieldAlias] as Entry).filter(Boolean),
          parentVerifiedPermissionStacks,
        );
        break;
      }
      case 'deletedBy': {
        await applyUserSubQueries(
          {
            ...node,
            rootTableAlias: `${node.tableAlias}__${fieldAlias}`,
            tableAlias: `${node.tableAlias}__${fieldAlias}`,
            resultAlias: `${node.tableAlias}__${fieldAlias}`,
            selectionSet: subField.selectionSet!.selections,
            isAggregate: false,
          },
          entries.map((item) => item[fieldAlias] as Entry).filter(Boolean),
          parentVerifiedPermissionStacks,
        );
        break;
      }
    }
  }
}

export const resolveSomeObject = async (
  _parent: any,
  _args: any,
  partialCtx: Context,
  info: GraphQLResolveInfo,
) => {
  const ctx: FullContext = { ...partialCtx, info, aliases: new AliasGenerator() };
  const fieldNode = summonByKey(ctx.info.fieldNodes, 'name.value', ctx.info.fieldName);
  const baseTypeDefinition = get(
    ctx.info.operation.operation === 'query' ? ctx.info.schema.getQueryType() : ctx.info.schema.getMutationType(),
    'astNode',
  );
  const fieldDefinition = summonByKey(baseTypeDefinition.fields || [], 'name.value', fieldNode.name.value);

  const typeName = getTypeName(fieldDefinition.type);
  const isAggregate = typeName.endsWith('Aggregate');
  const isList = isListType(fieldDefinition.type);

  const node: ConcreteFieldNode = {
    ctx,
    rootTableAlias: 'SomeObject',
    tableAlias: 'SomeObject',
    resultAlias: 'SomeObject',
    selectionSet: fieldNode.selectionSet?.selections || [],
    isAggregate,
    field: fieldNode,
    fieldDefinition,
    isList,
  };

  const { query, verifiedPermissionStacks } = await buildSomeObjectQuery(node);

  if (ctx.info.fieldName === 'me') {
    if (!ctx.user?.id) {
      return undefined;
    }
    void query.where({ [`${ctx.aliases.getShort('SomeObject')}.id`]: ctx.user.id });
  }

  if (!isList) {
    void query.limit(1);
  }

  if (process.env.DEBUG_GRAPHQL_MAGIC === 'true') {
    console.debug('QUERY', query.toString());
  }
  const raw = await query;

  const res = concreteHydrate<Entry>(node.resultAlias, ctx.aliases, node.isAggregate, raw);

  await applySomeObjectSubQueries(node, res, verifiedPermissionStacks);

  if (isList) {
    return res;
  }

  if (!res[0]) {
    throw new NotFoundError('SomeObject not found.');
  }

  return res[0];
}

