import { GraphQLResolveInfo } from 'graphql';
import { IncomingMessage } from 'http';
import { v4 as uuid } from 'uuid';
import { Knex } from 'knex';
import * as db from '../db';
import * as api from '../api';

import { DateTime } from 'luxon';
import {
  Models,
  Permissions,
  AliasGenerator,
  applyPermissions,
  queryResolver,
  getEntityToMutate,
  resolve,
  checkCanWrite,
  GraphQLError,
  ForbiddenError,
  anyDateToLuxon,
  EntityModel,
} from '../../../src';

import { pick } from 'lodash';

export type Entity = Record<string, unknown>;

export type Action = 'create' | 'update' | 'delete' | 'restore';

export type MutationHook = (
  model: EntityModel,
  action: Action,
  when: 'before' | 'after',
  data: { prev: Entity; input: Entity; normalizedInput: Entity; next: Entity },
  ctx: Context
) => Promise<void>;

export type User = { id: string; role: string };

export type Context = {
  req: IncomingMessage;
  now: DateTime;
  timeZone?: string;
  knex: Knex;
  locale: string;
  locales: string[];
  user?: User;
  models: Models;
  permissions: Permissions;
  mutationHook?: MutationHook;
};

export type FullContext = Context & {
  info: GraphQLResolveInfo;
  aliases: AliasGenerator;
};

type Callbacks = (() => Promise<void>)[];

type DeleteContext = {
  model: EntityModel;
  toDelete: { [type: string]: { [id: string]: string } };
  toUnlink: {
    [type: string]: {
      [id: string]: {
        display: string;
        fields: string[];
      };
    };
  };
  dryRun: boolean;
  beforeHooks: Callbacks;
  mutations: Callbacks;
  afterHooks: Callbacks;
};

