import { GraphQLResolveInfo } from 'graphql';
import { v4 as uuid } from 'uuid';
import { Context, FullContext } from '../context';
import { ForbiddenError, GraphQLError } from '../errors';
import { EntityField, EntityModel } from '../models/models';
import { Entity } from '../models/mutation-hook';
import { get, isPrimitive, it, typeToField } from '../models/utils';
import { applyPermissions, checkCanWrite, getEntityToMutate } from '../permissions/check';
import { anyDateToLuxon } from '../utils';
import { resolve } from './resolver';
import { AliasGenerator } from './utils';

export const mutationResolver = async (_parent: any, args: any, partialCtx: Context, info: GraphQLResolveInfo) => {
  return await partialCtx.knex.transaction(async (knex) => {
    const [, mutation, modelName] = it(info.fieldName.match(/^(create|update|delete|restore)(.+)$/));
    const ctx = { ...partialCtx, knex, info, aliases: new AliasGenerator() };
    const model = ctx.models.getModel(modelName, 'entity');
    switch (mutation) {
      case 'create':
        return await create(model, args, ctx);
      case 'update':
        return await update(model, args, ctx);
      case 'delete':
        return await del(model, args, ctx);
      case 'restore':
        return await restore(model, args, ctx);
    }
  });
};

const create = async (model: EntityModel, { data: input }: { data: any }, ctx: FullContext) => {
  const normalizedInput = { ...input };
  normalizedInput.id = uuid();
  normalizedInput.createdAt = ctx.now;
  normalizedInput.createdById = ctx.user?.id;
  if (model.parent) {
    normalizedInput.type = model.name;
  }
  sanitize(ctx, model, normalizedInput);

  await checkCanWrite(ctx, model, normalizedInput, 'CREATE');
  await ctx.handleUploads?.(normalizedInput);

  const data = { prev: {}, input, normalizedInput, next: normalizedInput };
  await ctx.mutationHook?.(model, 'create', 'before', data, ctx);
  if (model.parent) {
    const rootInput = {};
    const childInput = { id: normalizedInput.id };
    for (const field of model.fields) {
      const columnName = field.kind === 'relation' ? `${field.name}Id` : field.name;
      if (columnName in normalizedInput) {
        if (field.inherited) {
          rootInput[columnName] = normalizedInput[columnName];
        } else {
          childInput[columnName] = normalizedInput[columnName];
        }
      }
    }
    await ctx.knex(model.parent).insert(rootInput);
    await ctx.knex(model.name).insert(childInput);
  } else {
    await ctx.knex(model.name).insert(normalizedInput);
  }
  await createRevision(model, normalizedInput, ctx);
  await ctx.mutationHook?.(model, 'create', 'after', data, ctx);

  return await resolve(ctx, normalizedInput.id);
};

const update = async (model: EntityModel, { where, data: input }: { where: any; data: any }, ctx: FullContext) => {
  if (Object.keys(where).length === 0) {
    throw new Error(`No ${model.name} specified.`);
  }

  const normalizedInput = { ...input };

  sanitize(ctx, model, normalizedInput);

  const prev = await getEntityToMutate(ctx, model, where, 'UPDATE');

  // Remove data that wouldn't mutate given that it's irrelevant for permissions
  for (const key of Object.keys(normalizedInput)) {
    if (normalizedInput[key] === prev[key]) {
      delete normalizedInput[key];
    }
  }

  if (Object.keys(normalizedInput).length > 0) {
    await checkCanWrite(ctx, model, normalizedInput, 'UPDATE');
    await ctx.handleUploads?.(normalizedInput);

    const next = { ...prev, ...normalizedInput };
    const data = { prev, input, normalizedInput, next };
    await ctx.mutationHook?.(model, 'update', 'before', data, ctx);

    if (model.parent) {
      const rootInput = {};
      const childInput = {};
      for (const field of model.fields) {
        const columnName = field.kind === 'relation' ? `${field.name}Id` : field.name;
        if (columnName in normalizedInput) {
          if (field.inherited) {
            rootInput[columnName] = normalizedInput[columnName];
          } else {
            childInput[columnName] = normalizedInput[columnName];
          }
        }
      }
      if (Object.keys(rootInput).length) {
        await ctx.knex(model.parent).where({ id: prev.id }).update(rootInput);
      }
      if (Object.keys(childInput).length) {
        await ctx.knex(model.name).where({ id: prev.id }).update(childInput);
      }
    } else {
      await ctx.knex(model.name).where({ id: prev.id }).update(normalizedInput);
    }

    await createRevision(model, next, ctx);
    await ctx.mutationHook?.(model, 'update', 'after', data, ctx);
  }

  return await resolve(ctx);
};

