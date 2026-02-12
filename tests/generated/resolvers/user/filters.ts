import { Knex } from 'knex';
import { FullContext, ForbiddenError, UserInputError, getPermissionStack, addJoin, applyJoins, ors, apply, SPECIAL_FILTERS, concreteNormalizeArguments } from '../../../../src';
import type { Joins, QueryBuilderOps } from '../../../../src';
import type { ConcreteFieldNode } from '../../../../src';
import { applyAnotherObjectWhere } from '../another-object/filters';
import { applySomeObjectWhere } from '../some-object/filters';
import { applyReactionWhere } from '../reaction/filters';

export const applyUserFilters = async (
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

  await node.ctx.queryHook?.({ model: node.ctx.models.getModel('User', 'entity'), query, args: normalizedArguments, ctx: node.ctx });

  if (limit) {
    query.limit(limit);
  }

  if (offset) {
    query.offset(offset);
  }

  if (orderBy) {
    applyUserOrderBy(node.ctx, node.rootTableAlias, node.tableAlias, orderBy, query, joins);
  }

  const ops: QueryBuilderOps = [];
  applyUserWhere(node.ctx, node.rootTableAlias, node.tableAlias, where, ops, joins);
  apply(query, ops);

  if (search) {
    applyUserSearch(node.ctx, node.rootTableAlias, node.tableAlias, search, query);
  }
}

