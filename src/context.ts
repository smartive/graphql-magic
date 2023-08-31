import { DocumentNode, GraphQLResolveInfo } from 'graphql';
import { IncomingMessage } from 'http';
import { Knex } from 'knex';
import { DateTime } from 'luxon';
import { Models, RawModels } from './models/models';
import { Entity, MutationHook } from './models/mutation-hook';
import { Permissions } from './permissions/generate';
import { AliasGenerator } from './resolvers/utils';

// Minimal user structure required by graphql-magic
export type User = { id: string; role: string };

export type Context = {
  req: IncomingMessage;
  now: DateTime;
  knex: Knex;
  document: DocumentNode;
  locale: string;
  locales: string[];
  user: User;
  rawModels: RawModels;
  models: Models;
  permissions: Permissions;
  mutationHook?: MutationHook;
  handleUploads?: (data: Entity) => Promise<void>;
};

export type FullContext = Context & { info: GraphQLResolveInfo; aliases: AliasGenerator };
