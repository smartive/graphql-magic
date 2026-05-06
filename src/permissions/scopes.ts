import lowerFirst from 'lodash/lowerFirst';
import { Models } from '../models/models';
import { PermissionLink, Permissions } from './generate';

/**
 * Scope-anchor configuration. Each entry declares a SQL view that maps
 * `(userId, anchorEntityId)` pairs — the precomputed access scope for the
 * declared anchor model. Permission predicates can short-circuit through
 * the view instead of expanding the full permissions tree per request.
 *
 * Migration generator emits `CREATE OR REPLACE VIEW "<Anchor>Scope" AS <sql>`
 * for each declared anchor. SQL body is auto-derived from the permissions
 * tree if not explicitly provided — one UNION clause per role-chain that
 * reaches the anchor model from `me`.
 *
 * Example:
 *   export const scopes: ScopesConfig = { Relation: {} };
 */
export type ScopesConfig = Record<string, ScopeConfig>;

export type ScopeConfig = {
  /**
   * Optional explicit SQL body of the view (everything after `CREATE VIEW … AS`).
   * Must produce two columns named exactly `userId` and `<anchor>Id`, where
   * `<anchor>` is the lower-camel-cased anchor model name. If omitted, the
   * SQL is auto-derived from the permissions tree.
   */
  sql?: string;

  /**
   * Tables whose row changes invalidate this scope. The migration generator
   * emits AFTER triggers on each one to refresh the materialized view at
   * end of transaction.
   *
   * Auto-derived from the permissions tree when `sql` is omitted (every
   * model traversed by any chain that reaches the anchor is a source).
   * Required when `sql` is set, since we can't statically introspect a
   * user-supplied SQL body.
   */
  sourceTables?: string[];

  /**
   * Disable trigger emission for this scope (the migration generator still
   * creates the materialized view + indexes, but you become responsible for
   * refresh — cron, app-level, external job, whatever fits). Default: true.
   */
  refreshTriggers?: boolean;
};

/**
 * Convention: scope view name is `<Anchor>Scope`.
 * E.g. anchor `Relation` → view `RelationScope`.
 */
export const getScopeViewName = (anchor: string): string => `${anchor}Scope`;

/**
 * Convention: the anchor's id column in the view is the lower-camel-cased
 * anchor name + "Id". E.g. anchor `Relation` → column `relationId`.
 *
 * Special case: when the anchor IS `User`, the natural name `userId`
 * collides with the viewer column (also `userId`), so we use
 * `targetUserId` for the anchor side.
 */
export const getScopeAnchorIdColumn = (anchor: string): string =>
  anchor === 'User' ? 'targetUserId' : `${lowerFirst(anchor)}Id`;

/**
 * Derive the SQL body of `<Anchor>Scope` by walking the permissions tree
 * of every role and emitting one UNION clause per chain that ends at the
 * anchor model.
 *
 * Each chain becomes a SELECT that projects `(rootUser.id, lastAlias.id)`
 * filtered by the chain's `WHERE` and `deleted=false` predicates. Chains
 * that cannot be expressed as a static SQL traversal (true-permissions,
 * non-User roots, missing-foreign-keys) are skipped with a comment.
 *
 * Limitation: cascade-deletion visibility (the OR-branch that admits
 * soft-deleted entities sharing a deleteRoot with an outer row) is NOT
 * encoded here, since the scope view has no outer correlation context.
 * In practice combined with the L1 cascade-decouple patch this is fine
 * because the resolver only short-circuits through the scope view when
 * the outer is filtered to `deleted = false`.
 */
export const deriveScopeViewSql = (models: Models, permissions: Permissions, anchor: string): string => {
  const anchorIdCol = getScopeAnchorIdColumn(anchor);
  const lines: string[] = [];

  // Stable role iteration order for reproducible migrations.
  const roleNames = Object.keys(permissions).sort();
  for (const role of roleNames) {
    const rolePerms = permissions[role];
    if (typeof rolePerms !== 'object') {
      continue;
    }
    const anchorPerms = rolePerms[anchor];
    if (!anchorPerms) {
      continue;
    }
    const stack = anchorPerms.READ;
    if (typeof stack !== 'object') {
      continue;
    }

    for (const chain of stack) {
      const sql = chainToSelect(models, chain, anchorIdCol);
      if (sql) {
        lines.push(`-- role=${role}`);
        lines.push(sql);
        lines.push('UNION');
      }
    }
  }

  if (lines.length === 0) {
    // No role grants access to the anchor — emit a placeholder view so
    // queries against `<Anchor>Scope` still parse.
    return `SELECT NULL::uuid AS "userId", NULL::uuid AS "${anchorIdCol}" WHERE false`;
  }

  // Drop the trailing UNION
  lines.pop();

  return lines.join('\n');
};

