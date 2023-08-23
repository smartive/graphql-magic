import { Knex } from 'knex';
import { ForbiddenError, UserInputError } from '../errors';
import { get, summonByName } from '../models/utils';
import { OrderBy, Where, normalizeArguments } from './arguments';
import { FieldResolverNode, WhereNode } from './node';
import { Joins, Ops, addJoin, apply, ors } from './utils';

export const SPECIAL_FILTERS: Record<string, string> = {
  GT: '?? > ?',
  GTE: '?? >= ?',
  LT: '?? < ?',
  LTE: '?? <= ?',
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
  if (node.model.deletable) {
    if (!normalizedArguments.where) {
      normalizedArguments.where = {};
    }
    if (
      normalizedArguments.where.deleted &&
      (!Array.isArray(normalizedArguments.where.deleted) || normalizedArguments.where.deleted.some((v) => v))
    ) {
      if (node.ctx.user.role !== 'ADMIN') {
        throw new ForbiddenError('You cannot access deleted entries.');
      }
    } else {
      normalizedArguments.where.deleted = false;
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

  if (where) {
    const ops: Ops<Knex.QueryBuilder> = [];
    applyWhere(node, where, ops, joins);
    // eslint-disable-next-line @typescript-eslint/no-floating-promises -- we do not need to await knex here
    apply(query, ops);
  }

  if (search) {
    // eslint-disable-next-line @typescript-eslint/no-floating-promises -- we do not need to await knex here
    applySearch(node, search, query);
  }
};

const applyWhere = (node: WhereNode, where: Where, ops: Ops<Knex.QueryBuilder>, joins: Joins) => {
  for (const key of Object.keys(where)) {
    const value = where[key];

    const specialFilter = key.match(/^(\w+)_(\w+)$/);
    if (specialFilter) {
      const [, actualKey, filter] = specialFilter;
      if (!SPECIAL_FILTERS[filter]) {
        // Should not happen
        throw new Error(`Invalid filter ${key}.`);
      }
      ops.push((query) =>
        query.whereRaw(SPECIAL_FILTERS[filter], [`${node.shortTableAlias}.${actualKey}`, value as string])
      );
      continue;
    }

    const field = summonByName(node.model.fields, key);
    const fullKey = `${node.shortTableAlias}.${key}`;

    if (field.type === 'relation') {
      const relation = get(node.model.relationsByName, field.name);
      const tableAlias = `${node.model.name}__W__${key}`;
      const subNode: WhereNode = {
        ctx: node.ctx,
        model: relation.model,
        tableName: relation.model.name,
        tableAlias,
        shortTableAlias: node.ctx.aliases.getShort(tableAlias),
        foreignKey: relation.field.foreignKey,
      };
      addJoin(joins, node.tableAlias, subNode.tableName, subNode.tableAlias, get(subNode, 'foreignKey'), 'id');
      applyWhere(subNode, value as Where, ops, joins);
      continue;
    }

    if (Array.isArray(value)) {
      if (field && field.list) {
        ops.push((query) =>
          ors(
            query,
            value.map((v) => (subQuery) => subQuery.whereRaw('? = ANY(??)', [v, fullKey] as string[]))
          )
        );
        continue;
      }

      if (value.some((v) => v === null)) {
        if (value.some((v) => v !== null)) {
          ops.push((query) =>
            ors(query, [
              (subQuery) => subQuery.whereIn(fullKey, value.filter((v) => v !== null) as string[]),
              (subQuery) => subQuery.whereNull(fullKey),
            ])
          );
          continue;
        }

        ops.push((query) => query.whereNull(fullKey));
        continue;
      }

      ops.push((query) => query.whereIn(fullKey, value as string[]));
      continue;
    }

    ops.push((query) => query.where({ [fullKey]: value }));
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
            query.whereILike(`${node.shortTableAlias}.${name}`, `%${search}%`)
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
    // eslint-disable-next-line @typescript-eslint/no-floating-promises -- we do not need to await knex here
    query.orderBy(`${node.shortTableAlias}.${key}`, value);
  }
};
