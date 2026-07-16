import { DocumentNode, GraphQLResolveInfo } from 'graphql';
import { IncomingMessage } from 'http';
import { Knex } from 'knex';
import { Models } from './models/models';
import { MutationContext, MutationHook, QueryHook } from './models/mutation-hook';
import { Permissions } from './permissions/generate';
import { AliasGenerator } from './resolvers/utils';
import { AnyDateType } from './utils';

// Minimal user structure required by graphql-magic
export type User = { id: string; role: string };

export type Context<DateType extends AnyDateType = AnyDateType> = {
  req: IncomingMessage;
  now: DateType;
  timeZone?: string;
  knex: Knex;
  document: DocumentNode;
  locale: string;
  locales: string[];
  user?: User;
  models: Models;
  permissions: Permissions;
  mutationHook?: MutationHook<DateType>;
  queryHook?: QueryHook<DateType>;
  /**
   * Per-mutation scratch bag. Initialized to `{}` by `mutationResolver` at the
   * start of every top-level mutation field and shared by reference across all
   * nested `withTransaction` levels (cascades, reentrant mutations). Hooks can
   * accumulate request-scoped state here (e.g. dirty entity ids) and the
   * `afterMutations` callback can act on it once at the end of the mutation.
   */
  mutationState?: Record<string, unknown>;
  /**
   * Optional callback run once at the end of each top-level mutation field,
   * after all writes (including cascades/reentrant mutations) have completed
   * but before the result is read back, and still inside the mutation
   * transaction. Intended to flush deferred work accumulated in
   * `mutationState` (e.g. run entity calculations a single time, in dependency
   * order, instead of eagerly mid-mutation).
   */
  afterMutations?: (ctx: MutationContext<DateType>) => Promise<void> | void;
};

export type FullContext = Context & {
  info: GraphQLResolveInfo;
  aliases: AliasGenerator;
};
