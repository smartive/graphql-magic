import { Knex } from 'knex';
import { EntityModel, FullContext, getPermissionStack } from '..';
import { ForbiddenError, UserInputError } from '../errors';
import { OrderBy, Where, normalizeArguments } from './arguments';
import { FieldResolverNode } from './node';
import { Joins, QueryBuilderOps, addJoin, apply, applyJoins, getColumn, getColumnExpression, ors } from './utils';

export const SPECIAL_FILTERS: Record<string, string> = {
  GT: '?? > ?',
  GTE: '?? >= ?',
  LT: '?? < ?',
  LTE: '?? <= ?',
};

export type FilterNode = {
  ctx: FullContext;

  rootTableAlias: string;

  model: EntityModel;
  tableAlias: string;
};

/** True when the query may return soft-deleted rows (`deleted: true` or `deleted: null`). */
export const includesDeletedRows = (deleted: boolean | null | undefined) => deleted === true || deleted === null;

/**
 * Walk a user-supplied WHERE and record, for every filter-join table
 * alias produced along the way, the set of leaf field paths (in
 * root-relative dotted form) the user is filtering by at OR below that
 * alias.
 *
 * The alias scheme deliberately mirrors `applyWhere`: traversing into
 * relation `<key>` from a node whose model is `M` produces the alias
 * `${M.name}__W__${key}` (and `${M.name}__WS__${key}` for subtype
 * traversals). That keeps the keys directly comparable to the
 * `table2Alias` values that `addJoin` records on the joins list — so
 * `buildQuery` can look up "what is the user filtering by at THIS
 * joined table" in O(1).
 *
 * Returned aliases cover the entire subtree under each join, not just
 * the leaves immediately at that level — so a `goal: { relation: {
 * status } }` filter reports `goal.relation.status` as covered both
 * at `Portfolio__W__goal` and at `Goal__W__relation`.
 */
export const collectUserLeavesByAlias = (
  model: EntityModel,
  where: Where | undefined,
  rootRelativePrefix: string[] = [],
): Map<string, Set<string>> => {
  const out = new Map<string, Set<string>>();

  const merge = (alias: string, leaves: Iterable<string>) => {
    let bucket = out.get(alias);
    if (!bucket) {
      bucket = new Set<string>();
      out.set(alias, bucket);
    }
    for (const l of leaves) bucket.add(l);
  };

  // Returns every leaf path discovered in this subtree so the caller
  // can aggregate them into the enclosing join's alias bucket.
  const walk = (m: EntityModel, w: Where | undefined, prefix: string[]): string[] => {
    if (!w || typeof w !== 'object' || Array.isArray(w)) {
      return [];
    }
    const allLeaves: string[] = [];

    for (const [key, value] of Object.entries(w)) {
      if (key === 'AND' || key === 'OR') {
        if (Array.isArray(value)) {
          for (const sub of value) allLeaves.push(...walk(m, sub as Where, prefix));
        }
        continue;
      }
      if (key === 'NOT') {
        allLeaves.push(...walk(m, value as Where, prefix));
        continue;
      }

      const relation = m.relationsByName?.[key];
      if (relation && value && typeof value === 'object' && !Array.isArray(value)) {
        const targetModel = relation.targetModel;
        const joinAlias = `${m.name}__W__${key}`;
        const subLeaves = walk(targetModel, value as Where, [...prefix, key]);
        merge(joinAlias, subLeaves);
        allLeaves.push(...subLeaves);
        continue;
      }

      // Scalar leaf — strip a trailing `_<OP>` so `status_IN` collapses
      // to `status` when matching against the permission's covered set.
      const filterMatch = key.match(/^(.+?)_[A-Z]+$/);
      const fieldName = filterMatch ? filterMatch[1] : key;
      allLeaves.push([...prefix, fieldName].join('.'));
    }

    return allLeaves;
  };

  walk(model, where, rootRelativePrefix);

  return out;
};

