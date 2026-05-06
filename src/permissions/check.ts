import { Knex } from 'knex';
import { FullContext } from '../context';
import { NotFoundError, PermissionError } from '../errors';
import { EntityModel } from '../models/models';
import { get, isRelation, isStoredInDatabase } from '../models/utils';
import { AliasGenerator, getColumnName, hash, ors } from '../resolvers/utils';
import { PermissionAction, PermissionLink, PermissionStack } from './generate';
import { ScopesConfig, getScopeAnchorIdColumn, getScopeViewName } from './scopes';

export const getRole = (ctx: Pick<FullContext, 'user'>) => ctx.user?.role ?? 'UNAUTHENTICATED';

export const getPermissionStack = (
  ctx: Pick<FullContext, 'permissions' | 'user'>,
  type: string,
  action: PermissionAction,
): boolean | PermissionStack => {
  const rolePermissions = ctx.permissions[getRole(ctx)];
  if (typeof rolePermissions === 'boolean' || rolePermissions === undefined) {
    return !!rolePermissions;
  }

  const typePermissions = rolePermissions[type];
  if (typeof typePermissions === 'boolean' || typePermissions === undefined) {
    return !!typePermissions;
  }

  const actionPermission = typePermissions[action];
  if (typeof actionPermission === 'boolean' || actionPermission === undefined) {
    return !!actionPermission;
  }

  return actionPermission;
};

export const applyPermissions = (
  ctx: Pick<FullContext, 'models' | 'permissions' | 'user' | 'knex' | 'scopes'>,
  type: string,
  tableAlias: string,
  query: Knex.QueryBuilder,
  action: PermissionAction,
  verifiedPermissionStack?: PermissionStack,
): boolean | PermissionStack => {
  const permissionStack = getPermissionStack(ctx, type, action);

  if (permissionStack === true) {
    return permissionStack;
  }

  if (permissionStack === false) {
    query.where(false);

    return permissionStack;
  }

  if (
    verifiedPermissionStack?.every((prefixChain) =>
      permissionStack.some(
        (chain) =>
          hash(prefixChain) === hash(chain.slice(0, -1)) &&
          // TODO: this is stricter than it could be if we add these checks to the query
          !('where' in get(chain, chain.length - 1)) &&
          !('me' in get(chain, chain.length - 1)),
      ),
    )
  ) {
    // The user has access to a parent entity with one or more from a set of rules, all of which are inherited by this entity
    // No need for additional checks
    return permissionStack;
  }

  // Dedupe chains whose scope-shortcut emission would be identical. When
  // many chains end at the same anchor with no suffix (e.g. multiple paths
  // to a scoped model from `me` in a typical role config), each chain
  // emits the same `EXISTS(SELECT 1 FROM <Anchor>Scope WHERE userId = $me
  // AND … = $outer.id)` — Postgres evaluates each separately, paying the
  // same cost N times. Collapsing to one representative chain trims the
  // predicate without changing semantics.
  const dedupedStack = ctx.scopes ? dedupeStackForScopes(permissionStack, ctx.scopes) : permissionStack;

  ors(
    query,
    dedupedStack.map(
      (links) => (query) =>
        query
          .whereNull(`${tableAlias}.id`)
          .orWhereExists((subQuery) =>
            permissionLinkQuery(
              ctx,
              subQuery,
              links,
              ctx.knex.raw(`"${tableAlias}".id`),
              ['READ', 'RESTORE'].includes(action) ? tableAlias : undefined,
            ),
          ),
    ),
  );

  return permissionStack;
};

