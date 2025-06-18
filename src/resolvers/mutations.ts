import { GraphQLResolveInfo } from 'graphql';
import { v4 as uuid } from 'uuid';
import { Context } from '../context';
import { ForbiddenError, GraphQLError } from '../errors';
import { EntityField, EntityModel } from '../models/models';
import { Entity, MutationContext } from '../models/mutation-hook';
import { get, isPrimitive, it, typeToField } from '../models/utils';
import { applyPermissions, checkCanWrite, getEntityToMutate } from '../permissions/check';
import { anyDateToLuxon } from '../utils';
import { resolve } from './resolver';
import { AliasGenerator, fetchDisplay, getTechnicalDisplay } from './utils';

export const mutationResolver = async (_parent: any, args: any, partialCtx: Context, info: GraphQLResolveInfo) => {
  return await partialCtx.knex.transaction(async (knex) => {
    const [, mutation, modelName] = it(info.fieldName.match(/^(create|update|delete|restore)(.+)$/));
    const ctx = { ...partialCtx, knex, info, aliases: new AliasGenerator() };
    const model = ctx.models.getModel(modelName, 'entity');
    switch (mutation) {
      case 'create': {
        const id = await createEntity(model, args.data, ctx);

        return await resolve(ctx, id);
      }
      case 'update': {
        const id = args.where.id;

        await updateEntity(model, id, args.data, ctx);

        return await resolve(ctx, id);
      }
      case 'delete': {
        const id = args.where.id;

        await deleteEntity(model, id, args.dryRun, model.rootModel.name, id, ctx);

        return await resolve(ctx, id);
      }
      case 'restore':
        return await restoreEntity(model, args.where.id, ctx);
    }
  });
};

export const createEntity = async (model: EntityModel, input: Entity, ctx: MutationContext) => {
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

  const data = { prev: {}, input, normalizedInput, next: normalizedInput };
  await ctx.mutationHook?.({ model, action: 'create', trigger: 'mutation', when: 'before', data, ctx });

  await createEntity(model, normalizedInput, ctx);

  if (model.parent) {
    const rootInput = {};
    const childInput = { id };
    for (const field of model.fields) {
      const columnName = field.kind === 'relation' ? `${field.name}Id` : field.name;
      if (columnName in data) {
        if (field.inherited) {
          rootInput[columnName] = data[columnName];
        } else {
          childInput[columnName] = data[columnName];
        }
      }
    }
    await ctx.knex(model.parent).insert(rootInput);
    await ctx.knex(model.name).insert(childInput);
  } else {
    await ctx.knex(model.name).insert(data);
  }
  await createRevision(model, data, ctx);
  await ctx.mutationHook?.({ model, action: 'create', trigger: 'mutation', when: 'after', data, ctx });

  return normalizedInput.id as string;
};

export const updateEntities = async (
  model: EntityModel,
  where: Record<string, unknown>,
  updateFields: Entity,
  ctx: MutationContext,
) => {
  const entities = await ctx.knex(model.name).where(where).select('id');
  for (const entity of entities) {
    await updateEntity(model, entity.id, updateFields, ctx);
  }
};

export const updateEntity = async (model: EntityModel, id: string, input: Entity, ctx: MutationContext) => {
  const normalizedInput = { ...input };

  sanitize(ctx, model, normalizedInput);

  const prev = await getEntityToMutate(ctx, model, { id }, 'UPDATE');

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
    await ctx.mutationHook?.({ model, action: 'update', trigger: 'mutation', when: 'before', data, ctx });

    await doUpdate(model, normalizedInput, next, ctx);
    await ctx.mutationHook?.({ model, action: 'update', trigger: 'mutation', when: 'after', data, ctx });
  }
};

type Callbacks = (() => Promise<void>)[];

export const deleteEntities = async (
  model: EntityModel,
  where: Record<string, unknown>,
  deleteRootType: string,
  deleteRootId: string,
  ctx: MutationContext,
) => {
  const entities = await ctx.knex(model.name).where(where).select('id');
  for (const entity of entities) {
    await deleteEntity(model, entity.id, false, deleteRootType, deleteRootId, ctx);
  }
};

