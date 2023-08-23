import { Knex } from 'knex';
import { FullContext } from '../context';
import { NotFoundError, PermissionError } from '../errors';
import { Model } from '../models/models';
import { get, getModelPlural, isRelation, summonByName } from '../models/utils';
import { AliasGenerator, hash, ors } from '../resolvers/utils';
import { BasicValue } from '../values';
import { PermissionAction, PermissionLink, PermissionStack } from './generate';

export const getPermissionStack = (
  ctx: Pick<FullContext, 'permissions' | 'user'>,
  type: string,
  action: PermissionAction
): boolean | PermissionStack => {
  const rolePermissions = ctx.permissions[ctx.user.role];
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
  verifiedPermissionStack?: PermissionStack
): boolean | PermissionStack => {
  const permissionStack = getPermissionStack(ctx, type, action);

  if (permissionStack === true) {
    return permissionStack;
  }

  if (permissionStack === false) {
    console.error(`No applicable permissions exist for ${ctx.user.role} ${type} ${action}.`);
    // eslint-disable-next-line @typescript-eslint/no-floating-promises -- we do not need to await knex here
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
          !('me' in get(chain, chain.length - 1))
      )
    )
  ) {
    // The user has access to a parent entity with one or more from a set of rules, all of which are inherited by this entity
    // No need for additional checks
    return permissionStack;
  }

  // eslint-disable-next-line @typescript-eslint/no-floating-promises -- we do not need to await knex here
  ors(
    query,
    permissionStack.map(
      (links) => (query) =>
        query
          .whereNull(`${tableAlias}.id`)
          .orWhereExists((subQuery) => permissionLinkQuery(ctx, subQuery, links, ctx.knex.raw(`"${tableAlias}".id`)))
    )
  );

  return permissionStack;
};

/**
 * Check whether entity as currently in db can be mutated (update or delete)
 */
export const getEntityToMutate = async (
  ctx: Pick<FullContext, 'models' | 'permissions' | 'user' | 'knex'>,
  model: Model,
  where: Record<string, BasicValue>,
  action: 'UPDATE' | 'DELETE' | 'RESTORE'
) => {
  const query = ctx.knex(model.name).where(where).first();
  let entity = await query.clone();

  if (!entity) {
    console.error(
      `Not found: ${Object.entries(where)
        .map(([key, value]) => `${key}: ${value}`)
        .join(', ')}`
    );
    throw new NotFoundError(`Entity to ${action.toLowerCase()}`);
  }

  applyPermissions(ctx, model.name, model.name, query, action);
  entity = await query;
  if (!entity) {
    console.error(
      `Permission error: ${Object.entries(where)
        .map(([key, value]) => `${key}: ${value}`)
        .join(', ')}`
    );
    throw new PermissionError(action, `this ${model.name}`, 'no available permissions applied');
  }

  return entity;
};

/**
 * Check whether given data can be written to db (insert or update)
 */
