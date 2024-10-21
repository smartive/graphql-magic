import { GraphQLResolveInfo } from 'graphql';
import { IncomingMessage } from 'http';
import { Knex } from 'knex';
import { Models } from './models/models';
import { Entity, MutationHook } from './models/mutation-hook';
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
  locale: string;
  locales: string[];
  user?: User;
  models: Models;
  permissions: Permissions;
  mutationHook?: MutationHook<DateType>;
  handleUploads?: (data: Entity) => Promise<void>;
};

export type FullContext = Context & {
  info: GraphQLResolveInfo;
  aliases: AliasGenerator;
};
