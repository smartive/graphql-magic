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
 * True when the field is `filterable: { nonNull: true }` — i.e. the
 * schema forces every client to provide a value for it on the matching
 * Where / WhereLookup input. Plain `filterable: true` (boolean) is
 * opt-in and does NOT qualify.
 */
const isMandatoryFilterField = (filterable: unknown): boolean =>
  typeof filterable === 'object' && filterable !== null && (filterable as { nonNull?: boolean }).nonNull === true;

/**
 * True when every key the user supplied at this WHERE position is a
 * `filterable: { nonNull: true }` field on `model`, recursing into
 * relation traversals (which must themselves be nonNull-filterable to
 * count as schema-mandated).
 *
 * A `filterable: true` field — even sitting next to mandatory ones —
 * drops the whole position out of "minimal", since the user opted in
 * to filtering by it. AND/OR/NOT distribute over their children.
 * `_<OP>` and `_SOME` / `_NONE` suffixes are treated as opt-in: the
 * base field's nonNull constraint says nothing about which operators
 * the schema *forces* on the client.
 */
const isMinimalFilterShape = (model: EntityModel, where: Where | undefined): boolean => {
  if (!where || typeof where !== 'object' || Array.isArray(where)) {
    return true;
  }
  for (const [key, value] of Object.entries(where)) {
    if (key === 'AND' || key === 'OR') {
      if (Array.isArray(value)) {
        if (!value.every((sub) => isMinimalFilterShape(model, sub as Where))) {
          return false;
        }
      }
      continue;
    }
    if (key === 'NOT') {
      if (!isMinimalFilterShape(model, value as Where)) {
        return false;
      }
      continue;
    }
    // `status_IN`, `count_GTE`, `relations_SOME`, … — all opt-in suffixes.
    if (/_[A-Z]+$/.test(key)) {
      return false;
    }

    const field = model.fieldsByName?.[key];
    if (!field || !isMandatoryFilterField(field.filterable)) {
      return false;
    }

    const relation = model.relationsByName?.[key];
    if (relation && value && typeof value === 'object' && !Array.isArray(value)) {
      if (!isMinimalFilterShape(relation.targetModel, value as Where)) {
        return false;
      }
    }
  }

  return true;
};

/**
 * Filter-join aliases on which `applyPermissions` for the joined
 * entity may be skipped, because the schema forces the client to
 * provide the filter shape that produced them. The rule:
 *
 *   - The relation field carrying the join is `filterable: { nonNull: true }`
 *     (the client has no opt-out from traversing it), AND
 *   - the user's WHERE contents at that position are minimal — every
 *     leaf below is itself schema-mandatory (see `isMinimalFilterShape`).
 *
 * If either is false the alias falls through to the strict per-table
 * `Entity.READ` permission stack. Optional filter capabilities are
 * always permission-gated; only schema-mandated ones bypass.
 *
 * Why this is safe (and why it matters): `filterable: { nonNull: true }`
 * is a contract that the API REQUIRES the client to filter by this
 * field. Requiring read permission on the joined entity at the same
 * time would make the API unusable for any role that lacks that
 * permission — they could not satisfy the schema. So the schema-level
 * "must provide" implies the runtime-level "may provide without an
 * additional READ check on the joined alias".
 */
export const collectMandatoryFilterAliases = (model: EntityModel, where: Where | undefined): Set<string> => {
  const out = new Set<string>();
  const walk = (m: EntityModel, w: Where | undefined, inMandatoryChain: boolean) => {
    if (!w || typeof w !== 'object' || Array.isArray(w)) {
      return;
    }
    for (const [key, value] of Object.entries(w)) {
      if (key === 'AND' || key === 'OR') {
        if (Array.isArray(value)) {
          for (const sub of value) {
            walk(m, sub as Where, inMandatoryChain);
          }
        }
        continue;
      }
      if (key === 'NOT') {
        walk(m, value as Where, inMandatoryChain);
        continue;
      }
      const relation = m.relationsByName?.[key];
      if (relation && value && typeof value === 'object' && !Array.isArray(value)) {
        const nextInMandatoryChain = inMandatoryChain && isMandatoryFilterField(relation.field.filterable);
        if (nextInMandatoryChain && isMinimalFilterShape(relation.targetModel, value as Where)) {
          const targetModel = relation.targetModel;
          const joinAlias = targetModel === targetModel.rootModel ? `${m.name}__W__${key}` : `${m.name}__WS__${key}`;
          out.add(joinAlias);
        }
        walk(relation.targetModel, value as Where, nextInMandatoryChain);
      }
    }
  };
  walk(model, where, true);

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
      // Same rationale as `collectMandatoryFilterAliases`: a
      // `filterable: { nonNull: true }` relation is a schema contract
      // that EVERY client must traverse, and the cascade contents are
      // forced too. Applying `deleted = false` on that joined table
      // would silently drop rows the client had no opt-out from
      // filtering through — e.g. a deleted goal whose relation is
      // also deleted disappears from `/admin/goals?deleted=true`,
      // even though the user explicitly asked for deleted ones. Same
      // alignment: the schema-mandated path doesn't get extra hidden
      // restrictions.
      if (!isMandatoryFilterField(relation.field.filterable) || !isMinimalFilterShape(targetModel, value as Where)) {
        applyNestedDeletedDefault(subNode, ops);
      }
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
