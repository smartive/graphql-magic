import { Knex } from 'knex';
import { Dictionary } from 'lodash';
import mapKeys from 'lodash/mapKeys';
import { FullContext } from '../context';
import { Model, ModelField } from '../models';
import { ors } from '../resolvers/utils';
import { BasicValue } from '../values';
import { Action, PermissionLink, PermissionStack } from './generate';

export class PermissionError extends Error {
  constructor(model: Model, action: Action, field?: ModelField) {
    super(
      `You do not have sufficient permissions to ${action.toLowerCase()} this ${model.name}${
        field ? (field.relation ? ` with this ${field.name}` : `'s ${field.name}`) : ''
      }.`
    );
  }
}

export const getPermissionStack = (
  ctx: Pick<FullContext, 'permissions' | 'user'>,
  type: string,
  action: Action
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
  ctx: Pick<FullContext, 'permissions' | 'user' | 'knex'>,
  type: string,
  tableAlias: string,
  query: Knex.QueryBuilder,
  action: Action
) => {
  const permissionStack = getPermissionStack(ctx, type, action);

  if (permissionStack === true) {
    return;
  } else if (permissionStack === false) {
    // eslint-disable-next-line @typescript-eslint/no-floating-promises -- we do not need to await knex here
    query.where(false);
    return;
  }

  // eslint-disable-next-line @typescript-eslint/no-floating-promises -- we do not need to await knex here
  ors(
    query,
    permissionStack.map(
      (links) => (query) =>
        query
          .whereNull(`${tableAlias}.id`)
          .orWhereExists((subQuery) => permissionLinkQuery(subQuery, links, ctx.user.id, ctx.knex.raw(`"${tableAlias}".id`)))
    )
  );
};

/**
 * Check whether entity as currently in db can be mutated (update or delete)
 */
export const getEntityToMutate = async (
  ctx: Pick<FullContext, 'permissions' | 'user' | 'knex'>,
  model: Model,
  where: Dictionary<BasicValue>,
  action: 'UPDATE' | 'DELETE' | 'RESTORE'
) => {
  const query = ctx.knex(model.name).where(where).first();
  applyPermissions(ctx, model.name, model.name, query, action);
  const entity = await query;

  if (!entity) {
    throw new PermissionError(model, action);
  }

  return entity;
};

/**
 * Check whether given data can be written to db (insert or update)
 */
export const checkCanWrite = async (
  ctx: Pick<FullContext, 'permissions' | 'user' | 'knex'>,
  model: Model,
  data: Dictionary<BasicValue>,
  action: 'CREATE' | 'UPDATE'
) => {
  const permissionStack = getPermissionStack(ctx, model.name, action);

  if (permissionStack === true) {
    return;
  }
  if (permissionStack === false) {
    throw new PermissionError(model, action);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- using `select(1 as any)` to instantiate an "empty" query builder
  const query = ctx.knex.select(1 as any).first();
  let linked = false;

  for (const field of model.fields
    .filter(({ relation }) => relation)
    .filter((field) => field.generated || (action === 'CREATE' ? field.creatable : field.updatable))) {
    const foreignKey = field.foreignKey || `${field.name}Id`;
    const foreignId = data[foreignKey] as string;
    if (!foreignId) {
      continue;
    }

    const fieldPermissions = field[action === 'CREATE' ? 'creatableBy' : 'updatableBy'];
    if (fieldPermissions && !fieldPermissions.includes(ctx.user.role)) {
      throw new PermissionError(model, action, field);
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
      throw new PermissionError(model, action, field);
    }

    // eslint-disable-next-line @typescript-eslint/no-floating-promises -- we do not need to await knex here
    ors(
      query,
      fieldPermissionStack.map(
        (links) => (query) => query.whereExists((subQuery) => permissionLinkQuery(subQuery, links, ctx.user.id, foreignId))
      )
    );
  }

  if (linked) {
    const canMutate = await query;
    if (!canMutate) {
      throw new PermissionError(model, action);
    }
  } else if (action === 'CREATE') {
    throw new PermissionError(model, action);
  }
};

const permissionLinkQuery = (
  subQuery: Knex.QueryBuilder,
  links: PermissionLink[],
  userId: string,
  id: Knex.RawBinding | Knex.ValueDict
) => {
  const aliases = new AliasGenerator();
  let alias = aliases.getAlias();
  const { type, me, where } = links[0];
  // eslint-disable-next-line @typescript-eslint/no-floating-promises -- we do not need to await knex here
  subQuery.from(`${type} as ${alias}`);
  if (me) {
    // eslint-disable-next-line @typescript-eslint/no-floating-promises -- we do not need to await knex here
    subQuery.where({ [`${alias}.id`]: userId });
  }
  if (where) {
    // eslint-disable-next-line @typescript-eslint/no-floating-promises -- we do not need to await knex here
    subQuery.where(mapKeys(where, (_value, key) => `${alias}.${key}`));
  }

  for (const { type, foreignKey, reverse, where } of links) {
    const subAlias = aliases.getAlias();
    // eslint-disable-next-line @typescript-eslint/no-floating-promises -- we do not need to await knex here
    subQuery.where({ [`${subAlias}.deleted`]: false });
    if (where) {
      // eslint-disable-next-line @typescript-eslint/no-floating-promises -- we do not need to await knex here
      subQuery.where(mapKeys(where, (_value, key) => `${subAlias}.${key}`));
    }
    if (reverse) {
      // eslint-disable-next-line @typescript-eslint/no-floating-promises -- we do not need to await knex here
      subQuery.leftJoin(`${type} as ${subAlias}`, `${alias}.${foreignKey || 'id'}`, `${subAlias}.id`);
    } else {
      // eslint-disable-next-line @typescript-eslint/no-floating-promises -- we do not need to await knex here
      subQuery.rightJoin(`${type} as ${subAlias}`, `${alias}.id`, `${subAlias}.${foreignKey || 'id'}`);
    }
    alias = subAlias;
  }
  // eslint-disable-next-line @typescript-eslint/no-floating-promises -- we do not need to await knex here
  subQuery.whereRaw(`"${alias}".id = ?`, id);
};

class AliasGenerator {
  private aliases = 0;

  /**
   * Necessary because postgresql identifier length limit is 64 bytes
   */
  public getAlias() {
    return `a${this.aliases++}`;
  }
}
