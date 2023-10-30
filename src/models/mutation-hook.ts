import { DateTime } from 'luxon';
import { Context } from '..';
import { EntityModel } from './models';

export type Entity = Record<string, unknown> & { createdAt?: DateTime; deletedAt?: DateTime };

export type FullEntity = Entity & { id: string };

export type Action = 'create' | 'update' | 'delete' | 'restore';

export type MutationHook = (
  model: EntityModel,
  action: Action,
  when: 'before' | 'after',
  data: { prev: Entity; input: Entity; normalizedInput: Entity; next: FullEntity },
  ctx: Context
) => Promise<void>;