const dedupeStackForScopes = (stack: PermissionStack, scopes: ScopesConfig): PermissionStack => {
  const seen = new Set<string>();
  const result: PermissionStack = [];
  for (const chain of stack) {
    let latestAnchorIdx = -1;
    if (chain[0]?.me) {
      for (let i = chain.length - 1; i > 0; i--) {
        if (chain[i].type in scopes) {
          latestAnchorIdx = i;
          break;
        }
      }
    }
    let signature: string;
    if (latestAnchorIdx > 0) {
      // Scope-shortcut path: signature is the anchor + the suffix (links
      // after the anchor, which is what the EXISTS subquery actually joins
      // through). Two chains with the same suffix produce identical SQL
      // and can be collapsed.
      signature = `scope:${chain[latestAnchorIdx].type}:${JSON.stringify(chain.slice(latestAnchorIdx + 1))}`;
    } else {
      // Non-scope chain: signature is the whole chain.
      signature = `chain:${JSON.stringify(chain)}`;
    }
    if (!seen.has(signature)) {
      seen.add(signature);
      result.push(chain);
    }
  }

  return result;
};

/**
 * Check whether entity as currently in db can be mutated (update or delete)
 */
export const getEntityToMutate = async (
  ctx: Pick<FullContext, 'models' | 'permissions' | 'user' | 'knex'>,
  model: EntityModel,
  where: Record<string, unknown>,
  action: 'UPDATE' | 'DELETE' | 'RESTORE',
) => {
  const query = ctx
    .knex(model.parent || model.name)
    .where(where)
    .first();
  let entity = await query.clone();

  if (!entity) {
    throw new NotFoundError(`${model.name} to ${action.toLowerCase()} not found`);
  }

  applyPermissions(ctx, model.name, model.name, query, action);
  entity = await query;
  if (!entity) {
    throw new PermissionError(getRole(ctx), action, `this ${model.name}`, 'no available permissions applied');
  }

  if (model.parent) {
    const subEntity = await ctx.knex(model.name).where({ id: entity.id }).first();
    Object.assign(entity, subEntity);
  }

  return entity;
};

export const checkCanRead = async (
  ctx: Pick<FullContext, 'models' | 'permissions' | 'user' | 'knex'>,
  modelName: string,
  id: string,
): Promise<void> => {
  const query = ctx.knex(modelName).where({ id }).first();
  applyPermissions(ctx, modelName, modelName, query, 'READ');
  const res = await query;
  if (!res) {
    throw new PermissionError(getRole(ctx), 'READ', `this ${modelName}`, 'no applicable permissions');
  }
};

/**
 * Check whether given data can be written to db (insert or update)
 */
export const checkCanWrite = async (
  ctx: Pick<FullContext, 'models' | 'permissions' | 'user' | 'knex'>,
  model: EntityModel,
  data: Record<string, unknown>,
  action: 'CREATE' | 'UPDATE',
): Promise<void> => {
  const permissionStack = getPermissionStack(ctx, model.name, action);

  if (permissionStack === true) {
    return;
  }
  if (permissionStack === false) {
    throw new PermissionError(getRole(ctx), action, model.plural, 'no applicable permissions');
  }

  const query = ctx.knex.first();
  let linked = false;

  for (const field of model.fields
    .filter(isStoredInDatabase)
    .filter((field) => field.generated || (action === 'CREATE' ? field.creatable : field.updatable))) {
    const fieldPermissions = field[action === 'CREATE' ? 'creatable' : 'updatable'];
    const role = getRole(ctx);
    if (
      getColumnName(field) in data &&
      fieldPermissions &&
      typeof fieldPermissions === 'object' &&
      !fieldPermissions.roles?.includes(role)
    ) {
      throw new PermissionError(role, action, `this ${model.name}'s ${field.name}`, 'field permission not available');
    }

    if (isRelation(field)) {
      const foreignKey = field.foreignKey || `${field.name}Id`;
      const foreignId = data[foreignKey] as string;
      if (!foreignId) {
        continue;
      }

      linked = true;

      const fieldPermissionStack = getPermissionStack(ctx, field.type, 'LINK');

      if (fieldPermissionStack === true) {
        // User can link any entity from this type, just check whether it exists

        query.select(
          ctx.knex.raw(`EXISTS(SELECT 1 FROM ?? as a WHERE a.id = ?) as ??`, [field.type, foreignId, foreignKey]),
        );
        continue;
      }

      if (fieldPermissionStack === false || !fieldPermissionStack.length) {
        throw new PermissionError(
          role,
          action,
          `this ${model.name}'s ${field.name}`,
          'no applicable permissions on data to link',
        );
      }

      query.select(
        ctx.knex.raw(
          `${fieldPermissionStack
            .map((links) => {
              const subQuery = ctx.knex.queryBuilder();
              permissionLinkQuery(ctx, subQuery, links, foreignId);

              return `EXISTS(${subQuery.toString()})`;
            })
            .join(' OR ')} as "${foreignKey}"`,
        ),
      );
    }
  }

  const role = getRole(ctx);
  if (linked) {
    if (process.env.DEBUG_GRAPHQL_MAGIC === 'true') {
      console.debug('QUERY', query.toString());
    }
    const canMutate = await query;
    const cannotLink = Object.entries(canMutate).filter(([, value]) => !value);
    if (cannotLink.length) {
      throw new PermissionError(
        role,
        action,
        `this ${model.name}`,
        `cannot link to ${cannotLink.map(([key]) => `${key}: ${data[key]}`).join(', ')}`,
      );
    }
  } else if (action === 'CREATE') {
    throw new PermissionError(role, action, `this ${model.name}`, 'no linkable entities');
  }
};