type RestoreContext = {
  entity: any;
  model: EntityModel;
  beforeHooks: Callbacks;
  mutations: Callbacks;
  afterHooks: Callbacks;
};
export const resolvers = {
  Query: {
    me: queryResolver,
    someObject: queryResolver,
    reaction: queryResolver,
    review: queryResolver,
    question: queryResolver,
    answer: queryResolver,
    anotherObjects: queryResolver,
    manyObjects: queryResolver,
    reactions: queryResolver,
    reviews: queryResolver,
    questions: queryResolver,
    answers: queryResolver,
  },
  Mutation: {
    createSomeObject: async (
      _parent: unknown,
      { data: input }: api.MutationCreateSomeObjectArgs,
      partialCtx: Context,
      info: GraphQLResolveInfo
    ) => {
      return await partialCtx.knex.transaction(async (knex) => {
        const ctx: FullContext = { ...partialCtx, knex, info, aliases: new AliasGenerator() };
        const model = ctx.models.getModel('SomeObject', 'entity');
        const normalizedInput: Partial<db.SomeObjectInitializer & db.SomeObjectInitializer> = { ...input };
        normalizedInput.id = uuid();
        normalizedInput.createdAt = ctx.now;
        normalizedInput.createdById = ctx.user?.id;
        normalizedInput.updatedAt = ctx.now;
        normalizedInput.updatedById = ctx.user?.id;
        await checkCanWrite(ctx, model, normalizedInput, 'CREATE');
        const data = { prev: {}, input, normalizedInput, next: normalizedInput };
        await ctx.mutationHook?.(model, 'create', 'before', data, ctx);
        await knex(model.name).insert(normalizedInput);
        await createSomeObjectRevision(normalizedInput, ctx);
        await ctx.mutationHook?.(model, 'create', 'after', data, ctx);
        return await resolve(ctx, normalizedInput.id);
      });
    },

    createReview: async (
      _parent: unknown,
      { data: input }: api.MutationCreateReviewArgs,
      partialCtx: Context,
      info: GraphQLResolveInfo
    ) => {
      return await partialCtx.knex.transaction(async (knex) => {
        const ctx: FullContext = { ...partialCtx, knex, info, aliases: new AliasGenerator() };
        const model = ctx.models.getModel('Review', 'entity');
        const normalizedInput: Partial<db.ReactionInitializer & db.ReviewInitializer> = { ...input };
        normalizedInput.id = uuid();
        normalizedInput.createdAt = ctx.now;
        normalizedInput.createdById = ctx.user?.id;
        normalizedInput.type = 'Review';
        normalizedInput.updatedAt = ctx.now;
        normalizedInput.updatedById = ctx.user?.id;
        await checkCanWrite(ctx, model, normalizedInput, 'CREATE');
        const data = { prev: {}, input, normalizedInput, next: normalizedInput };
        await ctx.mutationHook?.(model, 'create', 'before', data, ctx);
        const rootInput: Partial<db.ReactionInitializer> = pick(
          normalizedInput,
          'id',
          'type',
          'parentId',
          'content',
          'createdAt',
          'createdById',
          'updatedAt',
          'updatedById',
          'deleted',
          'deletedAt',
          'deletedById'
        );
        const childInput: Partial<db.ReviewInitializer> = pick(normalizedInput, 'id', 'rating');
        await knex(model.parent).insert(rootInput);
        await knex(model.name).insert(childInput);
        await createReviewRevision(normalizedInput, ctx);
        await ctx.mutationHook?.(model, 'create', 'after', data, ctx);
        return await resolve(ctx, normalizedInput.id);
      });
    },

    createQuestion: async (
      _parent: unknown,
      { data: input }: api.MutationCreateQuestionArgs,
      partialCtx: Context,
      info: GraphQLResolveInfo
    ) => {
      return await partialCtx.knex.transaction(async (knex) => {
        const ctx: FullContext = { ...partialCtx, knex, info, aliases: new AliasGenerator() };
        const model = ctx.models.getModel('Question', 'entity');
        const normalizedInput: Partial<db.ReactionInitializer & db.QuestionInitializer> = { ...input };
        normalizedInput.id = uuid();
        normalizedInput.createdAt = ctx.now;
        normalizedInput.createdById = ctx.user?.id;
        normalizedInput.type = 'Question';
        normalizedInput.updatedAt = ctx.now;
        normalizedInput.updatedById = ctx.user?.id;
        await checkCanWrite(ctx, model, normalizedInput, 'CREATE');
        const data = { prev: {}, input, normalizedInput, next: normalizedInput };
        await ctx.mutationHook?.(model, 'create', 'before', data, ctx);
        const rootInput: Partial<db.ReactionInitializer> = pick(
          normalizedInput,
          'id',
          'type',
          'parentId',
          'content',
          'createdAt',
          'createdById',
          'updatedAt',
          'updatedById',
          'deleted',
          'deletedAt',
          'deletedById'
        );
        const childInput: Partial<db.QuestionInitializer> = pick(normalizedInput, 'id');
        await knex(model.parent).insert(rootInput);
        await knex(model.name).insert(childInput);
        await createQuestionRevision(normalizedInput, ctx);
        await ctx.mutationHook?.(model, 'create', 'after', data, ctx);
        return await resolve(ctx, normalizedInput.id);
      });
    },

    createAnswer: async (
      _parent: unknown,
      { data: input }: api.MutationCreateAnswerArgs,
      partialCtx: Context,
      info: GraphQLResolveInfo
    ) => {
      return await partialCtx.knex.transaction(async (knex) => {
        const ctx: FullContext = { ...partialCtx, knex, info, aliases: new AliasGenerator() };
        const model = ctx.models.getModel('Answer', 'entity');
        const normalizedInput: Partial<db.ReactionInitializer & db.AnswerInitializer> = { ...input };
        normalizedInput.id = uuid();
        normalizedInput.createdAt = ctx.now;
        normalizedInput.createdById = ctx.user?.id;
        normalizedInput.type = 'Answer';
        normalizedInput.updatedAt = ctx.now;
        normalizedInput.updatedById = ctx.user?.id;
        await checkCanWrite(ctx, model, normalizedInput, 'CREATE');
        const data = { prev: {}, input, normalizedInput, next: normalizedInput };
        await ctx.mutationHook?.(model, 'create', 'before', data, ctx);
        const rootInput: Partial<db.ReactionInitializer> = pick(
          normalizedInput,
          'id',
          'type',
          'parentId',
          'content',
          'createdAt',
          'createdById',
          'updatedAt',
          'updatedById',
          'deleted',
          'deletedAt',
          'deletedById'
        );
        const childInput: Partial<db.AnswerInitializer> = pick(normalizedInput, 'id');
        await knex(model.parent).insert(rootInput);
        await knex(model.name).insert(childInput);
        await createAnswerRevision(normalizedInput, ctx);
        await ctx.mutationHook?.(model, 'create', 'after', data, ctx);
        return await resolve(ctx, normalizedInput.id);
      });
    },

    updateSomeObject: async (
      _parent: unknown,
      { where, data: input }: api.MutationUpdateSomeObjectArgs,
      partialCtx: Context,
      info: GraphQLResolveInfo
    ) => {
      return await partialCtx.knex.transaction(async (knex) => {
        const ctx: FullContext = { ...partialCtx, knex, info, aliases: new AliasGenerator() };
        const model = ctx.models.getModel('SomeObject', 'entity');
        if (Object.keys(where).length === 0) {
          throw new Error(`No SomeObject specified.`);
        }
        const normalizedInput: Partial<db.SomeObjectMutator & db.SomeObjectMutator> = { ...input };
        normalizedInput.updatedAt = ctx.now;
        normalizedInput.updatedById = ctx.user?.id;
        const prev = await getEntityToMutate(ctx, model, where, 'UPDATE');
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
          await ctx.knex(model.name).where({ id: prev.id }).update(normalizedInput);
          await createSomeObjectRevision(next, ctx);
          await ctx.mutationHook?.(model, 'update', 'after', data, ctx);
        }

        return await resolve(ctx);
      });
    },

    updateReview: async (
      _parent: unknown,
      { where, data: input }: api.MutationUpdateReviewArgs,
      partialCtx: Context,
      info: GraphQLResolveInfo
    ) => {
      return await partialCtx.knex.transaction(async (knex) => {
        const ctx: FullContext = { ...partialCtx, knex, info, aliases: new AliasGenerator() };
        const model = ctx.models.getModel('Review', 'entity');
        if (Object.keys(where).length === 0) {
          throw new Error(`No Review specified.`);
        }
        const normalizedInput: Partial<db.ReactionMutator & db.ReviewMutator> = { ...input };
        normalizedInput.updatedAt = ctx.now;
        normalizedInput.updatedById = ctx.user?.id;
        const prev = await getEntityToMutate(ctx, model, where, 'UPDATE');
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
          const rootInput: Partial<db.ReactionInitializer> = pick(
            normalizedInput,
            'id',
            'type',
            'parentId',
            'content',
            'createdAt',
            'createdById',
            'updatedAt',
            'updatedById',
            'deleted',
            'deletedAt',
            'deletedById'
          );
          const childInput: Partial<db.ReviewInitializer> = pick(normalizedInput, 'id', 'rating');
          if (Object.keys(rootInput).length) {
            await ctx.knex(model.parent).where({ id: prev.id }).update(rootInput);
          }

          if (Object.keys(childInput).length) {
            await ctx.knex(model.name).where({ id: prev.id }).update(childInput);
          }

          await createReviewRevision(next, ctx);
          await ctx.mutationHook?.(model, 'update', 'after', data, ctx);
        }

        return await resolve(ctx);
      });
    },

    updateQuestion: async (
      _parent: unknown,
      { where, data: input }: api.MutationUpdateQuestionArgs,
      partialCtx: Context,
      info: GraphQLResolveInfo
    ) => {
      return await partialCtx.knex.transaction(async (knex) => {
        const ctx: FullContext = { ...partialCtx, knex, info, aliases: new AliasGenerator() };
        const model = ctx.models.getModel('Question', 'entity');
        if (Object.keys(where).length === 0) {
          throw new Error(`No Question specified.`);
        }
        const normalizedInput: Partial<db.ReactionMutator & db.QuestionMutator> = { ...input };
        normalizedInput.updatedAt = ctx.now;
        normalizedInput.updatedById = ctx.user?.id;
        const prev = await getEntityToMutate(ctx, model, where, 'UPDATE');
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
          const rootInput: Partial<db.ReactionInitializer> = pick(
            normalizedInput,
            'id',
            'type',
            'parentId',
            'content',
            'createdAt',
            'createdById',
            'updatedAt',
            'updatedById',
            'deleted',
            'deletedAt',
            'deletedById'
          );
          const childInput: Partial<db.QuestionInitializer> = pick(normalizedInput, 'id');
          if (Object.keys(rootInput).length) {
            await ctx.knex(model.parent).where({ id: prev.id }).update(rootInput);
          }

          if (Object.keys(childInput).length) {
            await ctx.knex(model.name).where({ id: prev.id }).update(childInput);
          }

          await createQuestionRevision(next, ctx);
          await ctx.mutationHook?.(model, 'update', 'after', data, ctx);
        }

        return await resolve(ctx);
      });
    },

    updateAnswer: async (
      _parent: unknown,
      { where, data: input }: api.MutationUpdateAnswerArgs,
      partialCtx: Context,
      info: GraphQLResolveInfo
    ) => {
      return await partialCtx.knex.transaction(async (knex) => {
        const ctx: FullContext = { ...partialCtx, knex, info, aliases: new AliasGenerator() };
        const model = ctx.models.getModel('Answer', 'entity');
        if (Object.keys(where).length === 0) {
          throw new Error(`No Answer specified.`);
        }
        const normalizedInput: Partial<db.ReactionMutator & db.AnswerMutator> = { ...input };
        normalizedInput.updatedAt = ctx.now;
        normalizedInput.updatedById = ctx.user?.id;
        const prev = await getEntityToMutate(ctx, model, where, 'UPDATE');
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
          const rootInput: Partial<db.ReactionInitializer> = pick(
            normalizedInput,
            'id',
            'type',
            'parentId',
            'content',
            'createdAt',
            'createdById',
            'updatedAt',
            'updatedById',
            'deleted',
            'deletedAt',
            'deletedById'
          );
          const childInput: Partial<db.AnswerInitializer> = pick(normalizedInput, 'id');
          if (Object.keys(rootInput).length) {
            await ctx.knex(model.parent).where({ id: prev.id }).update(rootInput);
          }

          if (Object.keys(childInput).length) {
            await ctx.knex(model.name).where({ id: prev.id }).update(childInput);
          }

          await createAnswerRevision(next, ctx);
          await ctx.mutationHook?.(model, 'update', 'after', data, ctx);
        }

        return await resolve(ctx);
      });
    },

    deleteAnotherObject: async (
      _parent: unknown,
      { where, dryRun }: api.MutationDeleteAnotherObjectArgs,
      partialCtx: Context,
      info: GraphQLResolveInfo
    ) => {
      return await partialCtx.knex.transaction(async (knex) => {
        const ctx: FullContext = { ...partialCtx, knex, info, aliases: new AliasGenerator() };
        const model = ctx.models.getModel('AnotherObject', 'entity');
        if (Object.keys(where).length === 0) {
          throw new Error(`No AnotherObject specified.`);
        }

        const rootModel = model.rootModel;
        const entity = await getEntityToMutate(ctx, rootModel, where, 'DELETE');
        if (entity.deleted) {
          throw new ForbiddenError('Entity is already deleted.');
        }

        const deleteContext: DeleteContext = {
          model,
          dryRun: !!dryRun,
          toDelete: {},
          toUnlink: {},
          beforeHooks: [],
          mutations: [],
          afterHooks: [],
        };
        await deleteAnotherObjectCascade(entity, ctx, deleteContext);
        for (const callback of [...deleteContext.beforeHooks, ...deleteContext.mutations, ...deleteContext.afterHooks]) {
          await callback();
        }

        if (dryRun) {
          throw new GraphQLError(`Delete dry run:`, {
            code: 'DELETE_DRY_RUN',
            toDelete: deleteContext.toDelete,
            toUnlink: deleteContext.toUnlink,
          });
        }

        return entity.id;
      });
    },

    restoreAnotherObject: async (
      _parent: unknown,
      { where }: api.MutationRestoreAnotherObjectArgs,
      partialCtx: Context,
      info: GraphQLResolveInfo
    ) => {
      return await partialCtx.knex.transaction(async (knex) => {
        const ctx: FullContext = { ...partialCtx, knex, info, aliases: new AliasGenerator() };
        const model = ctx.models.getModel('AnotherObject', 'entity');
        if (Object.keys(where).length === 0) {
          throw new Error(`No AnotherObject specified.`);
        }

        const rootModel = model.rootModel;
        const entity = await getEntityToMutate(ctx, rootModel, where, 'RESTORE');
        if (!entity.deleted) {
          throw new ForbiddenError('Entity is not deleted.');
        }

        const restoreContext: RestoreContext = {
          entity,
          model,
          beforeHooks: [],
          mutations: [],
          afterHooks: [],
        };
        await restoreAnotherObjectCascade(entity, ctx, restoreContext);
        for (const callback of [...restoreContext.beforeHooks, ...restoreContext.mutations, ...restoreContext.afterHooks]) {
          await callback();
        }

        return entity.id;
      });
    },

    deleteSomeObject: async (
      _parent: unknown,
      { where, dryRun }: api.MutationDeleteSomeObjectArgs,
      partialCtx: Context,
      info: GraphQLResolveInfo
    ) => {
      return await partialCtx.knex.transaction(async (knex) => {
        const ctx: FullContext = { ...partialCtx, knex, info, aliases: new AliasGenerator() };
        const model = ctx.models.getModel('SomeObject', 'entity');
        if (Object.keys(where).length === 0) {
          throw new Error(`No SomeObject specified.`);
        }

        const rootModel = model.rootModel;
        const entity = await getEntityToMutate(ctx, rootModel, where, 'DELETE');
        if (entity.deleted) {
          throw new ForbiddenError('Entity is already deleted.');
        }

        const deleteContext: DeleteContext = {
          model,
          dryRun: !!dryRun,
          toDelete: {},
          toUnlink: {},
          beforeHooks: [],
          mutations: [],
          afterHooks: [],
        };
        await deleteSomeObjectCascade(entity, ctx, deleteContext);
        for (const callback of [...deleteContext.beforeHooks, ...deleteContext.mutations, ...deleteContext.afterHooks]) {
          await callback();
        }

        if (dryRun) {
          throw new GraphQLError(`Delete dry run:`, {
            code: 'DELETE_DRY_RUN',
            toDelete: deleteContext.toDelete,
            toUnlink: deleteContext.toUnlink,
          });
        }

        return entity.id;
      });
    },

    restoreSomeObject: async (
      _parent: unknown,
      { where }: api.MutationRestoreSomeObjectArgs,
      partialCtx: Context,
      info: GraphQLResolveInfo
    ) => {
      return await partialCtx.knex.transaction(async (knex) => {
        const ctx: FullContext = { ...partialCtx, knex, info, aliases: new AliasGenerator() };
        const model = ctx.models.getModel('SomeObject', 'entity');
        if (Object.keys(where).length === 0) {
          throw new Error(`No SomeObject specified.`);
        }

        const rootModel = model.rootModel;
        const entity = await getEntityToMutate(ctx, rootModel, where, 'RESTORE');
        if (!entity.deleted) {
          throw new ForbiddenError('Entity is not deleted.');
        }

        const restoreContext: RestoreContext = {
          entity,
          model,
          beforeHooks: [],
          mutations: [],
          afterHooks: [],
        };
        await restoreSomeObjectCascade(entity, ctx, restoreContext);
        for (const callback of [...restoreContext.beforeHooks, ...restoreContext.mutations, ...restoreContext.afterHooks]) {
          await callback();
        }

        return entity.id;
      });
    },

    deleteReview: async (
      _parent: unknown,
      { where, dryRun }: api.MutationDeleteReviewArgs,
      partialCtx: Context,
      info: GraphQLResolveInfo
    ) => {
      return await partialCtx.knex.transaction(async (knex) => {
        const ctx: FullContext = { ...partialCtx, knex, info, aliases: new AliasGenerator() };
        const model = ctx.models.getModel('Review', 'entity');
        if (Object.keys(where).length === 0) {
          throw new Error(`No Review specified.`);
        }

        const rootModel = model.rootModel;
        const entity = await getEntityToMutate(ctx, rootModel, where, 'DELETE');
        if (entity.deleted) {
          throw new ForbiddenError('Entity is already deleted.');
        }

        const deleteContext: DeleteContext = {
          model,
          dryRun: !!dryRun,
          toDelete: {},
          toUnlink: {},
          beforeHooks: [],
          mutations: [],
          afterHooks: [],
        };
        await deleteReactionCascade(entity, ctx, deleteContext);
        for (const callback of [...deleteContext.beforeHooks, ...deleteContext.mutations, ...deleteContext.afterHooks]) {
          await callback();
        }

        if (dryRun) {
          throw new GraphQLError(`Delete dry run:`, {
            code: 'DELETE_DRY_RUN',
            toDelete: deleteContext.toDelete,
            toUnlink: deleteContext.toUnlink,
          });
        }

        return entity.id;
      });
    },

    restoreReview: async (
      _parent: unknown,
      { where }: api.MutationRestoreReviewArgs,
      partialCtx: Context,
      info: GraphQLResolveInfo
    ) => {
      return await partialCtx.knex.transaction(async (knex) => {
        const ctx: FullContext = { ...partialCtx, knex, info, aliases: new AliasGenerator() };
        const model = ctx.models.getModel('Review', 'entity');
        if (Object.keys(where).length === 0) {
          throw new Error(`No Review specified.`);
        }

        const rootModel = model.rootModel;
        const entity = await getEntityToMutate(ctx, rootModel, where, 'RESTORE');
        if (!entity.deleted) {
          throw new ForbiddenError('Entity is not deleted.');
        }

        const restoreContext: RestoreContext = {
          entity,
          model,
          beforeHooks: [],
          mutations: [],
          afterHooks: [],
        };
        await restoreReactionCascade(entity, ctx, restoreContext);
        for (const callback of [...restoreContext.beforeHooks, ...restoreContext.mutations, ...restoreContext.afterHooks]) {
          await callback();
        }

        return entity.id;
      });
    },

    deleteQuestion: async (
      _parent: unknown,
      { where, dryRun }: api.MutationDeleteQuestionArgs,
      partialCtx: Context,
      info: GraphQLResolveInfo
    ) => {
      return await partialCtx.knex.transaction(async (knex) => {
        const ctx: FullContext = { ...partialCtx, knex, info, aliases: new AliasGenerator() };
        const model = ctx.models.getModel('Question', 'entity');
        if (Object.keys(where).length === 0) {
          throw new Error(`No Question specified.`);
        }

        const rootModel = model.rootModel;
        const entity = await getEntityToMutate(ctx, rootModel, where, 'DELETE');
        if (entity.deleted) {
          throw new ForbiddenError('Entity is already deleted.');
        }

        const deleteContext: DeleteContext = {
          model,
          dryRun: !!dryRun,
          toDelete: {},
          toUnlink: {},
          beforeHooks: [],
          mutations: [],
          afterHooks: [],
        };
        await deleteReactionCascade(entity, ctx, deleteContext);
        for (const callback of [...deleteContext.beforeHooks, ...deleteContext.mutations, ...deleteContext.afterHooks]) {
          await callback();
        }

        if (dryRun) {
          throw new GraphQLError(`Delete dry run:`, {
            code: 'DELETE_DRY_RUN',
            toDelete: deleteContext.toDelete,
            toUnlink: deleteContext.toUnlink,
          });
        }

        return entity.id;
      });
    },

    restoreQuestion: async (
      _parent: unknown,
      { where }: api.MutationRestoreQuestionArgs,
      partialCtx: Context,
      info: GraphQLResolveInfo
    ) => {
      return await partialCtx.knex.transaction(async (knex) => {
        const ctx: FullContext = { ...partialCtx, knex, info, aliases: new AliasGenerator() };
        const model = ctx.models.getModel('Question', 'entity');
        if (Object.keys(where).length === 0) {
          throw new Error(`No Question specified.`);
        }

        const rootModel = model.rootModel;
        const entity = await getEntityToMutate(ctx, rootModel, where, 'RESTORE');
        if (!entity.deleted) {
          throw new ForbiddenError('Entity is not deleted.');
        }

        const restoreContext: RestoreContext = {
          entity,
          model,
          beforeHooks: [],
          mutations: [],
          afterHooks: [],
        };
        await restoreReactionCascade(entity, ctx, restoreContext);
        for (const callback of [...restoreContext.beforeHooks, ...restoreContext.mutations, ...restoreContext.afterHooks]) {
          await callback();
        }

        return entity.id;
      });
    },

    deleteAnswer: async (
      _parent: unknown,
      { where, dryRun }: api.MutationDeleteAnswerArgs,
      partialCtx: Context,
      info: GraphQLResolveInfo
    ) => {
      return await partialCtx.knex.transaction(async (knex) => {
        const ctx: FullContext = { ...partialCtx, knex, info, aliases: new AliasGenerator() };
        const model = ctx.models.getModel('Answer', 'entity');
        if (Object.keys(where).length === 0) {
          throw new Error(`No Answer specified.`);
        }

        const rootModel = model.rootModel;
        const entity = await getEntityToMutate(ctx, rootModel, where, 'DELETE');
        if (entity.deleted) {
          throw new ForbiddenError('Entity is already deleted.');
        }

        const deleteContext: DeleteContext = {
          model,
          dryRun: !!dryRun,
          toDelete: {},
          toUnlink: {},
          beforeHooks: [],
          mutations: [],
          afterHooks: [],
        };
        await deleteReactionCascade(entity, ctx, deleteContext);
        for (const callback of [...deleteContext.beforeHooks, ...deleteContext.mutations, ...deleteContext.afterHooks]) {
          await callback();
        }

        if (dryRun) {
          throw new GraphQLError(`Delete dry run:`, {
            code: 'DELETE_DRY_RUN',
            toDelete: deleteContext.toDelete,
            toUnlink: deleteContext.toUnlink,
          });
        }

        return entity.id;
      });
    },

    restoreAnswer: async (
      _parent: unknown,
      { where }: api.MutationRestoreAnswerArgs,
      partialCtx: Context,
      info: GraphQLResolveInfo
    ) => {
      return await partialCtx.knex.transaction(async (knex) => {
        const ctx: FullContext = { ...partialCtx, knex, info, aliases: new AliasGenerator() };
        const model = ctx.models.getModel('Answer', 'entity');
        if (Object.keys(where).length === 0) {
          throw new Error(`No Answer specified.`);
        }

        const rootModel = model.rootModel;
        const entity = await getEntityToMutate(ctx, rootModel, where, 'RESTORE');
        if (!entity.deleted) {
          throw new ForbiddenError('Entity is not deleted.');
        }

        const restoreContext: RestoreContext = {
          entity,
          model,
          beforeHooks: [],
          mutations: [],
          afterHooks: [],
        };
        await restoreReactionCascade(entity, ctx, restoreContext);
        for (const callback of [...restoreContext.beforeHooks, ...restoreContext.mutations, ...restoreContext.afterHooks]) {
          await callback();
        }

        return entity.id;
      });
    },
  },
  Reaction: {
    __resolveType: ({ TYPE }) => TYPE,
  },
};