export const applyUserWhere = (
  ctx: FullContext,
  rootTableAlias: string,
  tableAlias: string,
  where: Record<string, any> | undefined,
  ops: QueryBuilderOps,
  joins: Joins,
) => {
  if (!where) {
    return;
  }

  const aliases = ctx.aliases;

  for (const key of Object.keys(where)) {
    const value = where[key];

    if (key === 'NOT') {
      const subOps: QueryBuilderOps = [];
      applyUserWhere(ctx, rootTableAlias, tableAlias, value, subOps, joins);
      ops.push((query) => query.whereNot((subQuery) => apply(subQuery, subOps)));
      continue;
    }

    if (key === 'AND') {
      for (const subWhere of value) {
        applyUserWhere(ctx, rootTableAlias, tableAlias, subWhere, ops, joins);
      }
      continue;
    }

    if (key === 'OR') {
      const allSubOps: QueryBuilderOps[] = [];
      for (const subWhere of value) {
        const subOps: QueryBuilderOps = [];
        applyUserWhere(ctx, rootTableAlias, tableAlias, subWhere, subOps, joins);
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
          case 'deletedAnotherObjects': {
            const subRootAlias = `${tableAlias}__W__${key}`;
            const subAlias = subRootAlias;
            const subOps: QueryBuilderOps = [];
            const subJoins: Joins = [];
            applyAnotherObjectWhere(ctx, subRootAlias, subAlias, value, subOps, subJoins);
            ops.push((query) => query[filter === 'SOME' ? 'whereExists' : 'whereNotExists']((subQuery: any) => {
              void subQuery.from(`AnotherObject as ${aliases.getShort(subAlias)}`)
                .whereRaw('?? = ??', [`${aliases.getShort(subAlias)}.deletedById`, `${aliases.getShort(tableAlias)}.id`]);
              void apply(subQuery, subOps);
              applyJoins(aliases, subQuery, subJoins);
            }));
            break;
          }
          case 'createdManyObjects': {
            const subRootAlias = `${tableAlias}__W__${key}`;
            const subAlias = subRootAlias;
            const subOps: QueryBuilderOps = [];
            const subJoins: Joins = [];
            applySomeObjectWhere(ctx, subRootAlias, subAlias, value, subOps, subJoins);
            ops.push((query) => query[filter === 'SOME' ? 'whereExists' : 'whereNotExists']((subQuery: any) => {
              void subQuery.from(`SomeObject as ${aliases.getShort(subAlias)}`)
                .whereRaw('?? = ??', [`${aliases.getShort(subAlias)}.createdById`, `${aliases.getShort(tableAlias)}.id`]);
              void apply(subQuery, subOps);
              applyJoins(aliases, subQuery, subJoins);
            }));
            break;
          }
          case 'updatedManyObjects': {
            const subRootAlias = `${tableAlias}__W__${key}`;
            const subAlias = subRootAlias;
            const subOps: QueryBuilderOps = [];
            const subJoins: Joins = [];
            applySomeObjectWhere(ctx, subRootAlias, subAlias, value, subOps, subJoins);
            ops.push((query) => query[filter === 'SOME' ? 'whereExists' : 'whereNotExists']((subQuery: any) => {
              void subQuery.from(`SomeObject as ${aliases.getShort(subAlias)}`)
                .whereRaw('?? = ??', [`${aliases.getShort(subAlias)}.updatedById`, `${aliases.getShort(tableAlias)}.id`]);
              void apply(subQuery, subOps);
              applyJoins(aliases, subQuery, subJoins);
            }));
            break;
          }
          case 'deletedManyObjects': {
            const subRootAlias = `${tableAlias}__W__${key}`;
            const subAlias = subRootAlias;
            const subOps: QueryBuilderOps = [];
            const subJoins: Joins = [];
            applySomeObjectWhere(ctx, subRootAlias, subAlias, value, subOps, subJoins);
            ops.push((query) => query[filter === 'SOME' ? 'whereExists' : 'whereNotExists']((subQuery: any) => {
              void subQuery.from(`SomeObject as ${aliases.getShort(subAlias)}`)
                .whereRaw('?? = ??', [`${aliases.getShort(subAlias)}.deletedById`, `${aliases.getShort(tableAlias)}.id`]);
              void apply(subQuery, subOps);
              applyJoins(aliases, subQuery, subJoins);
            }));
            break;
          }
          case 'createdReactions': {
            const subRootAlias = `${tableAlias}__W__${key}`;
            const subAlias = subRootAlias;
            const subOps: QueryBuilderOps = [];
            const subJoins: Joins = [];
            applyReactionWhere(ctx, subRootAlias, subAlias, value, subOps, subJoins);
            ops.push((query) => query[filter === 'SOME' ? 'whereExists' : 'whereNotExists']((subQuery: any) => {
              void subQuery.from(`Reaction as ${aliases.getShort(subAlias)}`)
                .whereRaw('?? = ??', [`${aliases.getShort(subAlias)}.createdById`, `${aliases.getShort(tableAlias)}.id`]);
              void apply(subQuery, subOps);
              applyJoins(aliases, subQuery, subJoins);
            }));
            break;
          }
          case 'updatedReactions': {
            const subRootAlias = `${tableAlias}__W__${key}`;
            const subAlias = subRootAlias;
            const subOps: QueryBuilderOps = [];
            const subJoins: Joins = [];
            applyReactionWhere(ctx, subRootAlias, subAlias, value, subOps, subJoins);
            ops.push((query) => query[filter === 'SOME' ? 'whereExists' : 'whereNotExists']((subQuery: any) => {
              void subQuery.from(`Reaction as ${aliases.getShort(subAlias)}`)
                .whereRaw('?? = ??', [`${aliases.getShort(subAlias)}.updatedById`, `${aliases.getShort(tableAlias)}.id`]);
              void apply(subQuery, subOps);
              applyJoins(aliases, subQuery, subJoins);
            }));
            break;
          }
          case 'deletedReactions': {
            const subRootAlias = `${tableAlias}__W__${key}`;
            const subAlias = subRootAlias;
            const subOps: QueryBuilderOps = [];
            const subJoins: Joins = [];
            applyReactionWhere(ctx, subRootAlias, subAlias, value, subOps, subJoins);
            ops.push((query) => query[filter === 'SOME' ? 'whereExists' : 'whereNotExists']((subQuery: any) => {
              void subQuery.from(`Reaction as ${aliases.getShort(subAlias)}`)
                .whereRaw('?? = ??', [`${aliases.getShort(subAlias)}.deletedById`, `${aliases.getShort(tableAlias)}.id`]);
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
          case 'username': {
            ops.push((query) => query.whereRaw(SPECIAL_FILTERS[filter], [`${aliases.getShort(rootTableAlias)}.username`, value as string]));
            break;
          }
          case 'role': {
            ops.push((query) => query.whereRaw(SPECIAL_FILTERS[filter], [`${aliases.getShort(rootTableAlias)}.role`, value as string]));
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
      case 'username': {
        const col = `${aliases.getShort(rootTableAlias)}.username`;
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
      case 'role': {
        const col = `${aliases.getShort(rootTableAlias)}.role`;
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

export const applyUserOrderBy = (
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
      case 'username': {
        void query.orderBy(`${aliases.getShort(rootTableAlias)}.username`, value);
        break;
      }
      case 'role': {
        void query.orderBy(`${aliases.getShort(rootTableAlias)}.role`, value);
        break;
      }
    }
  }
}

export const applyUserSearch = (
  ctx: FullContext,
  rootTableAlias: string,
  tableAlias: string,
  search: string,
  query: Knex.QueryBuilder,
) => {
  void search;
  void query;
}