const permissionLinkQuery = (
  ctx: Pick<FullContext, 'models' | 'user'> & { scopes?: ScopesConfig },
  subQuery: Knex.QueryBuilder,
  links: PermissionLink[],
  id: Knex.RawBinding | Knex.ValueDict,
  tableAliasForDeleteRoot?: string,
) => {
  const aliases = new AliasGenerator();

  // Scope-anchor short-circuit: if any link in the chain (after `me`) is a
  // declared scope-anchor, replace the prefix from `me` up to and including
  // the anchor with `FROM <Anchor>Scope WHERE userId = $me`. The view's
  // pre-computed `(userId, anchorId)` pairs collapse the deep recursive
  // delegation chain into a single hash-semi-join-friendly lookup.
  //
  // We pick the LATEST anchor in the chain (the one closest to the entity
  // being permission-checked). This minimises the suffix that has to be
  // joined post-scope-view, which is what Postgres evaluates per outer row.
  const scopes = ctx.scopes;
  if (scopes && links[0]?.me && ctx.user) {
    let anchorIdx = -1;
    for (let i = links.length - 1; i > 0; i--) {
      if (links[i].type in scopes) {
        anchorIdx = i;
        break;
      }
    }
    if (anchorIdx > 0) {
      buildScopedQuery(ctx, subQuery, links, anchorIdx, id, tableAliasForDeleteRoot, aliases);

      return;
    }
  }

  let alias = aliases.getShort();
  const { type, me, where } = links[0];

  if (me) {
    if (!ctx.user) {
      subQuery.where(false);

      return;
    }

    subQuery.where({ [`${alias}.id`]: ctx.user.id });
  }

  subQuery.from(`${type} as ${alias}`);

  if (where) {
    applyWhere(ctx.models.getModel(type, 'entity'), subQuery, alias, where, aliases);
  }

  for (const { type, foreignKey, reverse, where } of links) {
    const model = ctx.models.getModel(type, 'entity');
    const subAlias = aliases.getShort();
    if (reverse) {
      subQuery.leftJoin(`${type} as ${subAlias}`, `${alias}.${foreignKey || 'id'}`, `${subAlias}.id`);
    } else {
      subQuery.rightJoin(`${type} as ${subAlias}`, `${alias}.id`, `${subAlias}.${foreignKey || 'id'}`);
    }

    if (tableAliasForDeleteRoot) {
      subQuery.where((query) =>
        query
          .where({ [`${subAlias}.deleted`]: false })
          .orWhere((query) =>
            query
              .whereNotNull(`${subAlias}.deleteRootType`)
              .whereNotNull(`${subAlias}.deleteRootId`)
              .whereRaw(`??."deleteRootType" = ??."deleteRootType"`, [subAlias, tableAliasForDeleteRoot])
              .whereRaw(`??."deleteRootId" = ??."deleteRootId"`, [subAlias, tableAliasForDeleteRoot]),
          ),
      );
    } else {
      subQuery.where({ [`${subAlias}.deleted`]: false });
    }

    if (where) {
      applyWhere(model, subQuery, subAlias, where, aliases);
    }
    alias = subAlias;
  }

  subQuery.whereRaw(`"${alias}".id = ?`, id);
};

