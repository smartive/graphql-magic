import { GraphQLResolveInfo } from 'graphql';
import { Knex } from 'knex';
import cloneDeep from 'lodash/cloneDeep';
import flatMap from 'lodash/flatMap';
import { Context, FullContext, NotFoundError, applyPermissions, applyJoins, summonByKey, get, getTypeName, isListType, isFieldNode, isInlineFragmentNode, isFragmentSpreadNode, getNameOrAlias, getFragmentTypeName, AliasGenerator, ID_ALIAS, concreteHydrate } from '../../../../src';
import type { Joins } from '../../../../src';
import type { ConcreteResolverNode, ConcreteFieldNode, Entry, VerifiedPermissionStacks } from '../../../../src';
import { applyAnotherObjectFilters } from './filters';
import { applyAnotherObjectSelects } from './selects';
import { buildSomeObjectQuery, applySomeObjectSubQueries } from '../some-object/resolver';
import { applyUserSubQueries } from '../user/resolver';

export const buildAnotherObjectQuery = async (
  node: ConcreteFieldNode,
  parentVerifiedPermissionStacks?: VerifiedPermissionStacks,
): Promise<{ query: Knex.QueryBuilder; verifiedPermissionStacks: VerifiedPermissionStacks }> => {
  const query = node.ctx.knex.fromRaw(`"AnotherObject" as "${node.ctx.aliases.getShort(node.resultAlias)}"`);

  const joins: Joins = [];
  await applyAnotherObjectFilters(node, query, joins);
  applyAnotherObjectSelects(node, query, joins);
  applyJoins(node.ctx.aliases, query, joins);

  const tables: [string, string][] = [
    ['AnotherObject', node.rootTableAlias],
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

export const applyAnotherObjectSubQueries = async (
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

    switch (fieldName) {
      case 'self': {
        const isList = true;
        entries.forEach((entry) => (entry[fieldAlias] = []));

        const subTableAlias = `${node.tableAlias}__${fieldAlias}`;
        const subFieldDef = summonByKey(node.ctx.info.schema.getType('AnotherObject')?.astNode?.fields || [], 'name.value', fieldName);
        const subNode: ConcreteFieldNode = {
          ctx: node.ctx,
          rootTableAlias: subTableAlias,
          tableAlias: subTableAlias,
          resultAlias: subTableAlias,
          selectionSet: subField.selectionSet!.selections,
          isAggregate: false,
          field: subField,
          fieldDefinition: subFieldDef,
          isList: true,
        };

        const { query: subQuery, verifiedPermissionStacks } = await buildAnotherObjectQuery(subNode, parentVerifiedPermissionStacks);
        const shortTableAlias = node.ctx.aliases.getShort(subTableAlias);
        const shortResultAlias = node.ctx.aliases.getShort(subTableAlias);
        const queries = ids.map((id) =>
          subQuery.clone()
            .select(`${shortTableAlias}.myselfId as ${shortResultAlias}__myselfId`)
            .where({ [`${shortTableAlias}.myselfId`]: id }),
        );

        const rawChildren = (await Promise.all(queries)).flat();
        const children = concreteHydrate(subTableAlias, node.ctx.aliases, false, rawChildren);

        for (const child of children) {
          for (const entry of entriesById[child['myselfId'] as string] || []) {
            const childClone = cloneDeep(child);
            childClone.PARENT = entry;
            (entry[fieldAlias] as Entry[]).push(childClone);
          }
        }

        await applyAnotherObjectSubQueries(
          subNode,
          flatMap(entries.map((entry) => {
            const children = entry[fieldAlias];
            return (Array.isArray(children) ? children : children ? [children] : []) as Entry[];
          })),
          verifiedPermissionStacks,
        );
        break;
      }
      case 'manyObjects': {
        const isList = true;
        entries.forEach((entry) => (entry[fieldAlias] = []));

        const subTableAlias = `${node.tableAlias}__${fieldAlias}`;
        const subFieldDef = summonByKey(node.ctx.info.schema.getType('AnotherObject')?.astNode?.fields || [], 'name.value', fieldName);
        const subNode: ConcreteFieldNode = {
          ctx: node.ctx,
          rootTableAlias: subTableAlias,
          tableAlias: subTableAlias,
          resultAlias: subTableAlias,
          selectionSet: subField.selectionSet!.selections,
          isAggregate: false,
          field: subField,
          fieldDefinition: subFieldDef,
          isList: true,
        };

        const { query: subQuery, verifiedPermissionStacks } = await buildSomeObjectQuery(subNode, parentVerifiedPermissionStacks);
        const shortTableAlias = node.ctx.aliases.getShort(subTableAlias);
        const shortResultAlias = node.ctx.aliases.getShort(subTableAlias);
        const queries = ids.map((id) =>
          subQuery.clone()
            .select(`${shortTableAlias}.anotherId as ${shortResultAlias}__anotherId`)
            .where({ [`${shortTableAlias}.anotherId`]: id }),
        );

        const rawChildren = (await Promise.all(queries)).flat();
        const children = concreteHydrate(subTableAlias, node.ctx.aliases, false, rawChildren);

        for (const child of children) {
          for (const entry of entriesById[child['anotherId'] as string] || []) {
            const childClone = cloneDeep(child);
            childClone.PARENT = entry;
            (entry[fieldAlias] as Entry[]).push(childClone);
          }
        }

        await applySomeObjectSubQueries(
          subNode,
          flatMap(entries.map((entry) => {
            const children = entry[fieldAlias];
            return (Array.isArray(children) ? children : children ? [children] : []) as Entry[];
          })),
          verifiedPermissionStacks,
        );
        break;
      }
    }
  }

  for (const subField of node.selectionSet.filter(isFieldNode).filter(({ selectionSet }) => selectionSet)) {
    const fieldName = subField.name.value;
    const fieldAlias = getNameOrAlias(subField);
    switch (fieldName) {
      case 'myself': {
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

export const resolveAnotherObject = async (
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
    rootTableAlias: 'AnotherObject',
    tableAlias: 'AnotherObject',
    resultAlias: 'AnotherObject',
    selectionSet: fieldNode.selectionSet?.selections || [],
    isAggregate,
    field: fieldNode,
    fieldDefinition,
    isList,
  };

  const { query, verifiedPermissionStacks } = await buildAnotherObjectQuery(node);

  if (ctx.info.fieldName === 'me') {
    if (!ctx.user?.id) {
      return undefined;
    }
    void query.where({ [`${ctx.aliases.getShort('AnotherObject')}.id`]: ctx.user.id });
  }

  if (!isList) {
    void query.limit(1);
  }

  if (process.env.DEBUG_GRAPHQL_MAGIC === 'true') {
    console.debug('QUERY', query.toString());
  }
  const raw = await query;

  const res = concreteHydrate<Entry>(node.resultAlias, ctx.aliases, node.isAggregate, raw);

  await applyAnotherObjectSubQueries(node, res, verifiedPermissionStacks);

  if (isList) {
    return res;
  }

  if (!res[0]) {
    throw new NotFoundError('AnotherObject not found.');
  }

  return res[0];
}

