import { GraphQLResolveInfo } from 'graphql';
import { v4 as uuid } from 'uuid';
import { Context } from '../context';
import { ForbiddenError, GraphQLError } from '../errors';
import { EntityField, EntityModel } from '../models/models';
import { Entity, MutationContext, Trigger } from '../models/mutation-hook';
import { get, isPrimitive, it, typeToField } from '../models/utils';
import { applyPermissions, checkCanWrite, getEntityToMutate } from '../permissions/check';
import { anyDateToLuxon } from '../utils';
import { resolve } from './resolver';
import { AliasGenerator, fetchDisplay, getTechnicalDisplay } from './utils';

export const mutationResolver = async (_parent: any, args: any, partialCtx: Context, info: GraphQLResolveInfo) => {
  return await partialCtx.knex.transaction(async (knex) => {
    const [, mutation, modelName] = it(info.fieldName.match(/^(create|update|delete|restore)(.+)$/));
    const ctx = { ...partialCtx, knex, info, aliases: new AliasGenerator() };
    switch (mutation) {
      case 'create': {
        const id = await createEntity(modelName, args.data, ctx, 'mutation');

        return await resolve(ctx, id);
      }
      case 'update': {
        const id = args.where.id;

        await updateEntity(modelName, id, args.data, ctx, 'mutation');

        return await resolve(ctx, id);
      }
      case 'delete': {
        const id = args.where.id;

        await deleteEntity(modelName, id, ctx, {
          dryRun: args.dryRun,
          trigger: 'mutation',
        });

        return id;
      }
      case 'restore': {
        const id = args.where.id;

        await restoreEntity(modelName, id, ctx, 'mutation');

        return id;
      }
    }
  });
};

