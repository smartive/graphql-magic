import { Knex } from 'knex';
import { FullContext } from '../context';
import { NotFoundError, PermissionError } from '../errors';
import { EntityModel } from '../models/models';
import { get, isRelation, isStoredInDatabase } from '../models/utils';
import { AliasGenerator, getColumnName, hash, ors } from '../resolvers/utils';
import { PermissionAction, PermissionLink, PermissionStack } from './generate';

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
  ctx: Pick<FullContext, 'models' | 'permissions' | 'user' | 'knex'>,
  type: string,
  tableAlias: string,
  query: Knex.QueryBuilder,
  action: PermissionAction,
  verifiedPermissionStack?: PermissionStack,
  includesDeletedRows?: boolean,
  edge?: JoinEdge,
): boolean | PermissionStack => {
  const permissionStack = getPermissionStack(ctx, type, action);

  if (permissionStack === true) {
    return permissionStack;
  }

  if (permissionStack === false) {
    query.where(false);

    return permissionStack;
  }

  // Chains that continue a chain the parent was already checked against, THROUGH THE EDGE THIS
  // alias was joined by. Without the edge test a chain reached by a different foreign key would be
  // treated as a continuation, and the real ones dropped.
  const continues = (chain: PermissionLink[]) =>
    !!edge &&
    matchesEdge(get(chain, chain.length - 1), edge) &&
    !!verifiedPermissionStack?.some((prefixChain) => hash(prefixChain) === hash(chain.slice(0, -1)));

  const extensions = permissionStack.filter(continues);
  const everyParentChainContinues =
    !!edge &&
    !!verifiedPermissionStack &&
    verifiedPermissionStack.every((prefixChain) =>
      permissionStack.some(
        (chain) => matchesEdge(get(chain, chain.length - 1), edge) && hash(prefixChain) === hash(chain.slice(0, -1)),
      ),
    );

  if (everyParentChainContinues && extensions.length) {
    if (extensions.every((chain) => !('where' in get(chain, chain.length - 1)) && !('me' in get(chain, chain.length - 1)))) {
      // Every continuation is unconditional, so reaching the parent already proves this entity.
      return extensions;
    }

    // These rows are children of parents that passed their own check, reached by this edge, and
    // every chain that could have passed it continues into one of these — so a chain that does not
    // continue cannot be the reason any of these rows is visible.
    applyPermissionStack(ctx, extensions, tableAlias, query, action, includesDeletedRows);

    return extensions;
  }

  // Unchanged fallback, including the original "parent already proves this" shortcut.
  if (
    verifiedPermissionStack?.every((prefixChain) =>
      permissionStack.some(
        (chain) =>
          hash(prefixChain) === hash(chain.slice(0, -1)) &&
          !('where' in get(chain, chain.length - 1)) &&
          !('me' in get(chain, chain.length - 1)),
      ),
    )
  ) {
    return permissionStack;
  }

  applyPermissionStack(ctx, permissionStack, tableAlias, query, action, includesDeletedRows);

  return permissionStack;
};

export type JoinEdge = { column1: string; column2: string };

// A permission link joins either parent.<fk> = child.id (reverse) or parent.id = child.<fk>, which
// is exactly the shape the query's own join records.
const matchesEdge = (link: PermissionLink, edge: JoinEdge) =>
  link.reverse
    ? edge.column1 === (link.foreignKey ?? 'id') && edge.column2 === 'id'
    : edge.column1 === 'id' && edge.column2 === (link.foreignKey ?? 'id');

const applyPermissionStack = (
  ctx: Pick<FullContext, 'models' | 'permissions' | 'user' | 'knex'>,
  permissionStack: PermissionStack,
  tableAlias: string,
  query: Knex.QueryBuilder,
  action: PermissionAction,
  includesDeletedRows?: boolean,
) => {
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