export const applyFilters = async (node: FieldResolverNode, query: Knex.QueryBuilder, joins: Joins) => {
  const normalizedArguments = normalizeArguments(node);
  // No need for default order by in aggregates
  if (!node.isAggregate) {
    if (!normalizedArguments.orderBy) {
      if (node.model.defaultOrderBy) {
        normalizedArguments.orderBy = node.model.defaultOrderBy;
      } else if (node.model.creatable) {
        normalizedArguments.orderBy = [{ createdAt: 'DESC' }];
      }
    }
  }
  const { limit, offset, orderBy, where, search, deleted } = normalizedArguments;

  await node.ctx.queryHook?.({ model: node.model, query, args: normalizedArguments, ctx: node.ctx });

  if (!node.isAggregate) {
    if (limit) {
      query.limit(limit);
    }

    if (offset) {
      query.offset(offset);
    }

    if (orderBy) {
      applyOrderBy(node, orderBy, query, joins);
    }
  }

  if (node.model.parent) {
    void query.where({
      [getColumn(node, 'type')]: node.model.name,
    });
  }

  const ops: QueryBuilderOps = [];
  applyDeletedFilter(node, deleted, ops);
  applyWhere(node, where, ops, joins);
  void apply(query, ops);

  if (search) {
    void applySearch(node, search, query);
  }

  return {
    paginated: normalizedArguments.limit !== undefined || normalizedArguments.offset !== undefined,
    includesDeletedRows: includesDeletedRows(deleted),
  };
};

const applyDeletedFilter = (node: FilterNode, deleted: boolean | null | undefined, ops: QueryBuilderOps) => {
  if (!node.model.deletable) {
    return;
  }
  const effective = deleted === undefined ? false : deleted;
  if (effective !== false && !getPermissionStack(node.ctx, node.model.name, 'DELETE')) {
    throw new ForbiddenError('You cannot access deleted entries.');
  }
  if (effective === null) {
    return;
  }
  const column = getColumn(node, 'deleted');
  ops.push((query) => query.where({ [column]: effective }));
};

const applyNestedDeletedDefault = (node: FilterNode, ops: QueryBuilderOps) => {
  if (!node.model.deletable) {
    return;
  }
  const column = getColumn(node, 'deleted');
  ops.push((query) => query.where({ [column]: false }));
};

const applyWhere = (node: FilterNode, where: Where | undefined, ops: QueryBuilderOps, joins: Joins) => {
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
          allSubOps.map((subOps) => (subQuery) => apply(subQuery, subOps)),
        ),
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

        const subWhereNode: FilterNode = {
          ctx: node.ctx,
          rootTableAlias,
          model: targetModel,
          tableAlias,
        };
        const subOps: QueryBuilderOps = [];
        const subJoins: Joins = [];
        applyNestedDeletedDefault(subWhereNode, subOps);
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
          }),
        );
        continue;
      }

      if (!SPECIAL_FILTERS[filter]) {
        // Should not happen
        throw new Error(`Invalid filter ${key}.`);
      }
      const actualField = node.model.getField(actualKey);
      const isExpressionField = actualField.generateAs?.type === 'expression';
      const actualColumn = isExpressionField ? getColumnExpression(node, actualKey) : getColumn(node, actualKey);
      if (isExpressionField) {
        const operator = filter === 'GT' ? '>' : filter === 'GTE' ? '>=' : filter === 'LT' ? '<' : '<=';
        ops.push((query) => query.whereRaw(`${actualColumn} ${operator} ?`, [value as string]));
      } else {
        ops.push((query) => query.whereRaw(SPECIAL_FILTERS[filter], [actualColumn, value as string]));
      }
      continue;
    }

    const field = node.model.getField(key);

    const isExpressionField = field.generateAs?.type === 'expression';
    const column = isExpressionField ? getColumnExpression(node, key) : getColumn(node, key);

    if (field.kind === 'relation') {
      const relation = node.model.getRelation(field.name);

      if (value === null) {
        if (isExpressionField) {
          ops.push((query) => query.whereRaw(`${column} IS NULL`));
        } else {
          ops.push((query) => query.whereNull(column));
        }
        continue;
      }

      const targetModel = relation.targetModel;
      const rootTableAlias = `${node.model.name}__W__${key}`;
      const tableAlias = targetModel === targetModel.rootModel ? rootTableAlias : `${node.model.name}__WS__${key}`;
      const subNode: FilterNode = {
        ctx: node.ctx,
        rootTableAlias,
        model: targetModel,
        tableAlias,
      };
      addJoin(joins, node.tableAlias, subNode.model.name, subNode.tableAlias, relation.field.foreignKey, 'id');
      applyNestedDeletedDefault(subNode, ops);
      applyWhere(subNode, value as Where, ops, joins);
      continue;
    }

    if (Array.isArray(value)) {
      if (field && field.list) {
        if (isExpressionField) {
          ops.push((query) =>
            ors(
              query,
              value.map((v) => (subQuery) => subQuery.whereRaw(`? = ANY(${column})`, [v])),
            ),
          );
        } else {
          ops.push((query) =>
            ors(
              query,
              value.map((v) => (subQuery) => subQuery.whereRaw('? = ANY(??)', [v, column] as string[])),
            ),
          );
        }
        continue;
      }

      if (value.some((v) => v === null)) {
        if (value.some((v) => v !== null)) {
          if (isExpressionField) {
            ops.push((query) =>
              ors(query, [
                (subQuery) =>
                  subQuery.whereRaw(
                    `${column} IN (${value
                      .filter((v) => v !== null)
                      .map(() => `?`)
                      .join(',')})`,
                    value.filter((v) => v !== null) as string[],
                  ),
                (subQuery) => subQuery.whereRaw(`${column} IS NULL`),
              ]),
            );
          } else {
            ops.push((query) =>
              ors(query, [
                (subQuery) => subQuery.whereIn(column, value.filter((v) => v !== null) as string[]),
                (subQuery) => subQuery.whereNull(column),
              ]),
            );
          }
          continue;
        }

        if (isExpressionField) {
          ops.push((query) => query.whereRaw(`${column} IS NULL`));
        } else {
          ops.push((query) => query.whereNull(column));
        }
        continue;
      }

      if (isExpressionField) {
        ops.push((query) => query.whereRaw(`${column} IN (${value.map(() => `?`).join(',')})`, value as string[]));
      } else {
        ops.push((query) => query.whereIn(column, value as string[]));
      }
      continue;
    }

    if (isExpressionField) {
      ops.push((query) => query.whereRaw(`${column} = ?`, [value]));
    } else {
      ops.push((query) => query.where({ [column]: value }));
    }
  }
};

