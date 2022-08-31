import { DocumentNode, GraphQLResolveInfo } from 'graphql';
import { IncomingMessage } from 'http';
import { Knex } from 'knex';
import { Models, MutationHook, RawModels } from './models';
import { Permissions } from './permissions/generate';

// Minimal user structure required by graphql-magic
export type User = { id: string; role: string };

export type Context = {
  req: IncomingMessage;
  knex: Knex;
  document: DocumentNode;
  locale: string;
  locales: string[];
  user: User;
  rawModels: RawModels;
  models: Models;
  permissions: Permissions;
  mutationHook?: MutationHook;
};

export type FullContext = Context & { info: GraphQLResolveInfo };
