import { Knex } from 'knex';
import { DateTime } from 'luxon';
import { summonByName } from '../../../src';
import { models } from '../models';

export const ADMIN_ID = '04e45b48-04cf-4b38-bb25-b9af5ae0b2c4';

export const SOME_ID = '604ab55d-ec3e-4857-9f27-219158f80e64';
export const ANOTHER_ID = '226a20e8-5c18-4423-99ca-eb0df6ff4fdd';

export const seed = {
  User: [
    {
      id: ADMIN_ID,
      username: 'admin',
      role: 'ADMIN',
    },
  ],
  AnotherObject: [
    {
      id: ANOTHER_ID,
      myselfId: ANOTHER_ID,
    },
  ],
  SomeObject: [
    {
      id: SOME_ID,
      anotherId: ANOTHER_ID,
      list: 0,
      xyz: 1,
    },
  ],
};

export const setupSeed = async (knex: Knex) => {
  const now = DateTime.now();
  for (const [table, entities] of Object.entries(seed)) {
    const model = summonByName(models, table);
    await knex.batchInsert(
      table,
      entities.map((entity, i) => ({
        ...entity,
        ...(model.creatable && {
          createdAt: now.plus({ second: i }),
          createdById: ADMIN_ID,
        }),
        ...(model.updatable && {
          updatedAt: now.plus({ second: i }),
          updatedById: ADMIN_ID,
        }),
      }))
    );
  }
};