type Callbacks = (() => Promise<void>)[];

const del = async (model: EntityModel, { where, dryRun }: { where: any; dryRun: boolean }, ctx: FullContext) => {
  if (Object.keys(where).length === 0) {
    throw new Error(`No ${model.name} specified.`);
  }

  const rootModel = model.rootModel;
  const entity = await getEntityToMutate(ctx, rootModel, where, 'DELETE');

  if (entity.deleted) {
    throw new ForbiddenError('Entity is already deleted.');
  }

  const toDelete: { [type: string]: { [id: string]: string } } = {};
  const toUnlink: {
    [type: string]: {
      [id: string]: {
        display: string;
        fields: string[];
      };
    };
  } = {};

  const beforeHooks: Callbacks = [];
  const mutations: Callbacks = [];
  const afterHooks: Callbacks = [];

  const deleteCascade = async (currentModel: EntityModel, entity: Entity) => {
    if (entity.deleted) {
      return;
    }

    if (!(currentModel.name in toDelete)) {
      toDelete[currentModel.name] = {};
    }
    if ((entity.id as string) in toDelete[currentModel.name]) {
      return;
    }
    toDelete[currentModel.name][entity.id as string] = (entity[currentModel.displayField || 'id'] || entity.id) as string;

    if (!dryRun) {
      const normalizedInput = { deleted: true, deletedAt: ctx.now, deletedById: ctx.user?.id };
      const data = { prev: entity, input: {}, normalizedInput, next: { ...entity, ...normalizedInput } };
      if (ctx.mutationHook) {
        beforeHooks.push(async () => {
          await ctx.mutationHook(currentModel, 'delete', 'before', data, ctx);
        });
      }
      mutations.push(async () => {
        await ctx.knex(currentModel.name).where({ id: entity.id }).update(normalizedInput);
        await createRevision(currentModel, { ...entity, deleted: true }, ctx);
      });
      if (ctx.mutationHook) {
        afterHooks.push(async () => {
          await ctx.mutationHook(currentModel, 'delete', 'after', data, ctx);
        });
      }
    }

    for (const {
      targetModel: descendantModel,
      field: { name, foreignKey, onDelete },
    } of currentModel.reverseRelations.filter((reverseRelation) => !reverseRelation.field.inherited)) {
      const query = ctx.knex(descendantModel.name).where({ [foreignKey]: entity.id });
      switch (onDelete) {
        case 'set-null': {
          const descendants = await query;
          for (const descendant of descendants) {
            if (dryRun) {
              if (!toUnlink[descendantModel.name]) {
                toUnlink[descendantModel.name] = {};
              }
              if (!toUnlink[descendantModel.name][descendant.id]) {
                toUnlink[descendantModel.name][descendant.id] = {
                  display: descendant[descendantModel.displayField || 'id'] || entity.id,
                  fields: [],
                };
              }
              toUnlink[descendantModel.name][descendant.id].fields.push(name);
            } else {
              mutations.push(async () => {
                await ctx
                  .knex(descendantModel.name)
                  .where({ id: descendant.id })
                  .update({
                    [`${name}Id`]: null,
                  });
              });
            }
          }
          break;
        }
        case 'cascade':
        default: {
          applyPermissions(ctx, descendantModel.name, descendantModel.name, query, 'DELETE');
          const descendants = await query;
          if (descendants.length && !descendantModel.deletable) {
            throw new ForbiddenError(`This ${model.name} depends on a ${descendantModel.name} which cannot be deleted.`);
          }
          for (const descendant of descendants) {
            await deleteCascade(descendantModel, descendant);
          }
          break;
        }
      }
    }
  };

  await deleteCascade(rootModel, entity);

  for (const callback of [...beforeHooks, ...mutations, ...afterHooks]) {
    await callback();
  }

  if (dryRun) {
    throw new GraphQLError(`Delete dry run:`, {
      code: 'DELETE_DRY_RUN',
      toDelete,
      toUnlink,
    });
  }

  return entity.id;
};

