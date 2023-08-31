import { DateTime } from 'luxon';
import { Model } from '.';
import { Context } from '..';

export type Entity = Record<string, unknown> & { createdAt?: DateTime; deletedAt?: DateTime };

export type FullEntity = Entity & { id: string };

export type Action = 'create' | 'update' | 'delete' | 'restore';

export type MutationHook = (
  model: Model,
  action: Action,
  when: 'before' | 'after',
  data: { prev: Entity; input: Entity; normalizedInput: Entity; next: FullEntity },
  ctx: Context
) => Promise<void>;
