import { Knex } from 'knex';
import { FullContext, ForbiddenError, UserInputError, getPermissionStack, addJoin, applyJoins, ors, apply, SPECIAL_FILTERS, concreteNormalizeArguments } from '../../../../src';
import type { Joins, QueryBuilderOps } from '../../../../src';
import type { ConcreteFieldNode } from '../../../../src';
import { applySomeObjectWhere } from '../some-object/filters';
import { applyUserWhere, applyUserOrderBy } from '../user/filters';

export const applyAnotherObjectFilters = async (
  node: ConcreteFieldNode,
  query: Knex.QueryBuilder,
  joins: Joins,
) => {
  const normalizedArguments = concreteNormalizeArguments(node.field, node.fieldDefinition, node.ctx.info.schema, node.ctx.info.variableValues);

  if (!node.isAggregate) {
    if (!normalizedArguments.orderBy) {
    }
  }

  const { limit, offset, orderBy, where, search } = normalizedArguments;

  await node.ctx.queryHook?.({ model: node.ctx.models.getModel('AnotherObject', 'entity'), query, args: normalizedArguments, ctx: node.ctx });

  if (limit) {
    query.limit(limit);
  }

  if (offset) {
    query.offset(offset);
  }

  if (orderBy) {
    applyAnotherObjectOrderBy(node.ctx, node.rootTableAlias, node.tableAlias, orderBy, query, joins);
  }

  const ops: QueryBuilderOps = [];
  applyAnotherObjectWhere(node.ctx, node.rootTableAlias, node.tableAlias, where, ops, joins);
  apply(query, ops);

  if (search) {
    applyAnotherObjectSearch(node.ctx, node.rootTableAlias, node.tableAlias, search, query);
  }
}

