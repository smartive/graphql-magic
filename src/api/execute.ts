import { makeExecutableSchema } from '@graphql-tools/schema';
import { IFieldResolver, IResolvers } from '@graphql-tools/utils';
import {
  DocumentNode,
  GraphQLResolveInfo,
  GraphQLSchema,
  Source,
  execute as graphqlExecute,
  parse,
  specifiedRules,
  validate,
} from 'graphql';
import isFunction from 'lodash/isFunction';
import mapValues from 'lodash/mapValues';
import merge from 'lodash/merge';
import { Context, generate, get, getResolvers } from '..';
import { Models } from '../models/models';
import { noIntrospection } from '../utils/rules';

export type ResolverWrapper = (
  resolver: IFieldResolver<unknown, unknown, unknown, unknown>,
) => IFieldResolver<unknown, unknown, unknown, unknown>;

export type ExecutorInput = {
  models: Models;
  additionalResolvers?: IResolvers<any, any>;
  resolverWrapper?: ResolverWrapper;
};

export type Executor = {
  schema: GraphQLSchema;
  document: DocumentNode;
};

/**
 * Builds the SDL and the executable schema.
 *
 * Both are pure functions of the models, the additional resolvers and the resolver wrapper —
 * resolvers receive request state as their context argument, so nothing request-scoped is
 * captured — which means the result is safe to build once and reuse for every request.
 * `execute` already caches this per process; call `createExecutor` directly when you want to
 * own the lifetime, e.g. to pay the build cost at boot rather than on the first request.
 */
export const createExecutor = ({ models, additionalResolvers, resolverWrapper }: ExecutorInput): Executor => {
  const document = generate(models);
  let resolvers = merge(getResolvers(models), additionalResolvers);
  if (resolverWrapper) {
    resolvers = mapValues(resolvers, (type) =>
      Object.getPrototypeOf(type) === Object.prototype
        ? mapValues(type, (resolver) => (isFunction(resolver) ? resolverWrapper(resolver) : resolver))
        : type,
    );
  }

  return {
    schema: makeExecutableSchema({
      typeDefs: document,
      resolvers,
    }),
    document,
  };
};

// Keyed on the identity of all three inputs, because a consumer may execute against more than
// one model set or resolver map in the same process. WeakMaps throughout: passing a freshly
// created wrapper on each call falls back to today's behaviour — a rebuild — and the entry
// becomes collectable along with the wrapper, so an inline arrow cannot grow this unboundedly.
const NO_ADDITIONAL_RESOLVERS = {};
const NO_RESOLVER_WRAPPER = () => undefined;

const executorCache = new WeakMap<Models, WeakMap<object, WeakMap<object, Executor>>>();

const getExecutor = ({ models, additionalResolvers, resolverWrapper }: ExecutorInput): Executor => {
  let byResolvers = executorCache.get(models);
  if (!byResolvers) {
    byResolvers = new WeakMap();
    executorCache.set(models, byResolvers);
  }

  const resolversKey: object = additionalResolvers ?? NO_ADDITIONAL_RESOLVERS;
  let byWrapper = byResolvers.get(resolversKey);
  if (!byWrapper) {
    byWrapper = new WeakMap();
    byResolvers.set(resolversKey, byWrapper);
  }

  const wrapperKey: object = resolverWrapper ?? NO_RESOLVER_WRAPPER;
  const cached = byWrapper.get(wrapperKey);
  if (cached) {
    return cached;
  }

  const executor = createExecutor({ models, additionalResolvers, resolverWrapper });
  byWrapper.set(wrapperKey, executor);

  return executor;
};

export const execute = async ({
  additionalResolvers,
  body,
  executor,
  introspection = false,
  resolverWrapper,
  ...ctx
}: {
  additionalResolvers?: IResolvers<any, any>;
  introspection?: boolean;
  body: any;
  resolverWrapper?: ResolverWrapper;
  /** Pre-built via `createExecutor`. Takes precedence over the per-process cache. */
  executor?: Executor;
} & Omit<Context, 'document'>) => {
  const { schema, document } = executor ?? getExecutor({ models: ctx.models, additionalResolvers, resolverWrapper });

  const parsedDocument = parse(new Source(body.query, 'GraphQL request'));

  const validationErrors = validate(
    schema,
    parsedDocument,
    introspection ? specifiedRules : [...specifiedRules, noIntrospection],
  );

  if (validationErrors.length > 0) {
    return { errors: validationErrors };
  }

  const contextValue: Context = {
    document,
    ...ctx,
  };

  const result = await graphqlExecute({
    schema,
    document: parsedDocument,
    contextValue,
    variableValues: body.variables,
    operationName: body.operationName,
    fieldResolver: (parent, _args, _ctx, info: GraphQLResolveInfo) => {
      const node = get(info.fieldNodes, 0);
      const alias = node.alias;

      return parent[alias ? alias.value : node.name.value];
    },
  });

  return result;
};