/**
 * Build the SQL body of a permission EXISTS subquery using a scope view
 * to short-circuit the prefix [me, ..., anchor]. Continues iterating the
 * tail [anchor+1, ..., entity] from the scope view's anchor-id column.
 */
const buildScopedQuery = (
  ctx: Pick<FullContext, 'models' | 'user'>,
  subQuery: Knex.QueryBuilder,
  links: PermissionLink[],
  anchorIdx: number,
  id: Knex.RawBinding | Knex.ValueDict,
  tableAliasForDeleteRoot: string | undefined,
  aliases: AliasGenerator,
) => {
  const anchorType = links[anchorIdx].type;
  const viewName = getScopeViewName(anchorType);
  const anchorIdColumn = getScopeAnchorIdColumn(anchorType);

  const scopeAlias = aliases.getShort();
  subQuery.from(`${viewName} as ${scopeAlias}`);
  subQuery.where({ [`${scopeAlias}.userId`]: ctx.user!.id });

  // If the chain ends AT the anchor (we're permission-checking the anchor
  // entity itself), no further joins needed.
  if (anchorIdx === links.length - 1) {
    subQuery.whereRaw(`"${scopeAlias}"."${anchorIdColumn}" = ?`, id);

    return;
  }

  // Otherwise, iterate the tail. The first iteration uses the scope view's
  // anchor-id column instead of `id`, since the view doesn't have an `id`
  // column corresponding to the anchor.
  let alias = scopeAlias;
  let usingScopeView = true;
  for (let i = anchorIdx + 1; i < links.length; i++) {
    const { type, foreignKey, reverse, where } = links[i];
    const model = ctx.models.getModel(type, 'entity');
    const subAlias = aliases.getShort();
    const sourceCol = usingScopeView ? anchorIdColumn : reverse ? foreignKey || 'id' : 'id';
    if (reverse) {
      subQuery.leftJoin(`${type} as ${subAlias}`, `${alias}.${sourceCol}`, `${subAlias}.id`);
    } else {
      subQuery.rightJoin(`${type} as ${subAlias}`, `${alias}.${sourceCol}`, `${subAlias}.${foreignKey || 'id'}`);
    }

    if (tableAliasForDeleteRoot) {
      subQuery.where((query) =>
        query
          .where({ [`${subAlias}.deleted`]: false })
          .orWhere((query) =>
            query
              .whereNotNull(`${subAlias}.deleteRootType`)
              .whereNotNull(`${subAlias}.deleteRootId`)
              .whereRaw(`??."deleteRootType" = ??."deleteRootType"`, [subAlias, tableAliasForDeleteRoot])
              .whereRaw(`??."deleteRootId" = ??."deleteRootId"`, [subAlias, tableAliasForDeleteRoot]),
          ),
      );
    } else {
      subQuery.where({ [`${subAlias}.deleted`]: false });
    }

    if (where) {
      applyWhere(model, subQuery, subAlias, where, aliases);
    }
    alias = subAlias;
    usingScopeView = false;
  }

  subQuery.whereRaw(`"${alias}".id = ?`, id);
};

const applyWhere = (model: EntityModel, query: Knex.QueryBuilder, alias: string, where: any, aliases: AliasGenerator) => {
  for (const [key, value] of Object.entries(where)) {
    const relation = model.relationsByName[key];

    if (relation) {
      const subAlias = aliases.getShort();

      query.leftJoin(
        `${relation.targetModel.name} as ${subAlias}`,
        `${alias}.${relation.field.foreignKey || `${relation.field.name}Id`}`,
        `${subAlias}.id`,
      );
      applyWhere(relation.targetModel, query, subAlias, value, aliases);
    } else if (Array.isArray(value)) {
      query.whereIn(`${alias}.${key}`, value);
    } else {
      query.where({ [`${alias}.${key}`]: value });
    }
  }
};