const deleteAnotherObjectCascade = async (entity: db.FullAnotherObject, ctx: FullContext, deleteCtx: DeleteContext) => {
  const currentModel = ctx.models.getModel('AnotherObject', 'entity');
  if (entity.deleted) {
    return;
  }
  if (!('AnotherObject' in deleteCtx.toDelete)) {
    deleteCtx.toDelete['AnotherObject'] = {};
  }
  if ((entity.id as string) in deleteCtx.toDelete['AnotherObject']) {
    return;
  }

  deleteCtx.toDelete['AnotherObject'][entity.id as string] = (entity.name || entity.id) as unknown as string;

  if (!deleteCtx.dryRun) {
    const normalizedInput = { deleted: true, deletedAt: ctx.now, deletedById: ctx.user?.id };
    const data = { prev: entity, input: {}, normalizedInput, next: { ...entity, ...normalizedInput } };
    if (ctx.mutationHook) {
      deleteCtx.beforeHooks.push(async () => {
        await ctx.mutationHook?.(currentModel, 'delete', 'before', data, ctx);
      });
    }
    deleteCtx.mutations.push(async () => {
      await ctx.knex('AnotherObject').where({ id: entity.id }).update(normalizedInput);
      await createAnotherObjectRevision({ ...entity, deleted: true }, ctx);
    });
    if (ctx.mutationHook) {
      deleteCtx.afterHooks.push(async () => {
        await ctx.mutationHook?.(currentModel, 'delete', 'after', data, ctx);
      });
    }
  }

  {
    const query = ctx.knex('AnotherObject').where({ ['myselfId']: entity.id });

    applyPermissions(ctx, 'AnotherObject', 'AnotherObject', query, 'DELETE');
    const descendants = await query;

    for (const descendant of descendants) {
      await deleteAnotherObjectCascade(descendant, ctx, deleteCtx);
    }
  }
  {
    const query = ctx.knex('SomeObject').where({ ['anotherId']: entity.id });

    applyPermissions(ctx, 'SomeObject', 'SomeObject', query, 'DELETE');
    const descendants = await query;

    for (const descendant of descendants) {
      await deleteSomeObjectCascade(descendant, ctx, deleteCtx);
    }
  }
};