const restore = async (model: EntityModel, { where }: { where: any }, ctx: FullContext) => {
  if (Object.keys(where).length === 0) {
    throw new Error(`No ${model.name} specified.`);
  }

  const rootModel = model.rootModel;

  const entity = await getEntityToMutate(ctx, rootModel, where, 'RESTORE');

  if (!entity.deleted) {
    throw new ForbiddenError('Entity is not deleted.');
  }

  const beforeHooks: Callbacks = [];
  const mutations: Callbacks = [];
  const afterHooks: Callbacks = [];

  const restoreCascade = async (currentModel: EntityModel, relatedEntity: Entity) => {
    if (
      !relatedEntity.deleted ||
      !relatedEntity.deletedAt ||
      anyDateToLuxon(relatedEntity.deletedAt, ctx.timeZone).equals(anyDateToLuxon(entity.deletedAt, ctx.timeZone))
    ) {
      return;
    }

    const normalizedInput: Entity = { deleted: false, deletedAt: null, deletedById: null };
    const data = { prev: relatedEntity, input: {}, normalizedInput, next: { ...relatedEntity, ...normalizedInput } };
    if (ctx.mutationHook) {
      beforeHooks.push(async () => {
        await ctx.mutationHook(model, 'restore', 'before', data, ctx);
      });
    }
    mutations.push(async () => {
      await ctx.knex(currentModel.name).where({ id: relatedEntity.id }).update(normalizedInput);
      await createRevision(currentModel, { ...relatedEntity, deleted: false }, ctx);
    });
    if (ctx.mutationHook) {
      afterHooks.push(async () => {
        await ctx.mutationHook(model, 'restore', 'after', data, ctx);
      });
    }

    for (const {
      targetModel: descendantModel,
      field: { foreignKey },
    } of currentModel.reverseRelations
      .filter((reverseRelation) => !reverseRelation.field.inherited)
      .filter(({ targetModel: { deletable } }) => deletable)) {
      const query = ctx.knex(descendantModel.name).where({ [foreignKey]: relatedEntity.id });
      applyPermissions(ctx, descendantModel.name, descendantModel.name, query, 'RESTORE');
      const descendants = await query;
      for (const descendant of descendants) {
        await restoreCascade(descendantModel, descendant);
      }
    }
  };

  await restoreCascade(rootModel, entity);

  for (const callback of [...beforeHooks, ...mutations, ...afterHooks]) {
    await callback();
  }

  return entity.id;
};

export const createRevision = async (model: EntityModel, data: Entity, ctx: Context) => {
  if (model.updatable) {
    const revisionId = uuid();
    const rootRevisionData: Entity = {
      id: revisionId,
      [`${typeToField(model.parent || model.name)}Id`]: data.id,
      createdAt: ctx.now,
      createdById: ctx.user?.id,
    };

    if (model.deletable) {
      rootRevisionData.deleted = data.deleted || false;
    }
    const childRevisionData = { id: revisionId };

    for (const field of model.fields.filter(({ updatable }) => updatable)) {
      const col = field.kind === 'relation' ? `${field.name}Id` : field.name;
      let value;
      if (field.nonNull && (!(col in data) || col === undefined || col === null)) {
        value = get(field, 'defaultValue');
      } else {
        value = data[col];
      }
      if (!model.parent || field.inherited) {
        rootRevisionData[col] = value;
      } else {
        childRevisionData[col] = value;
      }
    }

    if (model.parent) {
      await ctx.knex(`${model.parent}Revision`).insert(rootRevisionData);
      await ctx.knex(`${model.name}Revision`).insert(childRevisionData);
    } else {
      await ctx.knex(`${model.name}Revision`).insert(rootRevisionData);
    }
  }
};

const sanitize = (ctx: FullContext, model: EntityModel, data: Entity) => {
  if (model.updatable) {
    data.updatedAt = ctx.now;
    data.updatedById = ctx.user?.id;
  }

  for (const key of Object.keys(data)) {
    const field = model.fields.find(({ name }) => name === key);

    if (!field) {
      continue;
    }

    if (isEndOfDay(field) && data[key]) {
      data[key] = anyDateToLuxon(data[key], ctx.timeZone);
      continue;
    }

    if (field.list && field.kind === 'enum' && Array.isArray(data[key])) {
      data[key] = `{${(data[key] as string[]).join(',')}}`;
      continue;
    }
  }
};

const isEndOfDay = (field?: EntityField) =>
  isPrimitive(field) && field.type === 'DateTime' && field?.endOfDay === true && field?.dateTimeType === 'date';
