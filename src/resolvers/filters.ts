import { ForbiddenError, UserInputError } from 'apollo-server-errors';
import { Knex } from 'knex';
import { Dictionary } from 'lodash';
import { summonByName } from '../utils';
import { normalizeArguments, OrderBy, Where } from './arguments';
import { FieldResolverNode } from './node';
import { apply, Ops, ors } from './utils';

export const SPECIAL_FILTERS: Dictionary<string> = {
  GT: '?? > ?',
  GTE: '?? >= ?',
  LT: '?? < ?',
  LTE: '?? <= ?',
};

export const applyFilters = async (node: FieldResolverNode, query: Knex.QueryBuilder): Promise<void> => {
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
  const { limit, offset, orderBy, where } = normalizedArguments;

  if (limit) {
    // eslint-disable-next-line @typescript-eslint/no-floating-promises -- we do not need to await knex here
    query.limit(limit);
  }

  if (offset) {
    // eslint-disable-next-line @typescript-eslint/no-floating-promises -- we do not need to await knex here
    query.offset(offset);
  }

  if (orderBy) {
    await applyOrderBy(node, orderBy, query);
  }

  if (where) {
    const ops: Ops<Knex.QueryBuilder> = [];
    await applyWhere(node, where, ops);
    // eslint-disable-next-line @typescript-eslint/no-floating-promises -- we do not need to await knex here
    apply(query, ops);
  }
};

const applyWhere = async (node: FieldResolverNode, where: Where, ops: Ops<Knex.QueryBuilder>): Promise<void> => {
  for (const key of Object.keys(where)) {
    const value = where[key];

    ops.push((query) => {
      const specialFilter = key.match(/^(\w+)_(\w+)$/);
      if (specialFilter) {
        const [, actualKey, filter] = specialFilter;
        if (!SPECIAL_FILTERS[filter]) {
          // Should not happen
          throw new Error(`Invalid filter ${key}.`);
        }
        return query.whereRaw(SPECIAL_FILTERS[filter], [`${node.tableAlias}.${actualKey}`, value as string]);
      }

      const field = summonByName(node.model.fields, key);
      const fullKey = `${node.tableAlias}.${key}`;
      if (Array.isArray(value)) {
        if (field && field.list) {
          return ors(
            query,
            value.map((v) => (subQuery) => subQuery.whereRaw('? = ANY(??)', [v, fullKey] as string[]))
          );
        }

        if (value.some((v) => v === null)) {
          if (value.some((v) => v !== null)) {
            return ors(query, [
              (subQuery) => subQuery.whereIn(fullKey, value.filter((v) => v !== null) as string[]),
              (subQuery) => subQuery.whereNull(fullKey),
            ]);
          }

          return query.whereNull(fullKey);
        }

        return query.whereIn(fullKey, value as string[]);
      }

      return query.where({ [fullKey]: value });
    });
  }
};

const applyOrderBy = async (node: FieldResolverNode, orderBy: OrderBy, query: Knex.QueryBuilder): Promise<void> => {
  for (const vals of orderBy) {
    const keys = Object.keys(vals);
    if (keys.length !== 1) {
      throw new UserInputError(`You need to specify exactly 1 value to order by for each orderBy entry.`);
    }
    const key = keys[0];
    const value = vals[key];

    // Simple field
    // eslint-disable-next-line @typescript-eslint/no-floating-promises -- we do not need to await knex here
    query.orderBy(`${node.tableAlias}.${key}`, value);
  }
};