const applySearch = (node: FieldResolverNode, search: string, query: Knex.QueryBuilder) =>
  ors(
    query,
    node.model.fields
      .filter(({ searchable }) => searchable)
      .map((field) => {
        const isExpressionField = field.generateAs?.type === 'expression';
        const column = isExpressionField ? getColumnExpression(node, field.name) : getColumn(node, field.name);

        return (query: Knex.QueryBuilder) => {
          if (isExpressionField) {
            return query.whereRaw(`${column}::text ILIKE ?`, [`%${search}%`]);
          }

          return query.whereRaw('??::text ILIKE ?', [column, `%${search}%`]);
        };
      }),
  );

const applyOrderBy = (node: FilterNode, orderBy: OrderBy | OrderBy[], query: Knex.QueryBuilder, joins: Joins) => {
  for (const vals of Array.isArray(orderBy) ? orderBy : [orderBy]) {
    const keys = Object.keys(vals);
    if (keys.length !== 1) {
      throw new UserInputError(`You need to specify exactly 1 value to order by for each orderBy entry.`);
    }
    const key = keys[0];
    const value = vals[key];

    const field = node.model.getField(key);
    if (field.kind === 'relation') {
      const relation = node.model.getRelation(field.name);

      const targetModel = relation.targetModel;
      const rootTableAlias = `${node.model.name}__O__${key}`;
      const tableAlias = targetModel === targetModel.rootModel ? rootTableAlias : `${node.model.name}__OS__${key}`;
      const subNode: FilterNode = {
        ctx: node.ctx,
        rootTableAlias,
        model: targetModel,
        tableAlias,
      };
      addJoin(joins, node.tableAlias, subNode.model.name, subNode.tableAlias, relation.field.foreignKey, 'id');
      applyOrderBy(subNode, value as OrderBy, query, joins);
      continue;
    }

    // Simple field
    const isExpressionField = field.generateAs?.type === 'expression';
    const column = isExpressionField ? getColumnExpression(node, key) : getColumn(node, key);
    if (isExpressionField) {
      void query.orderByRaw(`${column} ${value}`);
    } else {
      void query.orderBy(column, value as 'ASC' | 'DESC');
    }
  }
};