/**
 * Walk the permissions tree and return the set of tables whose row changes
 * could affect membership in `<Anchor>Scope`. That's `chain[0].type` (the
 * `me` user table — role/deletion changes shift membership) plus every
 * intermediate type joined through to reach the anchor, for every chain
 * across every role. Used by the migration generator to know which tables
 * to attach refresh triggers to.
 */
export const deriveScopeSourceTables = (permissions: Permissions, anchor: string): string[] => {
  const tables = new Set<string>();
  for (const role of Object.keys(permissions)) {
    const rolePerms = permissions[role];
    if (typeof rolePerms !== 'object') {
      continue;
    }
    const anchorPerms = rolePerms[anchor];
    if (!anchorPerms) {
      continue;
    }
    const stack = anchorPerms.READ;
    if (typeof stack !== 'object') {
      continue;
    }
    for (const chain of stack) {
      if (chain.length < 1 || !chain[0].me) {
        continue;
      }
      for (const link of chain) {
        tables.add(link.type);
      }
    }
  }

  return [...tables].sort();
};

const chainToSelect = (models: Models, chain: PermissionLink[], anchorIdCol: string): string | null => {
  if (chain.length < 1 || !chain[0].me) {
    // Only chains anchored at `me` (User) are expressible as a (userId, anchorId)
    // tuple. Other chain shapes (e.g., role-WHERE-only) imply universal access
    // and don't fit the per-user scope model — skip.
    return null;
  }
  const aliasFor = (i: number) => `a${i}`;

  // FROM the user (chain[0])
  const lines: string[] = [];
  const rootAlias = aliasFor(0);
  const lastAlias = aliasFor(chain.length - 1);
  lines.push(`SELECT ${rootAlias}.id AS "userId", ${lastAlias}.id AS "${anchorIdCol}"`);
  lines.push(`  FROM "${chain[0].type}" AS ${rootAlias}`);

  // JOIN each subsequent link
  for (let i = 1; i < chain.length; i++) {
    const link = chain[i];
    const prevAlias = aliasFor(i - 1);
    const alias = aliasFor(i);
    const fk = link.foreignKey || 'id';
    const linkModel = models.getModel(link.type, 'entity');
    const onClause = link.reverse ? `${prevAlias}."${fk}" = ${alias}.id` : `${prevAlias}.id = ${alias}."${fk}"`;
    const conditions: string[] = [onClause];
    if (linkModel.deletable) {
      conditions.push(`${alias}.deleted = false`);
    }
    if (link.where) {
      const extra = whereToSql(linkModel, alias, link.where);
      if (extra) {
        conditions.push(extra);
      }
    }
    lines.push(`  JOIN "${link.type}" AS ${alias} ON ${conditions.join(' AND ')}`);
  }

  // Apply the root user's WHERE (e.g., role IN [...]) as a final filter.
  const rootWhere = chain[0].where ? whereToSql(models.getModel(chain[0].type, 'entity'), rootAlias, chain[0].where) : null;
  if (rootWhere) {
    lines.push(` WHERE ${rootWhere}`);
  }

  return lines.join('\n');
};

/**
 * Translate a permission `WHERE` object into a SQL fragment. Only handles
 * the shapes that scope-view derivation needs: scalar equality, scalar
 * lists, and nested simple objects (treated as joined relation-WHERE,
 * which is rare for scope chains).
 */
const whereToSql = (
  model: { fields: { name: string; kind?: string }[] },
  alias: string,
  where: Record<string, unknown>,
): string | null => {
  const parts: string[] = [];
  for (const [key, value] of Object.entries(where)) {
    const field = model.fields.find((f) => f.name === key);
    if (!field || (field.kind !== undefined && field.kind !== 'enum' && field.kind !== 'primitive')) {
      // Skip relation-level WHEREs in scope derivation (would require
      // additional joins; out of scope for the v1 deriver).
      continue;
    }
    if (Array.isArray(value)) {
      parts.push(`${alias}."${key}" IN (${(value as unknown[]).map((v) => quoteSqlLiteral(v)).join(', ')})`);
    } else if (value === null) {
      parts.push(`${alias}."${key}" IS NULL`);
    } else {
      parts.push(`${alias}."${key}" = ${quoteSqlLiteral(value)}`);
    }
  }

  return parts.length ? parts.join(' AND ') : null;
};

const quoteSqlLiteral = (v: unknown): string => {
  if (v === null || v === undefined) {
    return 'NULL';
  }
  if (typeof v === 'number' || typeof v === 'boolean') {
    return String(v);
  }

  return `'${String(v).replace(/'/g, "''")}'`;
};
