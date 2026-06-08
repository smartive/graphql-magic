import { Knex } from 'knex';
import { FullContext } from '../context';
import { NotFoundError, PermissionError } from '../errors';
import { EntityModel } from '../models/models';
import { get, isRelation, isStoredInDatabase } from '../models/utils';
import { AliasGenerator, getColumnName, hash, ors } from '../resolvers/utils';
import { PermissionAction, PermissionLink, PermissionStack } from './generate';

export const getRole = (ctx: Pick<FullContext, 'user'>) => ctx.user?.role ?? 'UNAUTHENTICATED';

/**
 * Walk a permission/filter WHERE expression and collect every leaf
 * field path it constrains, expressed as a dotted path from the entity
 * the WHERE is anchored on.
 *
 *   { goal: { status: ['ACTIVE'], relation: { status: ['ACTIVE'] } } }
 * → ['goal.status', 'goal.relation.status']
 *
 * AND / OR / NOT are walked transparently; a leaf is any key whose
 * value is a primitive or an array, a relation traversal is any key
 * whose value is a plain object. Filter-operator suffixes (`_GT`,
 * `_GTE`, `_LT`, `_LTE`, `_SOME`, `_NONE`, `_CONTAINS`, …) collapse
 * to the bare field name so a permission constraining `status`
 * covers a user's `status_IN` / `status_NE` etc.
 */
export const collectLeafPaths = (where: unknown, prefix: string[] = []): string[] => {
  if (!where || typeof where !== 'object' || Array.isArray(where)) {
    return [];
  }
  const out: string[] = [];
  for (const [key, value] of Object.entries(where as Record<string, unknown>)) {
    if (key === 'AND' || key === 'OR') {
      if (Array.isArray(value)) {
        for (const sub of value) out.push(...collectLeafPaths(sub, prefix));
      }
      continue;
    }
    if (key === 'NOT') {
      out.push(...collectLeafPaths(value, prefix));
      continue;
    }

    if (value && typeof value === 'object' && !Array.isArray(value)) {
      // Nested relation traversal.
      out.push(...collectLeafPaths(value, [...prefix, key]));
      continue;
    }

    // Leaf — strip a trailing `_<OP>` operator suffix so `status_IN`
    // collapses to `status` for coverage matching.
    const filterMatch = key.match(/^(.+?)_[A-Z]+$/);
    const fieldName = filterMatch ? filterMatch[1] : key;
    out.push([...prefix, fieldName].join('.'));
  }

  return out;
};

/**
 * Union of leaf paths constrained by every chain in a permission stack.
 *
 * Today we only consider each chain's first link's `where`, which is
 * the user-supplied scope on the queried entity (root). Subsequent links
 * in a chain anchor their `where` on the joined entity along the chain
 * and aren't expressed in root-relative coordinates; we leave them for
 * a follow-up if it becomes necessary.
 */
export const collectCoveredLeafPaths = (stack: PermissionStack): Set<string> => {
  const out = new Set<string>();
  for (const chain of stack) {
    const rootLink = chain[0];
    if (rootLink && 'where' in rootLink && rootLink.where) {
      for (const path of collectLeafPaths(rootLink.where)) {
        out.add(path);
      }
    }
  }

  return out;
};

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
  ctx: Pick<FullContext, 'models' | 'permissions' | 'user' | 'knex'>,
  type: string,
  tableAlias: string,
  query: Knex.QueryBuilder,
  action: PermissionAction,
  verifiedPermissionStack?: PermissionStack,
  includesDeletedRows?: boolean,
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

  ors(
    query,
    permissionStack.map(
      (links) => (query) =>
        query
          .whereNull(`${tableAlias}.id`)
          .orWhereExists((subQuery) =>
            permissionLinkQuery(
              ctx,
              subQuery,
              links,
              ctx.knex.raw(`"${tableAlias}".id`),
              ['READ', 'RESTORE'].includes(action) && includesDeletedRows ? tableAlias : undefined,
            ),
          ),
    ),
  );

  return permissionStack;
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

  applyPermissions(ctx, model.name, model.name, query, action, undefined, action === 'RESTORE');
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
  ctx: Pick<FullContext, 'models' | 'user'>,
  subQuery: Knex.QueryBuilder,
  links: PermissionLink[],
  id: Knex.RawBinding | Knex.ValueDict,
  tableAliasForDeleteRoot?: string,
) => {
  const aliases = new AliasGenerator();
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
