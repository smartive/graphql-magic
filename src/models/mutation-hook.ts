import { AnyDateType, Context } from '..';
import { EntityModel } from './models';

export type Entity = Record<string, unknown>;

export type Action = 'create' | 'update' | 'delete' | 'restore';

export type MutationContext<DateType extends AnyDateType = AnyDateType> = Pick<
  Context<DateType>,
  'knex' | 'now' | 'user' | 'timeZone' | 'mutationHook' | 'handleUploads' | 'models' | 'permissions'
>;

export type MutationHook<DateType extends AnyDateType = AnyDateType> = (args: {
  model: EntityModel;
  action: Action;
  trigger: 'mutation' | 'cascade' | 'set-null';
  when: 'before' | 'after';
  data: { prev: Entity; input: Entity; normalizedInput: Entity; next: Entity };
  ctx: MutationContext<DateType>;
}) => Promise<void> | void;
