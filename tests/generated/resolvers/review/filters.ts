import { Knex } from 'knex';
import { FullContext, ForbiddenError, UserInputError, getPermissionStack, addJoin, applyJoins, ors, apply, SPECIAL_FILTERS, concreteNormalizeArguments } from '../../../../src';
import type { Joins, QueryBuilderOps } from '../../../../src';
import type { ConcreteFieldNode } from '../../../../src';
import { applyReactionWhere, applyReactionOrderBy } from '../reaction/filters';
import { applyUserWhere, applyUserOrderBy } from '../user/filters';

export const applyReviewFilters = async (
  node: ConcreteFieldNode,
  query: Knex.QueryBuilder,
  joins: Joins,
) => {
  const normalizedArguments = concreteNormalizeArguments(node.field, node.fieldDefinition, node.ctx.info.schema, node.ctx.info.variableValues);

  if (!node.isAggregate) {
    if (!normalizedArguments.orderBy) {
      normalizedArguments.orderBy = [{ createdAt: 'DESC' }];
    }
  }

  const { limit, offset, orderBy, where, search } = normalizedArguments;

  await node.ctx.queryHook?.({ model: node.ctx.models.getModel('Review', 'entity'), query, args: normalizedArguments, ctx: node.ctx });

  if (limit) {
    query.limit(limit);
  }

  if (offset) {
    query.offset(offset);
  }

  if (orderBy) {
    applyReviewOrderBy(node.ctx, node.rootTableAlias, node.tableAlias, orderBy, query, joins);
  }

  void query.where({ [`${node.ctx.aliases.getShort(node.rootTableAlias)}.type`]: 'Review' });

  const ops: QueryBuilderOps = [];
  applyReviewWhere(node.ctx, node.rootTableAlias, node.tableAlias, where, ops, joins);
  apply(query, ops);

  if (search) {
    applyReviewSearch(node.ctx, node.rootTableAlias, node.tableAlias, search, query);
  }
}