export const applyAnotherObjectWhere = (
  ctx: FullContext,
  rootTableAlias: string,
  tableAlias: string,
  where: Record<string, any> | undefined,
  ops: QueryBuilderOps,
  joins: Joins,
) => {
  if (where === undefined || where === null) {
    where = {};
  }if (where!.deleted && (!Array.isArray(where!.deleted) || where!.deleted.some((v: unknown) => v))) {
    if (!getPermissionStack(ctx, 'AnotherObject', 'DELETE')) {
      throw new ForbiddenError('You cannot access deleted entries.');
    }
  }else {
    where!.deleted = false;
  }

  if (!where) {
    return;
  }

  const aliases = ctx.aliases;

  for (const key of Object.keys(where)) {
    const value = where[key];

    if (key === 'NOT') {
      const subOps: QueryBuilderOps = [];
      applyAnotherObjectWhere(ctx, rootTableAlias, tableAlias, value, subOps, joins);
      ops.push((query) => query.whereNot((subQuery) => apply(subQuery, subOps)));
      continue;
    }

    if (key === 'AND') {
      for (const subWhere of value) {
        applyAnotherObjectWhere(ctx, rootTableAlias, tableAlias, subWhere, ops, joins);
      }
      continue;
    }

    if (key === 'OR') {
      const allSubOps: QueryBuilderOps[] = [];
      for (const subWhere of value) {
        const subOps: QueryBuilderOps = [];
        applyAnotherObjectWhere(ctx, rootTableAlias, tableAlias, subWhere, subOps, joins);
        allSubOps.push(subOps);
      }
      ops.push((query) => ors(query, allSubOps.map((subOps) => (subQuery: any) => apply(subQuery, subOps))));
      continue;
    }

    const specialFilter = key.match(/^(\w+)_(\w+)$/);
    if (specialFilter) {
      const [, actualKey, filter] = specialFilter;

      if (filter === 'SOME' || filter === 'NONE') {
        switch (actualKey) {
          case 'self': {
            const subRootAlias = `${tableAlias}__W__${key}`;
            const subAlias = subRootAlias;
            const subOps: QueryBuilderOps = [];
            const subJoins: Joins = [];
            applyAnotherObjectWhere(ctx, subRootAlias, subAlias, value, subOps, subJoins);
            ops.push((query) => query[filter === 'SOME' ? 'whereExists' : 'whereNotExists']((subQuery: any) => {
              void subQuery.from(`AnotherObject as ${aliases.getShort(subAlias)}`)
                .whereRaw('?? = ??', [`${aliases.getShort(subAlias)}.myselfId`, `${aliases.getShort(tableAlias)}.id`]);
              void apply(subQuery, subOps);
              applyJoins(aliases, subQuery, subJoins);
            }));
            break;
          }
          case 'manyObjects': {
            const subRootAlias = `${tableAlias}__W__${key}`;
            const subAlias = subRootAlias;
            const subOps: QueryBuilderOps = [];
            const subJoins: Joins = [];
            applySomeObjectWhere(ctx, subRootAlias, subAlias, value, subOps, subJoins);
            ops.push((query) => query[filter === 'SOME' ? 'whereExists' : 'whereNotExists']((subQuery: any) => {
              void subQuery.from(`SomeObject as ${aliases.getShort(subAlias)}`)
                .whereRaw('?? = ??', [`${aliases.getShort(subAlias)}.anotherId`, `${aliases.getShort(tableAlias)}.id`]);
              void apply(subQuery, subOps);
              applyJoins(aliases, subQuery, subJoins);
            }));
            break;
          }
        }
        continue;
      }

      if (SPECIAL_FILTERS[filter]) {
        switch (actualKey) {
          case 'id': {
            ops.push((query) => query.whereRaw(SPECIAL_FILTERS[filter], [`${aliases.getShort(rootTableAlias)}.id`, value as string]));
            break;
          }
          case 'name': {
            ops.push((query) => query.whereRaw(SPECIAL_FILTERS[filter], [`${aliases.getShort(rootTableAlias)}.name`, value as string]));
            break;
          }
          case 'deleted': {
            ops.push((query) => query.whereRaw(SPECIAL_FILTERS[filter], [`${aliases.getShort(rootTableAlias)}.deleted`, value as string]));
            break;
          }
          case 'deletedAt': {
            ops.push((query) => query.whereRaw(SPECIAL_FILTERS[filter], [`${aliases.getShort(rootTableAlias)}.deletedAt`, value as string]));
            break;
          }
          case 'deleteRootType': {
            ops.push((query) => query.whereRaw(SPECIAL_FILTERS[filter], [`${aliases.getShort(rootTableAlias)}.deleteRootType`, value as string]));
            break;
          }
          case 'deleteRootId': {
            ops.push((query) => query.whereRaw(SPECIAL_FILTERS[filter], [`${aliases.getShort(rootTableAlias)}.deleteRootId`, value as string]));
            break;
          }
        }
        continue;
      }
      continue;
    }

    switch (key) {
      case 'id': {
        const col = `${aliases.getShort(rootTableAlias)}.id`;
        if (Array.isArray(value)) {
          if (value.some((v: any) => v === null)) {
            if (value.some((v: any) => v !== null)) {
              ops.push((query) => ors(query, [(subQuery: any) => subQuery.whereIn(col, value.filter((v: any) => v !== null)), (subQuery: any) => subQuery.whereNull(col)]));
            }else {
              ops.push((query) => query.whereNull(col));
            }
          }else {
            ops.push((query) => query.whereIn(col, value));
          }
        }else if (value === null) {
          ops.push((query) => query.whereNull(col));
        }else {
          ops.push((query) => query.where({ [col]: value }));
        }
        break;
      }
      case 'name': {
        const col = `${aliases.getShort(rootTableAlias)}.name`;
        if (Array.isArray(value)) {
          if (value.some((v: any) => v === null)) {
            if (value.some((v: any) => v !== null)) {
              ops.push((query) => ors(query, [(subQuery: any) => subQuery.whereIn(col, value.filter((v: any) => v !== null)), (subQuery: any) => subQuery.whereNull(col)]));
            }else {
              ops.push((query) => query.whereNull(col));
            }
          }else {
            ops.push((query) => query.whereIn(col, value));
          }
        }else if (value === null) {
          ops.push((query) => query.whereNull(col));
        }else {
          ops.push((query) => query.where({ [col]: value }));
        }
        break;
      }
      case 'myself': {
        if (value === null) {
          ops.push((query) => query.whereNull(`${aliases.getShort(rootTableAlias)}.myselfId`));
          continue;
        }
        const subRootAlias = `AnotherObject__W__${key}`;
        const subAlias = subRootAlias;
        addJoin(joins, tableAlias, 'AnotherObject', subAlias, 'myselfId', 'id');
        applyAnotherObjectWhere(ctx, subRootAlias, subAlias, value, ops, joins);
        break;
      }
      case 'deleted': {
        const col = `${aliases.getShort(rootTableAlias)}.deleted`;
        if (Array.isArray(value)) {
          if (value.some((v: any) => v === null)) {
            if (value.some((v: any) => v !== null)) {
              ops.push((query) => ors(query, [(subQuery: any) => subQuery.whereIn(col, value.filter((v: any) => v !== null)), (subQuery: any) => subQuery.whereNull(col)]));
            }else {
              ops.push((query) => query.whereNull(col));
            }
          }else {
            ops.push((query) => query.whereIn(col, value));
          }
        }else if (value === null) {
          ops.push((query) => query.whereNull(col));
        }else {
          ops.push((query) => query.where({ [col]: value }));
        }
        break;
      }
      case 'deletedAt': {
        const col = `${aliases.getShort(rootTableAlias)}.deletedAt`;
        if (Array.isArray(value)) {
          if (value.some((v: any) => v === null)) {
            if (value.some((v: any) => v !== null)) {
              ops.push((query) => ors(query, [(subQuery: any) => subQuery.whereIn(col, value.filter((v: any) => v !== null)), (subQuery: any) => subQuery.whereNull(col)]));
            }else {
              ops.push((query) => query.whereNull(col));
            }
          }else {
            ops.push((query) => query.whereIn(col, value));
          }
        }else if (value === null) {
          ops.push((query) => query.whereNull(col));
        }else {
          ops.push((query) => query.where({ [col]: value }));
        }
        break;
      }
      case 'deletedBy': {
        if (value === null) {
          ops.push((query) => query.whereNull(`${aliases.getShort(rootTableAlias)}.deletedById`));
          continue;
        }
        const subRootAlias = `AnotherObject__W__${key}`;
        const subAlias = subRootAlias;
        addJoin(joins, tableAlias, 'User', subAlias, 'deletedById', 'id');
        applyUserWhere(ctx, subRootAlias, subAlias, value, ops, joins);
        break;
      }
      case 'deleteRootType': {
        const col = `${aliases.getShort(rootTableAlias)}.deleteRootType`;
        if (Array.isArray(value)) {
          if (value.some((v: any) => v === null)) {
            if (value.some((v: any) => v !== null)) {
              ops.push((query) => ors(query, [(subQuery: any) => subQuery.whereIn(col, value.filter((v: any) => v !== null)), (subQuery: any) => subQuery.whereNull(col)]));
            }else {
              ops.push((query) => query.whereNull(col));
            }
          }else {
            ops.push((query) => query.whereIn(col, value));
          }
        }else if (value === null) {
          ops.push((query) => query.whereNull(col));
        }else {
          ops.push((query) => query.where({ [col]: value }));
        }
        break;
      }
      case 'deleteRootId': {
        const col = `${aliases.getShort(rootTableAlias)}.deleteRootId`;
        if (Array.isArray(value)) {
          if (value.some((v: any) => v === null)) {
            if (value.some((v: any) => v !== null)) {
              ops.push((query) => ors(query, [(subQuery: any) => subQuery.whereIn(col, value.filter((v: any) => v !== null)), (subQuery: any) => subQuery.whereNull(col)]));
            }else {
              ops.push((query) => query.whereNull(col));
            }
          }else {
            ops.push((query) => query.whereIn(col, value));
          }
        }else if (value === null) {
          ops.push((query) => query.whereNull(col));
        }else {
          ops.push((query) => query.where({ [col]: value }));
        }
        break;
      }
    }
  }
}

