import { AnyDateType, Context } from '..';
import { EntityModel } from './models';

export type Entity = Record<string, unknown>;

export type Action = 'create' | 'update' | 'delete' | 'restore';

export type MutationHook<DateType extends AnyDateType = AnyDateType> = (
  model: EntityModel,
  action: Action,
  when: 'before' | 'after',
  data: { prev: Entity; input: Entity; normalizedInput: Entity; next: Entity },
  ctx: Context<DateType>,
) => Promise<void> | void;