export const restoreAnotherObjectCascade = async (
  relatedEntity: db.AnotherObject,
  ctx: FullContext,
  restoreCtx: RestoreContext
) => {
  const currentModel = ctx.models.getModel('AnotherObject', 'entity');
  if (
    !relatedEntity.deleted ||
    !relatedEntity.deletedAt ||
    !anyDateToLuxon(relatedEntity.deletedAt, ctx.timeZone)!.equals(
      anyDateToLuxon(restoreCtx.entity.deletedAt, ctx.timeZone)!
    )
  ) {
    return;
  }

  const normalizedInput: Partial<db.AnotherObjectMutator> = { deleted: false, deletedAt: null, deletedById: null };
  const data = { prev: relatedEntity, input: {}, normalizedInput, next: { ...relatedEntity, ...normalizedInput } };
  if (ctx.mutationHook) {
    restoreCtx.beforeHooks.push(async () => {
      await ctx.mutationHook?.(currentModel, 'restore', 'before', data, ctx);
    });
  }
  restoreCtx.mutations.push(async () => {
    await ctx.knex(currentModel.name).where({ id: relatedEntity.id }).update(normalizedInput);
    await createAnotherObjectRevision({ ...relatedEntity, deleted: false }, ctx);
  });
  if (ctx.mutationHook) {
    restoreCtx.afterHooks.push(async () => {
      await ctx.mutationHook?.(currentModel, 'restore', 'after', data, ctx);
    });
  }

  {
    const query = ctx.knex('AnotherObject').where({ ['myselfId']: relatedEntity.id });
    applyPermissions(ctx, 'AnotherObject', 'AnotherObject', query, 'RESTORE');
    const descendants = await query;
    for (const descendant of descendants) {
      await restoreAnotherObjectCascade(descendant, ctx, restoreCtx);
    }
  }

  {
    const query = ctx.knex('SomeObject').where({ ['anotherId']: relatedEntity.id });
    applyPermissions(ctx, 'SomeObject', 'SomeObject', query, 'RESTORE');
    const descendants = await query;
    for (const descendant of descendants) {
      await restoreSomeObjectCascade(descendant, ctx, restoreCtx);
    }
  }
};

