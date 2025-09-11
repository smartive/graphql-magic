import { AnyDateType, Context } from '..';
import { EntityModel } from './models';

export type Entity = Record<string, unknown>;

export type Action = 'create' | 'update' | 'delete' | 'restore';

export type Trigger = 'mutation' | 'direct-call' | 'cascade' | 'set-null';

export type MutationContext<DateType extends AnyDateType = AnyDateType> = Pick<
  Context<DateType>,
  'knex' | 'now' | 'user' | 'timeZone' | 'mutationHook' | 'models' | 'permissions'
>;

export type MutationHook<DateType extends AnyDateType = AnyDateType> = (args: {
  model: EntityModel;
  action: Action;
  trigger: Trigger;
  when: 'before' | 'after';
  data: { prev: Entity; input: Entity; normalizedInput: Entity; next: Entity };
  ctx: MutationContext<DateType>;
}) => Promise<void> | void;
