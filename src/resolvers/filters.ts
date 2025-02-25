import { Knex } from 'knex';
import { EntityModel, FullContext } from '..';
import { ForbiddenError, UserInputError } from '../errors';
import { OrderBy, Where, normalizeArguments } from './arguments';
import { FieldResolverNode } from './node';
import { Joins, QueryBuilderOps, addJoin, apply, applyJoins, getColumn, ors } from './utils';

export const SPECIAL_FILTERS: Record<string, string> = {
  GT: '?? > ?',
  GTE: '?? >= ?',
  LT: '?? < ?',
  LTE: '?? <= ?',
};

export type WhereNode = {
  ctx: FullContext;

  rootTableAlias: string;

  model: EntityModel;
  tableAlias: string;
};

export const applyFilters = (node: FieldResolverNode, query: Knex.QueryBuilder, joins: Joins) => {
  const normalizedArguments = normalizeArguments(node);
  if (!normalizedArguments.orderBy) {
    if (node.model.defaultOrderBy) {
      normalizedArguments.orderBy = node.model.defaultOrderBy;
    } else if (node.model.creatable) {
      normalizedArguments.orderBy = [{ createdAt: 'DESC' }];
    }
  }
  const { limit, offset, orderBy, where, search } = normalizedArguments;

  if (limit) {
    // eslint-disable-next-line @typescript-eslint/no-floating-promises -- we do not need to await knex here
    query.limit(limit);
  }

  if (offset) {
    // eslint-disable-next-line @typescript-eslint/no-floating-promises -- we do not need to await knex here
    query.offset(offset);
  }

  if (orderBy) {
    applyOrderBy(node, orderBy, query);
  }

  if (node.model.parent) {
    void query.where({
      [getColumn(node, 'type')]: node.model.name,
    });
  }

  const ops: QueryBuilderOps = [];
  applyWhere(node, where, ops, joins);
  void apply(query, ops);

  if (search) {
    void applySearch(node, search, query);
  }
};

const applyWhere = (node: WhereNode, where: Where | undefined, ops: QueryBuilderOps, joins: Joins) => {
  if (node.model.deletable) {
    if (!where) {
      where = {};
    }
    if (where.deleted && (!Array.isArray(where.deleted) || where.deleted.some((v) => v))) {
      if (node.ctx.user?.role !== 'ADMIN') {
        throw new ForbiddenError('You cannot access deleted entries.');
      }
    } else {
      where.deleted = false;
    }
  }

  if (!where) {
    return;
  }

  const aliases = node.ctx.aliases;

  for (const key of Object.keys(where)) {
    const value = where[key];

    if (key === 'NOT') {
      const subOps: QueryBuilderOps = [];
      applyWhere(node, value as Where, subOps, joins);
      ops.push((query) => query.whereNot((subQuery) => apply(subQuery, subOps)));
      continue;
    }

    if (key === 'AND') {
      for (const subWhere of value as Where[]) {
        applyWhere(node, subWhere, ops, joins);
      }
      continue;
    }

    if (key === 'OR') {
      const allSubOps: QueryBuilderOps[] = [];
      for (const subWhere of value as Where[]) {
        const subOps: QueryBuilderOps = [];
        applyWhere(node, subWhere, subOps, joins);
        allSubOps.push(subOps);
      }
      ops.push((query) =>
        ors(
          query,
          allSubOps.map((subOps) => (subQuery) => apply(subQuery, subOps))
        )
      );
      continue;
    }

    const specialFilter = key.match(/^(\w+)_(\w+)$/);
    if (specialFilter) {
      const [, actualKey, filter] = specialFilter;

      if (filter === 'SOME' || filter === 'NONE') {
        const reverseRelation = node.model.getReverseRelation(actualKey);
        const rootTableAlias = `${node.tableAlias}__W__${key}`;
        const targetModel = reverseRelation.targetModel;
        const tableAlias = targetModel === targetModel.rootModel ? rootTableAlias : `${node.tableAlias}__WS_${key}`;

        const subWhereNode: WhereNode = {
          ctx: node.ctx,
          rootTableAlias,
          model: targetModel,
          tableAlias,
        };
        const subOps: QueryBuilderOps = [];
        const subJoins: Joins = [];
        applyWhere(subWhereNode, value as Where, subOps, subJoins);

        // TODO: make this work with subtypes
        ops.push((query) =>
          query[filter === 'SOME' ? 'whereExists' : 'whereNotExists']((subQuery) => {
            void subQuery
              .from(`${targetModel.name} as ${aliases.getShort(tableAlias)}`)
              .whereRaw(`?? = ??`, [
                `${aliases.getShort(tableAlias)}.${reverseRelation.field.foreignKey}`,
                `${aliases.getShort(node.tableAlias)}.id`,
              ]);
            void apply(subQuery, subOps);
            applyJoins(aliases, subQuery, subJoins);
          })
        );
        continue;
      }

      if (!SPECIAL_FILTERS[filter]) {
        // Should not happen
        throw new Error(`Invalid filter ${key}.`);
      }
      ops.push((query) => query.whereRaw(SPECIAL_FILTERS[filter], [getColumn(node, actualKey), value as string]));
      continue;
    }

    const field = node.model.getField(key);

    if (field.kind === 'relation') {
      const relation = node.model.getRelation(field.name);
      const targetModel = relation.targetModel;
      const rootTableAlias = `${node.model.name}__W__${key}`;
      const tableAlias = targetModel === targetModel.rootModel ? rootTableAlias : `${node.model.name}__WS__${key}`;
      const subNode: WhereNode = {
        ctx: node.ctx,
        rootTableAlias,
        model: targetModel,
        tableAlias,
      };
      addJoin(joins, node.tableAlias, subNode.model.name, subNode.tableAlias, relation.field.foreignKey, 'id');
      applyWhere(subNode, value as Where, ops, joins);
      continue;
    }

    const column = getColumn(node, key);

    if (Array.isArray(value)) {
      if (field && field.list) {
        ops.push((query) =>
          ors(
            query,
            value.map((v) => (subQuery) => subQuery.whereRaw('? = ANY(??)', [v, column] as string[]))
          )
        );
        continue;
      }

      if (value.some((v) => v === null)) {
        if (value.some((v) => v !== null)) {
          ops.push((query) =>
            ors(query, [
              (subQuery) => subQuery.whereIn(column, value.filter((v) => v !== null) as string[]),
              (subQuery) => subQuery.whereNull(column),
            ])
          );
          continue;
        }

        ops.push((query) => query.whereNull(column));
        continue;
      }

      ops.push((query) => query.whereIn(column, value as string[]));
      continue;
    }

    ops.push((query) => query.where({ [column]: value }));
  }
};

const applySearch = (node: FieldResolverNode, search: string, query: Knex.QueryBuilder) =>
  ors(
    query,
    node.model.fields
      .filter(({ searchable }) => searchable)
      .map(
        ({ name }) =>
          (query) =>
            query.whereILike(getColumn(node, name), `%${search}%`)
      )
  );

const applyOrderBy = (node: FieldResolverNode, orderBy: OrderBy, query: Knex.QueryBuilder) => {
  for (const vals of orderBy) {
    const keys = Object.keys(vals);
    if (keys.length !== 1) {
      throw new UserInputError(`You need to specify exactly 1 value to order by for each orderBy entry.`);
    }
    const key = keys[0];
    const value = vals[key];

    // Simple field
    void query.orderBy(getColumn(node, key), value);
  }
};