const deleteSomeObjectCascade = async (entity: db.FullSomeObject, ctx: FullContext, deleteCtx: DeleteContext) => {
  const currentModel = ctx.models.getModel('SomeObject', 'entity');
  if (entity.deleted) {
    return;
  }
  if (!('SomeObject' in deleteCtx.toDelete)) {
    deleteCtx.toDelete['SomeObject'] = {};
  }
  if ((entity.id as string) in deleteCtx.toDelete['SomeObject']) {
    return;
  }

  deleteCtx.toDelete['SomeObject'][entity.id as string] = entity.id as unknown as string;

  if (!deleteCtx.dryRun) {
    const normalizedInput = { deleted: true, deletedAt: ctx.now, deletedById: ctx.user?.id };
    const data = { prev: entity, input: {}, normalizedInput, next: { ...entity, ...normalizedInput } };
    if (ctx.mutationHook) {
      deleteCtx.beforeHooks.push(async () => {
        await ctx.mutationHook?.(currentModel, 'delete', 'before', data, ctx);
      });
    }
    deleteCtx.mutations.push(async () => {
      await ctx.knex('SomeObject').where({ id: entity.id }).update(normalizedInput);
      await createSomeObjectRevision({ ...entity, deleted: true }, ctx);
    });
    if (ctx.mutationHook) {
      deleteCtx.afterHooks.push(async () => {
        await ctx.mutationHook?.(currentModel, 'delete', 'after', data, ctx);
      });
    }
  }
};