export const applyReviewWhere = (
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
    if (!getPermissionStack(ctx, 'Review', 'DELETE')) {
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
      applyReviewWhere(ctx, rootTableAlias, tableAlias, value, subOps, joins);
      ops.push((query) => query.whereNot((subQuery) => apply(subQuery, subOps)));
      continue;
    }

    if (key === 'AND') {
      for (const subWhere of value) {
        applyReviewWhere(ctx, rootTableAlias, tableAlias, subWhere, ops, joins);
      }
      continue;
    }

    if (key === 'OR') {
      const allSubOps: QueryBuilderOps[] = [];
      for (const subWhere of value) {
        const subOps: QueryBuilderOps = [];
        applyReviewWhere(ctx, rootTableAlias, tableAlias, subWhere, subOps, joins);
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
          case 'childReactions': {
            const subRootAlias = `${tableAlias}__W__${key}`;
            const subAlias = subRootAlias;
            const subOps: QueryBuilderOps = [];
            const subJoins: Joins = [];
            applyReactionWhere(ctx, subRootAlias, subAlias, value, subOps, subJoins);
            ops.push((query) => query[filter === 'SOME' ? 'whereExists' : 'whereNotExists']((subQuery: any) => {
              void subQuery.from(`Reaction as ${aliases.getShort(subAlias)}`)
                .whereRaw('?? = ??', [`${aliases.getShort(subAlias)}.parentId`, `${aliases.getShort(tableAlias)}.id`]);
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
          case 'type': {
            ops.push((query) => query.whereRaw(SPECIAL_FILTERS[filter], [`${aliases.getShort(rootTableAlias)}.type`, value as string]));
            break;
          }
          case 'content': {
            ops.push((query) => query.whereRaw(SPECIAL_FILTERS[filter], [`${aliases.getShort(rootTableAlias)}.content`, value as string]));
            break;
          }
          case 'createdAt': {
            ops.push((query) => query.whereRaw(SPECIAL_FILTERS[filter], [`${aliases.getShort(rootTableAlias)}.createdAt`, value as string]));
            break;
          }
          case 'updatedAt': {
            ops.push((query) => query.whereRaw(SPECIAL_FILTERS[filter], [`${aliases.getShort(rootTableAlias)}.updatedAt`, value as string]));
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
          case 'rating': {
            ops.push((query) => query.whereRaw(SPECIAL_FILTERS[filter], [`${aliases.getShort(tableAlias)}.rating`, value as string]));
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
      case 'type': {
        const col = `${aliases.getShort(rootTableAlias)}.type`;
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
      case 'parent': {
        if (value === null) {
          ops.push((query) => query.whereNull(`${aliases.getShort(rootTableAlias)}.parentId`));
          continue;
        }
        const subRootAlias = `Review__W__${key}`;
        const subAlias = subRootAlias;
        addJoin(joins, tableAlias, 'Reaction', subAlias, 'parentId', 'id');
        applyReactionWhere(ctx, subRootAlias, subAlias, value, ops, joins);
        break;
      }
      case 'content': {
        const col = `${aliases.getShort(rootTableAlias)}.content`;
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
      case 'createdAt': {
        const col = `${aliases.getShort(rootTableAlias)}.createdAt`;
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
      case 'createdBy': {
        if (value === null) {
          ops.push((query) => query.whereNull(`${aliases.getShort(rootTableAlias)}.createdById`));
          continue;
        }
        const subRootAlias = `Review__W__${key}`;
        const subAlias = subRootAlias;
        addJoin(joins, tableAlias, 'User', subAlias, 'createdById', 'id');
        applyUserWhere(ctx, subRootAlias, subAlias, value, ops, joins);
        break;
      }
      case 'updatedAt': {
        const col = `${aliases.getShort(rootTableAlias)}.updatedAt`;
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
      case 'updatedBy': {
        if (value === null) {
          ops.push((query) => query.whereNull(`${aliases.getShort(rootTableAlias)}.updatedById`));
          continue;
        }
        const subRootAlias = `Review__W__${key}`;
        const subAlias = subRootAlias;
        addJoin(joins, tableAlias, 'User', subAlias, 'updatedById', 'id');
        applyUserWhere(ctx, subRootAlias, subAlias, value, ops, joins);
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
        const subRootAlias = `Review__W__${key}`;
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
      case 'rating': {
        const col = `${aliases.getShort(tableAlias)}.rating`;
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

export const applyReviewOrderBy = (
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
      case 'type': {
        void query.orderBy(`${aliases.getShort(rootTableAlias)}.type`, value);
        break;
      }
      case 'parent': {
        const subRootAlias = `Review__O__${key}`;
        const subAlias = subRootAlias;
        addJoin(joins, tableAlias, 'Reaction', subAlias, 'parentId', 'id');
        applyReactionOrderBy(ctx, subRootAlias, subAlias, value, query, joins);
        break;
      }
      case 'content': {
        void query.orderBy(`${aliases.getShort(rootTableAlias)}.content`, value);
        break;
      }
      case 'createdAt': {
        void query.orderBy(`${aliases.getShort(rootTableAlias)}.createdAt`, value);
        break;
      }
      case 'createdBy': {
        const subRootAlias = `Review__O__${key}`;
        const subAlias = subRootAlias;
        addJoin(joins, tableAlias, 'User', subAlias, 'createdById', 'id');
        applyUserOrderBy(ctx, subRootAlias, subAlias, value, query, joins);
        break;
      }
      case 'updatedAt': {
        void query.orderBy(`${aliases.getShort(rootTableAlias)}.updatedAt`, value);
        break;
      }
      case 'updatedBy': {
        const subRootAlias = `Review__O__${key}`;
        const subAlias = subRootAlias;
        addJoin(joins, tableAlias, 'User', subAlias, 'updatedById', 'id');
        applyUserOrderBy(ctx, subRootAlias, subAlias, value, query, joins);
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
        const subRootAlias = `Review__O__${key}`;
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
      case 'rating': {
        void query.orderBy(`${aliases.getShort(tableAlias)}.rating`, value);
        break;
      }
    }
  }
}

export const applyReviewSearch = (
  ctx: FullContext,
  rootTableAlias: string,
  tableAlias: string,
  search: string,
  query: Knex.QueryBuilder,
) => {
  void search;
  void query;
}