export const createEntity = async (
  modelName: string,
  input: Entity,
  ctx: MutationContext,
  trigger: Trigger = 'direct-call',
) => {
  const model = ctx.models.getModel(modelName, 'entity');
  const normalizedInput = { ...input };
  if (!normalizedInput.id) {
    normalizedInput.id = uuid();
  }
  const id = normalizedInput.id as string;
  if (!normalizedInput.createdAt) {
    normalizedInput.createdAt = ctx.now;
  }
  if (!normalizedInput.createdById) {
    normalizedInput.createdById = ctx.user?.id;
  }
  if (model.parent) {
    normalizedInput.type = model.name;
  }
  sanitize(ctx, model, normalizedInput);

  await checkCanWrite(ctx, model, normalizedInput, 'CREATE');
  await ctx.handleUploads?.(normalizedInput);

  await ctx.mutationHook?.({
    model,
    action: 'create',
    trigger,
    when: 'before',
    data: { prev: {}, input, normalizedInput, next: normalizedInput },
    ctx,
  });

  if (model.parent) {
    const rootInput = {};
    const childInput = { id };
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
  await ctx.mutationHook?.({
    model,
    action: 'create',
    trigger,
    when: 'after',
    data: { prev: {}, input, normalizedInput, next: normalizedInput },
    ctx,
  });

  return normalizedInput.id as string;
};

export const updateEntities = async (
  modelName: string,
  where: Record<string, unknown>,
  updateFields: Entity,
  ctx: MutationContext,
) => {
  const entities = await ctx.knex(modelName).where(where).select('id');
  for (const entity of entities) {
    await updateEntity(modelName, entity.id, updateFields, ctx);
  }
};

export const updateEntity = async (
  modelName: string,
  id: string,
  input: Entity,
  ctx: MutationContext,
  trigger: Trigger = 'direct-call',
) => {
  const model = ctx.models.getModel(modelName, 'entity');
  const normalizedInput = { ...input };

  sanitize(ctx, model, normalizedInput);

  const currentEntity = await getEntityToMutate(ctx, model, { id }, 'UPDATE');

  // Remove data that wouldn't mutate given that it's irrelevant for permissions
  for (const key of Object.keys(normalizedInput)) {
    if (normalizedInput[key] === currentEntity[key]) {
      delete normalizedInput[key];
    }
  }

  if (Object.keys(normalizedInput).length > 0) {
    await checkCanWrite(ctx, model, normalizedInput, 'UPDATE');
    await ctx.handleUploads?.(normalizedInput);

    await ctx.mutationHook?.({
      model,
      action: 'update',
      trigger,
      when: 'before',
      data: { prev: currentEntity, input, normalizedInput, next: { ...currentEntity, ...normalizedInput } },
      ctx,
    });
    await doUpdate(model, currentEntity, normalizedInput, ctx);
    await ctx.mutationHook?.({
      model,
      action: 'update',
      trigger,
      when: 'after',
      data: { prev: currentEntity, input, normalizedInput, next: { ...currentEntity, ...normalizedInput } },
      ctx,
    });
  }
};

type Callbacks = (() => Promise<void>)[];

export const deleteEntities = async (modelName: string, where: Record<string, unknown>, ctx: MutationContext) => {
  const entities = await ctx.knex(modelName).where(where).select('id');
  for (const entity of entities) {
    await deleteEntity(modelName, entity.id, ctx, {
      trigger: 'direct-call',
    });
  }
};

export const deleteEntity = async (
  modelName: string,
  id: string,
  ctx: MutationContext,
  {
    dryRun = false,
    trigger = 'direct-call',
  }: {
    dryRun?: boolean;
    trigger?: Trigger;
  } = {},
) => {
  const model = ctx.models.getModel(modelName, 'entity');
  const rootModel = model.rootModel;
  const entity = await getEntityToMutate(ctx, rootModel, { id }, 'DELETE');

  if (entity.deleted) {
    throw new ForbiddenError(`${getTechnicalDisplay(model, entity)} is already deleted.`);
  }

  const toDelete: Record<string, Record<string, string>> = {};
  const toUnlink: Record<
    string,
    Record<
      string,
      {
        display: string;
        fields: string[];
      }
    >
  > = {};
  const restricted: Record<
    string,
    Record<
      string,
      {
        display: string;
        fields: string[];
      }
    >
  > = {};

  const beforeHooks: Callbacks = [];
  const mutations: Callbacks = [];
  const afterHooks: Callbacks = [];

  const mutationHook = ctx.mutationHook;
  const deleteCascade = async (currentModel: EntityModel, currentEntity: Entity, currentTrigger: Trigger) => {
    if (!(currentModel.name in toDelete)) {
      toDelete[currentModel.name] = {};
    }
    if ((currentEntity.id as string) in toDelete[currentModel.name]) {
      return;
    }
    toDelete[currentModel.name][currentEntity.id as string] = await fetchDisplay(ctx.knex, currentModel, currentEntity);

    if (!dryRun) {
      const normalizedInput = {
        deleted: true,
        deletedAt: ctx.now,
        deletedById: ctx.user?.id,
        deleteRootType: rootModel.name,
        deleteRootId: entity.id,
      };
      if (mutationHook) {
        beforeHooks.push(async () => {
          await mutationHook({
            model: currentModel,
            action: 'delete',
            trigger: currentTrigger,
            when: 'before',
            data: { prev: currentEntity, input: {}, normalizedInput, next: { ...currentEntity, ...normalizedInput } },
            ctx,
          });
        });
      }
      mutations.push(async () => {
        await doUpdate(currentModel, currentEntity, normalizedInput, ctx);
      });
      if (mutationHook) {
        afterHooks.push(async () => {
          await mutationHook({
            model: currentModel,
            action: 'delete',
            trigger: currentTrigger,
            when: 'after',
            data: { prev: currentEntity, input: {}, normalizedInput, next: { ...currentEntity, ...normalizedInput } },
            ctx,
          });
        });
      }
    }

    for (const {
      targetModel: descendantModel,
      field: { name, foreignKey, onDelete },
    } of currentModel.reverseRelations.filter((reverseRelation) => !reverseRelation.field.inherited)) {
      const query = ctx.knex(descendantModel.name).where({ [foreignKey]: currentEntity.id, deleted: false });
      const descendants = await query;
      if (descendants.length) {
        switch (onDelete) {
          case 'set-null':
            for (const descendant of descendants) {
              if (dryRun) {
                if (!toUnlink[descendantModel.name]) {
                  toUnlink[descendantModel.name] = {};
                }
                if (!toUnlink[descendantModel.name][descendant.id]) {
                  toUnlink[descendantModel.name][descendant.id] = {
                    display: await fetchDisplay(ctx.knex, descendantModel, descendant),
                    fields: [],
                  };
                }
                toUnlink[descendantModel.name][descendant.id].fields.push(name);
              } else {
                const normalizedInput = { [`${name}Id`]: null };
                if (mutationHook) {
                  beforeHooks.push(async () => {
                    await mutationHook({
                      model: descendantModel,
                      action: 'update',
                      trigger: 'set-null',
                      when: 'before',
                      data: { prev: descendant, input: {}, normalizedInput, next: { ...descendant, ...normalizedInput } },
                      ctx,
                    });
                  });
                }
                mutations.push(async () => {
                  await doUpdate(descendantModel, descendant, normalizedInput, ctx);
                });
                if (mutationHook) {
                  afterHooks.push(async () => {
                    await mutationHook({
                      model: descendantModel,
                      action: 'update',
                      trigger: 'set-null',
                      when: 'after',
                      data: { prev: descendant, input: {}, normalizedInput, next: { ...descendant, ...normalizedInput } },
                      ctx,
                    });
                  });
                }
              }
            }
            break;
          case 'restrict':
            if (dryRun) {
              if (!restricted[descendantModel.name]) {
                restricted[descendantModel.name] = {};
              }
              for (const descendant of descendants) {
                if (!restricted[descendantModel.name][descendant.id]) {
                  restricted[descendantModel.name][descendant.id] = {
                    display: await fetchDisplay(ctx.knex, descendantModel, descendant),
                    fields: [name],
                  };
                }
                restricted[descendantModel.name][descendant.id].fields.push(name);
              }
            } else {
              throw new ForbiddenError(
                `${getTechnicalDisplay(model, entity)} cannot be deleted because it has ${getTechnicalDisplay(descendantModel, descendants[0])}${descendants.length > 1 ? ` (among others)` : ''}.`,
              );
            }
            break;
          case 'cascade':
          default: {
            if (!descendantModel.deletable) {
              throw new ForbiddenError(
                `${getTechnicalDisplay(model, entity)} depends on ${getTechnicalDisplay(descendantModel, descendants[0])}${descendants.length > 1 ? ` (among others)` : ''} which cannot be deleted.`,
              );
            }
            applyPermissions(ctx, descendantModel.name, descendantModel.name, query, 'DELETE');
            const deletableDescendants = await query;
            const notDeletableDescendants = descendants.filter(
              (descendant) => !deletableDescendants.some((d) => d.id === descendant.id),
            );
            if (notDeletableDescendants.length) {
              throw new ForbiddenError(
                `${getTechnicalDisplay(model, entity)} depends on ${descendantModel.labelPlural} which you have no permissions to delete.`,
              );
            }
            for (const descendant of descendants) {
              await deleteCascade(descendantModel, descendant, 'cascade');
            }
            break;
          }
        }
      }
    }
  };

  await deleteCascade(rootModel, entity, trigger);

  for (const callback of [...beforeHooks, ...mutations, ...afterHooks]) {
    await callback();
  }

  if (dryRun) {
    throw new GraphQLError(`Delete dry run:`, {
      code: 'DELETE_DRY_RUN',
      toDelete,
      toUnlink,
      restricted,
    });
  }
};

export const restoreEntity = async (
  modelName: string,
  id: string,
  ctx: MutationContext,
  trigger: Trigger = 'direct-call',
) => {
  const model = ctx.models.getModel(modelName, 'entity');
  const rootModel = model.rootModel;

  const entity = await getEntityToMutate(ctx, rootModel, { id }, 'RESTORE');

  if (!entity.deleted) {
    throw new ForbiddenError(`${getTechnicalDisplay(model, entity)} is not deleted.`);
  }

  if (entity.deleteRootId) {
    if (!(entity.deleteRootType === rootModel.name && entity.deleteRootId === entity.id)) {
      throw new ForbiddenError(
        `Can't restore ${getTechnicalDisplay(model, entity)} directly. To restore it, restore ${entity.deleteRootType} ${entity.deleteRootId}.`,
      );
    }
  }

  const toRestore: Record<string, Set<string>> = {};

  const beforeHooks: Callbacks = [];
  const mutations: Callbacks = [];
  const afterHooks: Callbacks = [];

  const restoreCascade = async (currentModel: EntityModel, currentEntity: Entity, currentTrigger: Trigger) => {
    if (entity.deleteRootId || currentEntity.deleteRootId) {
      if (!(currentEntity.deleteRootType === model.name && currentEntity.deleteRootId === entity.id)) {
        return;
      }

      // Legacy heuristic
    } else if (
      !anyDateToLuxon(currentEntity.deletedAt, ctx.timeZone)!.equals(anyDateToLuxon(entity.deletedAt, ctx.timeZone)!)
    ) {
      return;
    }

    if (!(currentModel.name in toRestore)) {
      toRestore[currentModel.name] = new Set();
    }
    toRestore[currentModel.name].add(currentEntity.id as string);

    const normalizedInput: Entity = {
      deleted: false,
      deletedAt: null,
      deletedById: null,
      deleteRootType: null,
      deleteRootId: null,
    };
    if (ctx.mutationHook) {
      beforeHooks.push(async () => {
        await ctx.mutationHook!({
          model: currentModel,
          action: 'restore',
          trigger: currentTrigger,
          when: 'before',
          data: { prev: currentEntity, input: {}, normalizedInput, next: { ...currentEntity, ...normalizedInput } },
          ctx,
        });
      });
    }
    mutations.push(async () => {
      for (const relation of currentModel.relations) {
        const parentId = currentEntity[relation.field.foreignKey] as string | undefined;
        if (!parentId) {
          continue;
        }
        if (toRestore[relation.targetModel.name]?.has(parentId)) {
          continue;
        }
        const parent = await ctx.knex(relation.targetModel.name).where({ id: parentId }).first();
        if (parent?.deleted) {
          throw new ForbiddenError(
            `Can't restore ${getTechnicalDisplay(model, entity)} because it depends on deleted ${relation.targetModel.name} ${parentId}.`,
          );
        }
      }

      await doUpdate(currentModel, currentEntity, normalizedInput, ctx);
    });
    if (ctx.mutationHook) {
      afterHooks.push(async () => {
        await ctx.mutationHook!({
          model: currentModel,
          action: 'restore',
          trigger: currentTrigger,
          when: 'after',
          data: { prev: currentEntity, input: {}, normalizedInput, next: { ...currentEntity, ...normalizedInput } },
          ctx,
        });
      });
    }

    for (const {
      targetModel: descendantModel,
      field: { foreignKey },
    } of currentModel.reverseRelations
      .filter((reverseRelation) => !reverseRelation.field.inherited)
      .filter(({ targetModel: { deletable } }) => deletable)) {
      const query = ctx.knex(descendantModel.name).where({ [foreignKey]: currentEntity.id, deleted: true });
      if (currentEntity.deleteRootId) {
        query.where({ deleteRootType: currentEntity.deleteRootType, deleteRootId: currentEntity.deleteRootId });
      } else {
        // Legacy heuristic
        query.where({ deletedAt: currentEntity.deletedAt });
      }
      const descendantsToRestore = await query;
      applyPermissions(ctx, descendantModel.name, descendantModel.name, query, 'RESTORE');
      const restorableDescendants = await query;
      const notRestorableDescendants = descendantsToRestore.filter(
        (descendant) => !restorableDescendants.some((d) => d.id === descendant.id),
      );
      if (notRestorableDescendants.length) {
        throw new ForbiddenError(
          `${getTechnicalDisplay(currentModel, currentEntity)} depends on ${descendantModel.labelPlural} which you have no permissions to restore.`,
        );
      }
      for (const descendant of descendantsToRestore) {
        await restoreCascade(descendantModel, descendant, 'cascade');
      }
    }
  };

  await restoreCascade(rootModel, entity, trigger);

  for (const callback of [...beforeHooks, ...mutations, ...afterHooks]) {
    await callback();
  }
};

export const createRevision = async (model: EntityModel, data: Entity, ctx: MutationContext) => {
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

const sanitize = (ctx: MutationContext, model: EntityModel, data: Entity) => {
  if (model.updatable) {
    if (!data.updatedAt) {
      data.updatedAt = ctx.now;
    }
    if (!data.updatedById) {
      data.updatedById = ctx.user?.id;
    }
  }

  for (const key of Object.keys(data)) {
    const field = model.fields.find(({ name }) => name === key);

    if (!field) {
      continue;
    }

    if (isEndOfDay(field) && data[key]) {
      data[key] = anyDateToLuxon(data[key], ctx.timeZone)!.endOf('day');
      continue;
    }

    if (isEndOfMonth(field) && data[key]) {
      data[key] = anyDateToLuxon(data[key], ctx.timeZone)!.endOf('month');
      continue;
    }

    if (field.list && field.kind === 'enum' && Array.isArray(data[key])) {
      data[key] = `{${(data[key] as string[]).join(',')}}`;
      continue;
    }
  }
};

const isEndOfDay = (field: EntityField) =>
  isPrimitive(field) && field.type === 'DateTime' && field?.endOfDay === true && field?.dateTimeType === 'date';

const isEndOfMonth = (field: EntityField) =>
  isPrimitive(field) && field.type === 'DateTime' && field?.endOfMonth === true && field?.dateTimeType === 'year_and_month';

const doUpdate = async (model: EntityModel, currentEntity: Entity, update: Entity, ctx: MutationContext) => {
  if (model.updatable) {
    if (!update.updatedAt) {
      update.updatedAt = ctx.now;
    }
    if (!update.updatedById) {
      update.updatedById = ctx.user?.id;
    }
  }
  if (model.parent) {
    const rootInput = {};
    const childInput = {};
    for (const field of model.fields) {
      const columnName = field.kind === 'relation' ? `${field.name}Id` : field.name;
      if (columnName in update) {
        if (field.inherited) {
          rootInput[columnName] = update[columnName];
        } else {
          childInput[columnName] = update[columnName];
        }
      }
    }
    if (Object.keys(rootInput).length) {
      await ctx.knex(model.parent).where({ id: currentEntity.id }).update(rootInput);
    }
    if (Object.keys(childInput).length) {
      await ctx.knex(model.name).where({ id: currentEntity.id }).update(childInput);
    }
  } else {
    await ctx.knex(model.name).where({ id: currentEntity.id }).update(update);
  }
  await createRevision(model, { ...currentEntity, ...update }, ctx);
};
