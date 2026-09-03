import type { GraphQLResolveInfo } from 'graphql';
import type { ExecutorInput, ResolverWrapper } from '../../src';

// This file is never executed — `npm run test:types` type-checks it, and that is the assertion.
//
// graphql-codegen emits resolvers against graphql's own `GraphQLResolveInfo`, so a consumer's
// resolver wrapper is typed that way too. `ResolverWrapper` has to stay assignable from that shape
// on every graphql major our peer range allows.
//
// This regressed once: typing `ResolverWrapper` through `@graphql-tools/utils`' `IFieldResolver`
// pulled in that package's *augmented* `GraphQLResolveInfo`, which as of utils v12 requires
// `getAbortSignal` and `getAsyncHelpers`. graphql 17 declares both natively, graphql 16 declares
// neither — so on graphql 16 the assignments below stopped compiling for every consumer, while the
// jest suite stayed green (ts-jest runs transpile-only, and the one wrapper it passes is an
// inferred `(resolver) => resolver` that never pins down the parameter type).
type ResolverFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo,
) => Promise<TResult> | TResult;

declare const consumerWrapper: (
  resolver: ResolverFn<unknown, unknown, unknown, unknown>,
) => ResolverFn<unknown, unknown, unknown, unknown>;

export const wrapper: ResolverWrapper = consumerWrapper;

export const executorInput: Pick<ExecutorInput, 'resolverWrapper'> = { resolverWrapper: consumerWrapper };