export const restoreSomeObjectCascade = async (
  relatedEntity: db.SomeObject,
  ctx: FullContext,
  restoreCtx: RestoreContext
) => {
  const currentModel = ctx.models.getModel('SomeObject', 'entity');
  if (
    !relatedEntity.deleted ||
    !relatedEntity.deletedAt ||
    !anyDateToLuxon(relatedEntity.deletedAt, ctx.timeZone)!.equals(
      anyDateToLuxon(restoreCtx.entity.deletedAt, ctx.timeZone)!
    )
  ) {
    return;
  }

  const normalizedInput: Partial<db.SomeObjectMutator> = { deleted: false, deletedAt: null, deletedById: null };
  const data = { prev: relatedEntity, input: {}, normalizedInput, next: { ...relatedEntity, ...normalizedInput } };
  if (ctx.mutationHook) {
    restoreCtx.beforeHooks.push(async () => {
      await ctx.mutationHook?.(currentModel, 'restore', 'before', data, ctx);
    });
  }
  restoreCtx.mutations.push(async () => {
    await ctx.knex(currentModel.name).where({ id: relatedEntity.id }).update(normalizedInput);
    await createSomeObjectRevision({ ...relatedEntity, deleted: false }, ctx);
  });
  if (ctx.mutationHook) {
    restoreCtx.afterHooks.push(async () => {
      await ctx.mutationHook?.(currentModel, 'restore', 'after', data, ctx);
    });
  }
};

