import { gql } from '../../src';
import { ANOTHER_ID, SOME_ID } from '../utils/database/seed';
import { withServer } from '../utils/server';

describe('query', () => {
  it('can be executed', async () => {
    await withServer(async (request) => {
      expect(
        await request(gql`
          query SomeQuery {
            manyObjects(where: { another: { id: "${ANOTHER_ID}" } }, orderBy: [{ xyz: DESC }]) {
              id
              field
              xyz
              another {
                id
                manyObjects(where: { id: "${SOME_ID}" }) {
                  id
                  field
                }
              }
            }
          }
        `)
      ).toMatchSnapshot();
    });
  });

  it('processes reverseFilters correctly', async () => {
    await withServer(async (request) => {
      expect(
        await request(gql`
          query ReverseFiltersQuery {
            all: anotherObjects {
              id
              manyObjects {
                float
              }
            }
            withFloat0: anotherObjects(where: { manyObjects_SOME: { float: 0 } }) {
              id
              manyObjects {
                float
              }
            }
            withFloat0_5: anotherObjects(where: { manyObjects_SOME: { float: 0.5 } }) {
              id
              manyObjects {
                float
              }
            }
            noneFloat0: anotherObjects(where: { manyObjects_NONE: { float: 0 } }) {
              id
              manyObjects {
                float
              }
            }
            noneFloat0_5: anotherObjects(where: { manyObjects_NONE: { float: 0.5 } }) {
              id
              manyObjects {
                float
              }
            }
            noneFloat2: anotherObjects(where: { manyObjects_NONE: { float: 2 } }) {
              id
              manyObjects {
                float
              }
            }
          }
        `)
      ).toMatchSnapshot();
    });
  });
});
