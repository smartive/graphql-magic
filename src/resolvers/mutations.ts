import { ApolloError, ForbiddenError } from 'apollo-server-errors';
import { GraphQLResolveInfo } from 'graphql';
import { Knex } from 'knex';
import { DateTime } from 'luxon';
import { v4 as uuid } from 'uuid';
import { Context, FullContext } from '../context';
import { date } from '../dates';
import { Entity, isEnumList, Model, ModelField } from '../models';
import { applyPermissions, checkCanWrite, getEntityToMutate } from '../permissions/check';
import { get, it, summonByName, typeToField } from '../utils';
import { resolve } from './resolver';

export const mutationResolver = async (_parent: unknown, args: unknown, partialCtx: Context, info: GraphQLResolveInfo) => {
  const [, mutation, modelName] = it(info.fieldName.match(/^(create|update|delete|restore)(.+)$/));
  const ctx = { ...partialCtx, info };
  const model = summonByName(ctx.models, modelName);
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
};

const create = async (model: Model, { data: input }: any, ctx: FullContext) => {
  const normalizedInput = { ...input };
  normalizedInput.id = uuid();
  const now = date();
  normalizedInput.createdAt = now;
  normalizedInput.createdById = ctx.user.id;
  sanitize(ctx, model, normalizedInput, now);

  await checkCanWrite(ctx, model, normalizedInput, 'CREATE');
  await convertUploadFields(normalizedInput);

  const data = { prev: {}, input, normalizedInput, next: normalizedInput };
  await ctx.mutationHook?.(model, 'create', 'before', data, ctx, now);
  await ctx.knex(model.name).insert(normalizedInput);
  await createRevision(model, normalizedInput, now, ctx.knex, ctx.user.id);
  await ctx.mutationHook?.(model, 'create', 'after', data, ctx, now);

  return await resolve(ctx, normalizedInput.id);
};

const update = async (model: Model, { where, data: input }: any, ctx: FullContext) => {
  if (Object.keys(where).length === 0) {
    throw new Error(`No ${model.name} specified.`);
  }

  const normalizedInput = { ...input };
  const now = date();

  sanitize(ctx, model, normalizedInput, now);

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
    await ctx.mutationHook?.(model, 'update', 'before', data, ctx, now);
    await ctx.knex(model.name).where(where).update(normalizedInput);
    await createRevision(model, next, now, ctx.knex, ctx.user.id);
    await ctx.mutationHook?.(model, 'update', 'after', data, ctx, now);
  }

  return await resolve(ctx);
};

const del = async (model: Model, { where, dryRun }: any, ctx: FullContext) => {
  if (Object.keys(where).length === 0) {
    throw new Error(`No ${model.name} specified.`);
  }

  const entity = await getEntityToMutate(ctx, model, where, 'DELETE');

  if (!entity.deleted) {
    const now = date();
    const toDelete: { [type: string]: { [id: string]: string } } = {};
    const toUnlink: {
      [type: string]: {
        [id: string]: {
          display: string;
          fields: string[];
        };
      };
    } = {};

    const deleteCascade = async (currentModel: Model, entity: Entity) => {
      if (entity.deleted) {
        return;
      }
      if (dryRun) {
        if (!(currentModel.name in toDelete)) {
          toDelete[currentModel.name] = {};
        }
        toDelete[currentModel.name][entity.id] = entity[currentModel.displayField || 'id'] || entity.id;
      } else {
        await ctx
          .knex(currentModel.name)
          .where({ id: entity.id })
          .update({ deleted: true, deletedAt: now, deletedById: ctx.user.id });
        await createRevision(currentModel, { ...entity, deleted: true }, now, ctx.knex, ctx.user.id);
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
                if (!toUnlink[descendantModel.name][descendant.id]) {
                  toUnlink[descendantModel.name][descendant.id] = {
                    display: descendant[descendantModel.displayField || 'id'] || entity.id,
                    fields: [],
                  };
                }
                toUnlink[descendantModel.name][descendant.id].fields.push(name);
              } else {
                await ctx
                  .knex(descendantModel.name)
                  .where({ id: descendant.id })
                  .update({
                    [`${name}Id`]: null,
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

    if (dryRun) {
      throw new ApolloError(`Delete dry run:`, 'DELETE_DRY_RUN', {
        toDelete,
        toUnlink,
      });
    }
  }

  return entity.id;
};

const restore = async (model: Model, { where }: any, ctx: FullContext) => {
  if (Object.keys(where).length === 0) {
    throw new Error(`No ${model.name} specified.`);
  }

  const entity = await getEntityToMutate(ctx, model, where, 'RESTORE');

  if (entity.deleted) {
    const now = date();
    const restoreCascade = async (currentModel: Model, relatedEntity: Entity) => {
      if (!(entity.deletedAt && relatedEntity.deletedAt && entity.deletedAt.equals(relatedEntity.deletedAt))) {
        return;
      }
      await ctx
        .knex(currentModel.name)
        .where({ id: relatedEntity.id })
        .update({ deleted: false, deletedAt: null, deletedById: null });
      await createRevision(currentModel, { ...relatedEntity, deleted: false }, now, ctx.knex, ctx.user.id);
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
  }

  return entity.id;
};

const createRevision = async (model: Model, data: Entity, now: DateTime, knex: Knex, userId: string) => {
  if (model.updatable) {
    const revisionData = {
      id: uuid(),
      [`${typeToField(model.name)}Id`]: data.id,
      createdAt: now,
      createdById: userId,
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
    await knex(`${model.name}Revision`).insert(revisionData);
  }
};

const sanitize = (ctx: FullContext, model: Model, data: Entity, now: DateTime) => {
  if (model.updatable) {
    data.updatedAt = now;
    data.updatedById = ctx.user.id;
  }

  for (const key of Object.keys(data)) {
    const field = model.fields.find(({ name }) => name === key);

    if (!field) {
      continue;
    }

    if (isEndOfDay(field) && data[key]) {
      data[key] = date(data[key]).endOf('day');
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

const convertUploadFields = async (data: Entity) => {
  const files = Object.entries(data).filter(([, value]) => value?.prototype?.name === 'Upload');
  if (files.length) {
    for (const [key, value] of files) {
      const stream = (await value.promise).createReadStream();
      data[key] = await new Promise((resolve, reject) => {
        const chunks: Buffer[] = [];
        stream
          .on('data', (chunk: Parameters<typeof Buffer.from>[0]) => chunks.push(Buffer.from(chunk)))
          .on('error', (err: unknown) => reject(err))
          .on('end', () => resolve(Buffer.concat(chunks)));
      });
    }
  }
};
