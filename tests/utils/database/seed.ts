import { Knex } from 'knex';
import { pick } from 'lodash';
import { DateTime } from 'luxon';
import { getColumnName, isInTable, modelNeedsTable } from '../../../src';
import { SeedData } from '../../generated/db';
import { models } from '../models';

export const ADMIN_ID = '04e45b48-04cf-4b38-bb25-b9af5ae0b2c4';

export const SOME_ID = '604ab55d-ec3e-4857-9f27-219158f80e64';
export const ANOTHER_ID = '226a20e8-5c18-4423-99ca-eb0df6ff4fdd';
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
  ],
  SomeObject: [
    {
      id: SOME_ID,
      anotherId: ANOTHER_ID,
      float: 0,
      list: ['A'],
      xyz: 1,
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

export const setupSeed = async (knex: Knex) => {
  const now = DateTime.now();
  for (const [table, entities] of Object.entries(seed)) {
    const model = models.getModel(table, 'entity');
    const mappedEntities = entities.map((entity, i) => ({
      ...entity,
      ...(model.parent && { type: model.name }),
      ...(model.creatable && {
        createdAt: now.plus({ second: i }),
        createdById: ADMIN_ID,
      }),
      ...(model.updatable && {
        updatedAt: now.plus({ second: i }),
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
