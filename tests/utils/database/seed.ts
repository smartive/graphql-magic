import { Knex } from 'knex';
import { pick } from 'lodash';
import { getColumnName, isInTable, modelNeedsTable } from '../../../src';
import { SeedData } from '../../generated/db';
import { models } from '../models';

export const ADMIN_ID = '04e45b48-04cf-4b38-bb25-b9af5ae0b2c4';

export const SOME_ID = '604ab55d-ec3e-4857-9f27-219158f80e64';
export const SOME_ID_2 = 'fc4e013e-4cb0-4ef8-9f2e-3d475bdf2b90';
export const SOME_ID_3 = '37a23870-e7f5-45c8-86e5-f14d9f2405f9';
export const SOME_ID_4 = 'a80213a4-3168-4500-b559-3d9c1b469f9e';
export const ANOTHER_ID = '226a20e8-5c18-4423-99ca-eb0df6ff4fdd';
export const ANOTHER_ID_2 = 'ba5d94a8-0035-4e45-9258-2f7676eb8d18';
export const QUESTION_ID = '3d0f3254-282f-4f1f-95e3-c1f699f3c1e5';
export const ANSWER_ID = 'f2d7b3f1-8ea1-4c2c-91ec-024432da1b0d';
export const REVIEW_ID = '817c55de-2f77-4159-bd44-9837d868f889';

export const seed: SeedData = {
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
    {
      id: ANOTHER_ID_2,
      myselfId: ANOTHER_ID,
    },
  ],
  SomeObject: [
    {
      id: SOME_ID,
      anotherId: ANOTHER_ID,
      field: 'Some value',
      float: 0,
      list: ['A'],
      xyz: 1,
    },
    {
      id: SOME_ID_2,
      anotherId: ANOTHER_ID,
      field: null,
      float: 0.5,
      list: ['B'],
      xyz: 2,
    },
    {
      id: SOME_ID_3,
      anotherId: ANOTHER_ID_2,
      float: 0.5,
      list: ['B'],
      xyz: 2,
    },
    {
      id: SOME_ID_4,
      anotherId: null,
      float: 0.5,
      list: ['B'],
      xyz: 2,
    },
  ],
  Question: [
    {
      id: QUESTION_ID,
      content: 'What is the question?',
    },
  ],
  Answer: [
    {
      id: ANSWER_ID,
      content: 'I do not know but here is the answer.',
    },
  ],
  Review: [
    {
      id: REVIEW_ID,
      content: 'This is a review with a rating',
      rating: 5,
    },
  ],
};

export const setupSeed = async (knex: Knex, now: string) => {
  for (const [table, entities] of Object.entries(seed)) {
    const model = models.getModel(table, 'entity');
    const mappedEntities = entities.map((entity, i) => ({
      ...entity,
      ...(model.parent && { type: model.name }),
      ...(model.creatable && {
        createdAt: addSeconds(now, i),
        createdById: ADMIN_ID,
      }),
      ...(model.updatable && {
        updatedAt: addSeconds(now, i),
        updatedById: ADMIN_ID,
      }),
    }));

    if (model.parent) {
      const parentModel = models.getModel(model.parent, 'entity');
      await knex.batchInsert(
        parentModel.name,
        mappedEntities.map((entity) => pick(entity, parentModel.fields.map(getColumnName)))
      );
      if (modelNeedsTable(model)) {
        await knex.batchInsert(
          model.name,
          mappedEntities.map((entity) => pick(entity, model.fields.filter(isInTable).map(getColumnName)))
        );
      }
    } else {
      await knex.batchInsert(table, mappedEntities);
    }
  }
};

const addSeconds = (dateString: string, seconds: number) => {
  const date = new Date(dateString);
  date.setSeconds(date.getSeconds() + seconds);
  return date.toISOString();
};
