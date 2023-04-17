import { GraphQLResolveInfo } from 'graphql';
import { v4 as uuid } from 'uuid';
import { Context, FullContext } from '../context';
import { ForbiddenError, GraphQLError } from '../errors';
import { Entity, Model, ModelField, isEnumList } from '../models';
import { applyPermissions, checkCanWrite, getEntityToMutate } from '../permissions/check';
import { get, it, summonByName, typeToField } from '../utils';
import { resolve } from './resolver';
import { AliasGenerator } from './utils';

export const mutationResolver = async (_parent: any, args: any, partialCtx: Context, info: GraphQLResolveInfo) => {
  return await partialCtx.knex.transaction(async (knex) => {
    const [, mutation, modelName] = it(info.fieldName.match(/^(create|update|delete|restore)(.+)$/));
    const ctx = { ...partialCtx, knex, info, aliases: new AliasGenerator() };
    const model = summonByName(ctx.models, modelName!);
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

const create = async (model: Model, { data: input }: { data: any }, ctx: FullContext) => {
  const normalizedInput = { ...input };
  normalizedInput.id = uuid();
  normalizedInput.createdAt = ctx.now;
  normalizedInput.createdById = ctx.user.id;
  sanitize(ctx, model, normalizedInput);

  await checkCanWrite(ctx, model, normalizedInput, 'CREATE');
  await ctx.handleUploads?.(normalizedInput);

  const data = { prev: {}, input, normalizedInput, next: normalizedInput };
  await ctx.mutationHook?.(model, 'create', 'before', data, ctx);
  await ctx.knex(model.name).insert(normalizedInput);
  await createRevision(model, normalizedInput, ctx);
  await ctx.mutationHook?.(model, 'create', 'after', data, ctx);

  return await resolve(ctx, normalizedInput.id);
};

const update = async (model: Model, { where, data: input }: { where: any; data: any }, ctx: FullContext) => {
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

    const next = { ...prev, ...normalizedInput };
    const data = { prev, input, normalizedInput, next };
    await ctx.mutationHook?.(model, 'update', 'before', data, ctx);
    await ctx.knex(model.name).where(where).update(normalizedInput);
    await createRevision(model, next, ctx);
    await ctx.mutationHook?.(model, 'update', 'after', data, ctx);
  }

  return await resolve(ctx);
};

type Callbacks = (() => Promise<void>)[];

const del = async (model: Model, { where, dryRun }: { where: any; dryRun: boolean }, ctx: FullContext) => {
  if (Object.keys(where).length === 0) {
    throw new Error(`No ${model.name} specified.`);
  }

  const entity = await getEntityToMutate(ctx, model, where, 'DELETE');

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

  const deleteCascade = async (currentModel: Model, entity: Entity) => {
    if (entity.deleted) {
      return;
    }

    if (dryRun) {
      if (!(currentModel.name in toDelete)) {
        toDelete[currentModel.name] = {};
      }
      toDelete[currentModel.name]![entity.id] = entity[currentModel.displayField || 'id'] || entity.id;
    } else {
      const normalizedInput = { deleted: true, deletedAt: ctx.now, deletedById: ctx.user.id };
      const data = { prev: entity, input: {}, normalizedInput, next: { ...entity, ...normalizedInput } };
      if (ctx.mutationHook) {
        beforeHooks.push(async () => {
          await ctx.mutationHook!(currentModel, 'delete', 'before', data, ctx);
        });
      }
      mutations.push(async () => {
        await ctx.knex(currentModel.name).where({ id: entity.id }).update(normalizedInput);
        await createRevision(currentModel, { ...entity, deleted: true }, ctx);
      });
      if (ctx.mutationHook) {
        afterHooks.push(async () => {
          await ctx.mutationHook!(currentModel, 'delete', 'after', data, ctx);
        });
      }
    }

    for (const {
      model: descendantModel,
      foreignKey,
      field: { name, onDelete },
    } of currentModel.reverseRelations) {
      const query = ctx.knex(descendantModel.name).where({ [foreignKey]: entity.id });
      switch (onDelete) {
        case 'set-null': {
          const descendants = await query;
          for (const descendant of descendants) {
            if (dryRun) {
              if (!toUnlink[descendantModel.name]) {
                toUnlink[descendantModel.name] = {};
              }
              if (!toUnlink[descendantModel.name]![descendant.id]) {
                toUnlink[descendantModel.name]![descendant.id] = {
                  display: descendant[descendantModel.displayField || 'id'] || entity.id,
                  fields: [],
                };
              }
              toUnlink[descendantModel.name]![descendant.id]!.fields.push(name);
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

  await deleteCascade(model, entity);

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

const restore = async (model: Model, { where }: { where: any }, ctx: FullContext) => {
  if (Object.keys(where).length === 0) {
    throw new Error(`No ${model.name} specified.`);
  }

  const entity = await getEntityToMutate(ctx, model, where, 'RESTORE');

  if (!entity.deleted) {
    throw new ForbiddenError('Entity is not deleted.');
  }

  const beforeHooks: Callbacks = [];
  const mutations: Callbacks = [];
  const afterHooks: Callbacks = [];

  const restoreCascade = async (currentModel: Model, relatedEntity: Entity) => {
    if (!relatedEntity.deleted || !relatedEntity.deletedAt || !relatedEntity.deletedAt.equals(entity.deletedAt)) {
      return;
    }

    const normalizedInput: Entity = { deleted: false, deletedAt: null, deletedById: null };
    const data = { prev: relatedEntity, input: {}, normalizedInput, next: { ...relatedEntity, ...normalizedInput } };
    if (ctx.mutationHook) {
      beforeHooks.push(async () => {
        await ctx.mutationHook!(model, 'restore', 'before', data, ctx);
      });
    }
    mutations.push(async () => {
      await ctx.knex(currentModel.name).where({ id: relatedEntity.id }).update(normalizedInput);
      await createRevision(currentModel, { ...relatedEntity, deleted: false }, ctx);
    });
    if (ctx.mutationHook) {
      afterHooks.push(async () => {
        await ctx.mutationHook!(model, 'restore', 'after', data, ctx);
      });
    }

    for (const { model: descendantModel, foreignKey } of currentModel.reverseRelations.filter(
      ({ model: { deletable } }) => deletable
    )) {
      const query = ctx.knex(descendantModel.name).where({ [foreignKey]: relatedEntity.id });
      applyPermissions(ctx, descendantModel.name, descendantModel.name, query, 'RESTORE');
      const descendants = await query;
      for (const descendant of descendants) {
        await restoreCascade(descendantModel, descendant);
      }
    }
  };

  await restoreCascade(model, entity);

  for (const callback of [...beforeHooks, ...mutations, ...afterHooks]) {
    await callback();
  }

  return entity.id;
};

const createRevision = async (model: Model, data: Entity, ctx: Context) => {
  if (model.updatable) {
    const revisionData = {
      id: uuid(),
      [`${typeToField(model.name)}Id`]: data.id,
      createdAt: ctx.now,
      createdById: ctx.user.id,
    };

    if (model.deletable) {
      revisionData.deleted = data.deleted || false;
    }

    for (const { name, relation, nonNull, ...field } of model.fields.filter(({ updatable }) => updatable)) {
      const col = relation ? `${name}Id` : name;
      if (nonNull && (!(col in data) || col === undefined || col === null)) {
        revisionData[col] = get(field, 'default');
      } else {
        revisionData[col] = data[col];
      }
    }
    await ctx.knex(`${model.name}Revision`).insert(revisionData);
  }
};

const sanitize = (ctx: FullContext, model: Model, data: Entity) => {
  if (model.updatable) {
    data.updatedAt = ctx.now;
    data.updatedById = ctx.user.id;
  }

  for (const key of Object.keys(data)) {
    const field = model.fields.find(({ name }) => name === key);

    if (!field) {
      continue;
    }

    if (isEndOfDay(field) && data[key]) {
      data[key] = data[key].endOf('day');
      continue;
    }

    if (isEnumList(ctx.rawModels, field) && Array.isArray(data[key])) {
      data[key] = `{${data[key].join(',')}}`;
      continue;
    }
  }
};

const isEndOfDay = (field?: ModelField) =>
  field?.endOfDay === true && field?.dateTimeType === 'date' && field?.type === 'DateTime';