export const applyAnotherObjectOrderBy = (
  ctx: FullContext,
  rootTableAlias: string,
  tableAlias: string,
  orderBy: any | any[],
  query: Knex.QueryBuilder,
  joins: Joins,
) => {
  const aliases = ctx.aliases;
  for (const vals of Array.isArray(orderBy) ? orderBy : [orderBy]) {
    const keys = Object.keys(vals);
    if (keys.length !== 1) {
      throw new UserInputError('You need to specify exactly 1 value to order by for each orderBy entry.');
    }
    const key = keys[0];
    const value = vals[key];

    switch (key) {
      case 'id': {
        void query.orderBy(`${aliases.getShort(rootTableAlias)}.id`, value);
        break;
      }
      case 'name': {
        void query.orderBy(`${aliases.getShort(rootTableAlias)}.name`, value);
        break;
      }
      case 'myself': {
        const subRootAlias = `AnotherObject__O__${key}`;
        const subAlias = subRootAlias;
        addJoin(joins, tableAlias, 'AnotherObject', subAlias, 'myselfId', 'id');
        applyAnotherObjectOrderBy(ctx, subRootAlias, subAlias, value, query, joins);
        break;
      }
      case 'deleted': {
        void query.orderBy(`${aliases.getShort(rootTableAlias)}.deleted`, value);
        break;
      }
      case 'deletedAt': {
        void query.orderBy(`${aliases.getShort(rootTableAlias)}.deletedAt`, value);
        break;
      }
      case 'deletedBy': {
        const subRootAlias = `AnotherObject__O__${key}`;
        const subAlias = subRootAlias;
        addJoin(joins, tableAlias, 'User', subAlias, 'deletedById', 'id');
        applyUserOrderBy(ctx, subRootAlias, subAlias, value, query, joins);
        break;
      }
      case 'deleteRootType': {
        void query.orderBy(`${aliases.getShort(rootTableAlias)}.deleteRootType`, value);
        break;
      }
      case 'deleteRootId': {
        void query.orderBy(`${aliases.getShort(rootTableAlias)}.deleteRootId`, value);
        break;
      }
    }
  }
}

export const applyAnotherObjectSearch = (
  ctx: FullContext,
  rootTableAlias: string,
  tableAlias: string,
  search: string,
  query: Knex.QueryBuilder,
) => {
  void search;
  void query;
}