const deleteReactionCascade = async (entity: db.FullReaction, ctx: FullContext, deleteCtx: DeleteContext) => {
  const currentModel = ctx.models.getModel('Reaction', 'entity');
  if (entity.deleted) {
    return;
  }
  if (!('Reaction' in deleteCtx.toDelete)) {
    deleteCtx.toDelete['Reaction'] = {};
  }
  if ((entity.id as string) in deleteCtx.toDelete['Reaction']) {
    return;
  }

  deleteCtx.toDelete['Reaction'][entity.id as string] = entity.id as unknown as string;

  if (!deleteCtx.dryRun) {
    const normalizedInput = { deleted: true, deletedAt: ctx.now, deletedById: ctx.user?.id };
    const data = { prev: entity, input: {}, normalizedInput, next: { ...entity, ...normalizedInput } };
    if (ctx.mutationHook) {
      deleteCtx.beforeHooks.push(async () => {
        await ctx.mutationHook?.(currentModel, 'delete', 'before', data, ctx);
      });
    }
    deleteCtx.mutations.push(async () => {
      await ctx.knex('Reaction').where({ id: entity.id }).update(normalizedInput);
      await createReactionRevision({ ...entity, deleted: true }, ctx);
    });
    if (ctx.mutationHook) {
      deleteCtx.afterHooks.push(async () => {
        await ctx.mutationHook?.(currentModel, 'delete', 'after', data, ctx);
      });
    }
  }

  {
    const query = ctx.knex('Reaction').where({ ['parentId']: entity.id });

    applyPermissions(ctx, 'Reaction', 'Reaction', query, 'DELETE');
    const descendants = await query;

    for (const descendant of descendants) {
      await deleteReactionCascade(descendant, ctx, deleteCtx);
    }
  }
};

