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
import { AliasGenerator, fetchDisplay, getTechnicalDisplay } from './utils';

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
  await ctx.mutationHook?.({ model, action: 'create', trigger: 'mutation', when: 'before', data, ctx });
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
  await ctx.mutationHook?.({ model, action: 'create', trigger: 'mutation', when: 'after', data, ctx });

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
    await ctx.mutationHook?.({ model, action: 'update', trigger: 'mutation', when: 'before', data, ctx });

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
    await ctx.mutationHook?.({ model, action: 'update', trigger: 'mutation', when: 'after', data, ctx });
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
        deleteRootType: rootModel.name,
        deleteRootId: entity.id,
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
        await ctx.knex(currentModel.name).where({ id: currentEntity.id }).update(normalizedInput);
        await createRevision(currentModel, next, ctx);
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
          case 'set-null': {
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
                  await ctx.knex(descendantModel.name).where({ id: descendant.id }).update(normalizedInput);
                  await createRevision(descendantModel, next, ctx);
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
          }
          case 'restrict': {
            if (descendants.length) {
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
            }
            break;
          }
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

const restore = async (model: EntityModel, { where }: { where: any }, ctx: FullContext) => {
  if (Object.keys(where).length === 0) {
    throw new Error(`No ${model.name} specified.`);
  }

  const rootModel = model.rootModel;

  const entity = await getEntityToMutate(ctx, rootModel, where, 'RESTORE');

  if (!entity.deleted) {
    throw new ForbiddenError(`${getTechnicalDisplay(model, entity)} is not deleted.`);
  }

  const beforeHooks: Callbacks = [];
  const mutations: Callbacks = [];
  const afterHooks: Callbacks = [];

  const restoreCascade = async (currentModel: EntityModel, relatedEntity: Entity) => {
    if (
      !relatedEntity.deleted ||
      !relatedEntity.deletedAt ||
      !anyDateToLuxon(relatedEntity.deletedAt, ctx.timeZone)!.equals(anyDateToLuxon(entity.deletedAt, ctx.timeZone)!)
    ) {
      return;
    }

    const normalizedInput: Entity = {
      deleted: false,
      deletedAt: null,
      deletedById: null,
      deleteRootType: null,
      deleteRootId: null,
    };
    const data = { prev: relatedEntity, input: {}, normalizedInput, next: { ...relatedEntity, ...normalizedInput } };
    if (ctx.mutationHook) {
      beforeHooks.push(async () => {
        await ctx.mutationHook!({ model: currentModel, action: 'restore', trigger: 'mutation', when: 'before', data, ctx });
      });
    }
    mutations.push(async () => {
      await ctx.knex(currentModel.name).where({ id: relatedEntity.id }).update(normalizedInput);
      await createRevision(currentModel, { ...relatedEntity, deleted: false }, ctx);
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

export const createRevision = async (model: EntityModel, data: Entity, ctx: Pick<Context, 'knex' | 'now' | 'user'>) => {
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