export const deleteEntity = async (
  model: EntityModel,
  id: string,
  dryRun: boolean,
  deleteRootType: string,
  deleteRootId: string,
  ctx: MutationContext,
) => {
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
  const deleteCascade = async (currentModel: EntityModel, currentEntity: Entity) => {
    if (!(currentModel.name in toDelete)) {
      toDelete[currentModel.name] = {};
    }
    if ((currentEntity.id as string) in toDelete[currentModel.name]) {
      return;
    }
    toDelete[currentModel.name][currentEntity.id as string] = await fetchDisplay(ctx.knex, currentModel, currentEntity);
    const trigger = currentModel.name === rootModel.name && currentEntity.id === entity.id ? 'mutation' : 'cascade';

    if (!dryRun) {
      const normalizedInput = {
        deleted: true,
        deletedAt: ctx.now,
        deletedById: ctx.user?.id,
        deleteRootType,
        deleteRootId,
      };
      const next = { ...currentEntity, ...normalizedInput };
      const data = { prev: currentEntity, input: {}, normalizedInput, next };
      if (mutationHook) {
        beforeHooks.push(async () => {
          await mutationHook({
            model: currentModel,
            action: 'delete',
            trigger,
            when: 'before',
            data,
            ctx,
          });
        });
      }
      mutations.push(async () => {
        await doUpdate(currentModel, normalizedInput, next, ctx);
      });
      if (mutationHook) {
        afterHooks.push(async () => {
          await mutationHook({
            model: currentModel,
            action: 'delete',
            trigger,
            when: 'after',
            data,
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
                const next = { ...descendant, ...normalizedInput };
                const data = { prev: descendant, input: {}, normalizedInput, next };
                if (mutationHook) {
                  beforeHooks.push(async () => {
                    await mutationHook({
                      model: descendantModel,
                      action: 'update',
                      trigger: 'set-null',
                      when: 'before',
                      data,
                      ctx,
                    });
                  });
                }
                mutations.push(async () => {
                  await doUpdate(descendantModel, normalizedInput, next, ctx);
                });
                if (mutationHook) {
                  afterHooks.push(async () => {
                    await mutationHook({
                      model: descendantModel,
                      action: 'update',
                      trigger: 'set-null',
                      when: 'after',
                      data,
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
              await deleteCascade(descendantModel, descendant);
            }
            break;
          }
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
      restricted,
    });
  }

  return entity.id;
};

const restoreEntity = async (model: EntityModel, id: string, ctx: MutationContext) => {
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

  const restoreCascade = async (currentModel: EntityModel, currentEntity: Entity) => {
    if (entity.deleteRootId) {
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
          `Can't restore ${getTechnicalDisplay(currentModel, currentEntity)} because it depends on deleted ${relation.targetModel.name} ${parentId}.`,
        );
      }
    }

    const normalizedInput: Entity = {
      deleted: false,
      deletedAt: null,
      deletedById: null,
      deleteRootType: null,
      deleteRootId: null,
    };
    const data = { prev: currentEntity, input: {}, normalizedInput, next: { ...currentEntity, ...normalizedInput } };
    if (ctx.mutationHook) {
      beforeHooks.push(async () => {
        await ctx.mutationHook!({ model: currentModel, action: 'restore', trigger: 'mutation', when: 'before', data, ctx });
      });
    }
    mutations.push(async () => {
      await doUpdate(currentModel, normalizedInput, data.next, ctx);
    });
    if (ctx.mutationHook) {
      afterHooks.push(async () => {
        await ctx.mutationHook!({ model: currentModel, action: 'restore', trigger: 'mutation', when: 'after', data, ctx });
      });
    }

    for (const {
      targetModel: descendantModel,
      field: { foreignKey },
    } of currentModel.reverseRelations
      .filter((reverseRelation) => !reverseRelation.field.inherited)
      .filter(({ targetModel: { deletable } }) => deletable)) {
      const query = ctx.knex(descendantModel.name).where({ [foreignKey]: currentEntity.id, deleted: true });
      const deletedDescendants = await query;
      applyPermissions(ctx, descendantModel.name, descendantModel.name, query, 'RESTORE');
      const restorableDescendants = await query;
      const notRestorableDescendants = deletedDescendants.filter(
        (descendant) => !restorableDescendants.some((d) => d.id === descendant.id),
      );
      if (notRestorableDescendants.length) {
        throw new ForbiddenError(
          `${getTechnicalDisplay(currentModel, currentEntity)} depends on ${descendantModel.labelPlural} which you have no permissions to restore.`,
        );
      }
      for (const descendant of deletedDescendants) {
        await restoreCascade(descendantModel, descendant);
      }
    }
  };

  await restoreCascade(rootModel, entity);

  for (const callback of [...beforeHooks, ...mutations, ...afterHooks]) {
    await callback();
  }

  return id;
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

const doUpdate = async (model: EntityModel, updateFields: Entity, allFields: Entity, ctx: MutationContext) => {
  if (model.updatable) {
    if (!updateFields.updatedAt) {
      updateFields.updatedAt = ctx.now;
    }
    if (!updateFields.updatedById) {
      updateFields.updatedById = ctx.user?.id;
    }
  }
  if (model.parent) {
    const rootInput = {};
    const childInput = {};
    for (const field of model.fields) {
      const columnName = field.kind === 'relation' ? `${field.name}Id` : field.name;
      if (columnName in updateFields) {
        if (field.inherited) {
          rootInput[columnName] = updateFields[columnName];
        } else {
          childInput[columnName] = updateFields[columnName];
        }
      }
    }
    if (Object.keys(rootInput).length) {
      await ctx.knex(model.parent).where({ id: allFields.id }).update(rootInput);
    }
    if (Object.keys(childInput).length) {
      await ctx.knex(model.name).where({ id: allFields.id }).update(childInput);
    }
  } else {
    await ctx.knex(model.name).where({ id: allFields.id }).update(updateFields);
  }
  await createRevision(model, allFields, ctx);
};