export const restoreReactionCascade = async (relatedEntity: db.Reaction, ctx: FullContext, restoreCtx: RestoreContext) => {
  const currentModel = ctx.models.getModel('Reaction', 'entity');
  if (
    !relatedEntity.deleted ||
    !relatedEntity.deletedAt ||
    !anyDateToLuxon(relatedEntity.deletedAt, ctx.timeZone)!.equals(
      anyDateToLuxon(restoreCtx.entity.deletedAt, ctx.timeZone)!
    )
  ) {
    return;
  }

  const normalizedInput: Partial<db.ReactionMutator> = { deleted: false, deletedAt: null, deletedById: null };
  const data = { prev: relatedEntity, input: {}, normalizedInput, next: { ...relatedEntity, ...normalizedInput } };
  if (ctx.mutationHook) {
    restoreCtx.beforeHooks.push(async () => {
      await ctx.mutationHook?.(currentModel, 'restore', 'before', data, ctx);
    });
  }
  restoreCtx.mutations.push(async () => {
    await ctx.knex(currentModel.name).where({ id: relatedEntity.id }).update(normalizedInput);
    await createReactionRevision({ ...relatedEntity, deleted: false }, ctx);
  });
  if (ctx.mutationHook) {
    restoreCtx.afterHooks.push(async () => {
      await ctx.mutationHook?.(currentModel, 'restore', 'after', data, ctx);
    });
  }

  {
    const query = ctx.knex('Reaction').where({ ['parentId']: relatedEntity.id });
    applyPermissions(ctx, 'Reaction', 'Reaction', query, 'RESTORE');
    const descendants = await query;
    for (const descendant of descendants) {
      await restoreReactionCascade(descendant, ctx, restoreCtx);
    }
  }
};

export const createAnotherObjectRevision = async (
  data: db.FullAnotherObject,
  ctx: Pick<Context, 'knex' | 'now' | 'user'>
) => {
  // TODO: revisions for models that are deletable but not updatable...
};

export const createSomeObjectRevision = async (data: db.FullSomeObject, ctx: Pick<Context, 'knex' | 'now' | 'user'>) => {
  const revisionId = uuid();
  const rootRevisionData: Entity = {
    id: revisionId,
    ['someObjectId']: data.id,
    createdAt: ctx.now,
    createdById: ctx.user?.id,
  };

  rootRevisionData.deleted = data.deleted || false;
  {
    let value;
    if (!('anotherId' in data)) {
      throw new Error();
    } else {
      value = data['anotherId'];
    }

    rootRevisionData['anotherId'] = value;
  }
  {
    let value;
    if (!('xyz' in data)) {
      throw new Error();
    } else {
      value = data['xyz'];
    }

    rootRevisionData['xyz'] = value;
  }
  await ctx.knex('SomeObjectRevision').insert(rootRevisionData);
};

export const createReactionRevision = async (data: db.FullReaction, ctx: Pick<Context, 'knex' | 'now' | 'user'>) => {
  const revisionId = uuid();
  const rootRevisionData: Entity = {
    id: revisionId,
    ['reactionId']: data.id,
    createdAt: ctx.now,
    createdById: ctx.user?.id,
  };

  rootRevisionData.deleted = data.deleted || false;
  {
    const value = data['content'];
    rootRevisionData['content'] = value;
  }
  await ctx.knex('ReactionRevision').insert(rootRevisionData);
};

export const createReviewRevision = async (data: db.FullReview, ctx: Pick<Context, 'knex' | 'now' | 'user'>) => {
  const revisionId = uuid();
  const rootRevisionData: Entity = {
    id: revisionId,
    ['reactionId']: data.id,
    createdAt: ctx.now,
    createdById: ctx.user?.id,
  };

  rootRevisionData.deleted = data.deleted || false;

  const childRevisionData = { id: revisionId };

  {
    const value = data['content'];
    rootRevisionData['content'] = value;
  }
  {
    const value = data['rating'];
    childRevisionData['rating'] = value;
  }

  await ctx.knex('ReactionRevision').insert(rootRevisionData);
  await ctx.knex('ReviewRevision').insert(childRevisionData);
};

export const createQuestionRevision = async (data: db.FullQuestion, ctx: Pick<Context, 'knex' | 'now' | 'user'>) => {
  const revisionId = uuid();
  const rootRevisionData: Entity = {
    id: revisionId,
    ['reactionId']: data.id,
    createdAt: ctx.now,
    createdById: ctx.user?.id,
  };

  rootRevisionData.deleted = data.deleted || false;

  const childRevisionData = { id: revisionId };

  {
    const value = data['content'];
    rootRevisionData['content'] = value;
  }

  await ctx.knex('ReactionRevision').insert(rootRevisionData);
  await ctx.knex('QuestionRevision').insert(childRevisionData);
};

export const createAnswerRevision = async (data: db.FullAnswer, ctx: Pick<Context, 'knex' | 'now' | 'user'>) => {
  const revisionId = uuid();
  const rootRevisionData: Entity = {
    id: revisionId,
    ['reactionId']: data.id,
    createdAt: ctx.now,
    createdById: ctx.user?.id,
  };

  rootRevisionData.deleted = data.deleted || false;

  const childRevisionData = { id: revisionId };

  {
    const value = data['content'];
    rootRevisionData['content'] = value;
  }

  await ctx.knex('ReactionRevision').insert(rootRevisionData);
  await ctx.knex('AnswerRevision').insert(childRevisionData);
};