export const checkCanWrite = async (
  ctx: Pick<FullContext, 'models' | 'permissions' | 'user' | 'knex'>,
  model: Model,
  data: Record<string, BasicValue>,
  action: 'CREATE' | 'UPDATE'
) => {
  const permissionStack = getPermissionStack(ctx, model.name, action);

  if (permissionStack === true) {
    return;
  }
  if (permissionStack === false) {
    throw new PermissionError(action, getModelPlural(model), 'no applicable permissions');
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- using `select(1 as any)` to instantiate an "empty" query builder
  const query = ctx.knex.select(1 as any).first();
  let linked = false;

  for (const field of model.fields
    .filter(isRelation)
    .filter((field) => field.generated || (action === 'CREATE' ? field.creatable : field.updatable))) {
    const foreignKey = field.foreignKey || `${field.name}Id`;
    const foreignId = data[foreignKey] as string;
    if (!foreignId) {
      continue;
    }

    const fieldPermissions = field[action === 'CREATE' ? 'creatableBy' : 'updatableBy'];
    if (fieldPermissions && !fieldPermissions.includes(ctx.user.role)) {
      throw new PermissionError(action, `this ${model.name}'s ${field.name}`, 'field permission not available');
    }

    linked = true;

    const fieldPermissionStack = getPermissionStack(ctx, field.type, 'LINK');

    if (fieldPermissionStack === true) {
      // User can link any entity from this type, just check whether it exists
      // eslint-disable-next-line @typescript-eslint/no-floating-promises -- we do not need to await knex here
      query.whereExists((subQuery) => subQuery.from(`${field.type} as a`).whereRaw(`a.id = ?`, foreignId));
      continue;
    }

    if (fieldPermissionStack === false || !fieldPermissionStack.length) {
      throw new PermissionError(action, `this ${model.name}'s ${field.name}`, 'no applicable permissions on data to link');
    }

    // eslint-disable-next-line @typescript-eslint/no-floating-promises -- we do not need to await knex here
    ors(
      query,
      fieldPermissionStack.map(
        (links) => (query) => query.whereExists((subQuery) => permissionLinkQuery(ctx, subQuery, links, foreignId))
      )
    );
  }

  if (linked) {
    const canMutate = await query;
    if (!canMutate) {
      throw new PermissionError(action, `this ${model.name}`, 'no linkable entities');
    }
  } else if (action === 'CREATE') {
    throw new PermissionError(action, `this ${model.name}`, 'no linkable entities');
  }
};

const permissionLinkQuery = (
  ctx: Pick<FullContext, 'models' | 'user'>,
  subQuery: Knex.QueryBuilder,
  links: PermissionLink[],
  id: Knex.RawBinding | Knex.ValueDict
) => {
  const aliases = new AliasGenerator();
  let alias = aliases.getShort();
  const { type, me, where } = links[0];
  // eslint-disable-next-line @typescript-eslint/no-floating-promises -- we do not need to await knex here
  subQuery.from(`${type} as ${alias}`);
  if (me) {
    // eslint-disable-next-line @typescript-eslint/no-floating-promises -- we do not need to await knex here
    subQuery.where({ [`${alias}.id`]: ctx.user.id });
  }
  if (where) {
    applyWhere(summonByName(ctx.models, type), subQuery, alias, where, aliases);
  }

  for (const { type, foreignKey, reverse, where } of links) {
    const model = summonByName(ctx.models, type);
    const subAlias = aliases.getShort();
    if (reverse) {
      // eslint-disable-next-line @typescript-eslint/no-floating-promises -- we do not need to await knex here
      subQuery.leftJoin(`${type} as ${subAlias}`, `${alias}.${foreignKey || 'id'}`, `${subAlias}.id`);
    } else {
      // eslint-disable-next-line @typescript-eslint/no-floating-promises -- we do not need to await knex here
      subQuery.rightJoin(`${type} as ${subAlias}`, `${alias}.id`, `${subAlias}.${foreignKey || 'id'}`);
    }
    // eslint-disable-next-line @typescript-eslint/no-floating-promises -- we do not need to await knex here
    subQuery.where({ [`${subAlias}.deleted`]: false });
    if (where) {
      applyWhere(model, subQuery, subAlias, where, aliases);
    }
    alias = subAlias;
  }
  // eslint-disable-next-line @typescript-eslint/no-floating-promises -- we do not need to await knex here
  subQuery.whereRaw(`"${alias}".id = ?`, id);
};

const applyWhere = (model: Model, query: Knex.QueryBuilder, alias: string, where: any, aliases: AliasGenerator) => {
  for (const [key, value] of Object.entries(where)) {
    const relation = model.relationsByName[key];

    if (relation) {
      const subAlias = aliases.getShort();
      // eslint-disable-next-line @typescript-eslint/no-floating-promises -- we do not need to await knex here
      query.leftJoin(
        `${relation.model.name} as ${subAlias}`,
        `${alias}.${relation.field.foreignKey || `${relation.field.name}Id`}`,
        `${subAlias}.id`
      );
      applyWhere(relation.model, query, subAlias, value, aliases);
    } else if (Array.isArray(value)) {
      // eslint-disable-next-line @typescript-eslint/no-floating-promises -- we do not need to await knex here
      query.whereIn(`${alias}.${key}`, value);
    } else {
      // eslint-disable-next-line @typescript-eslint/no-floating-promises -- we do not need to await knex here
      query.where({ [`${alias}.${key}`]: value });
    }
  }
};
