import { gql } from '../src';
import { ANOTHER_ID, SOME_ID } from './utils/database/seed';
import { withServer } from './utils/server';

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
});
