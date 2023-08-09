import { gql } from '../../src';
import { ANOTHER_ID } from '../utils/database/seed';
import { withServer } from '../utils/server';

describe('delete', () => {
  it('works with self-referential entities', async () => {
    await withServer(async (request) => {
      expect(
        await request(gql`
          mutation DeleteAnotherObject {
            deleteAnotherObject(where: { id: "${ANOTHER_ID}" })
          }
        `)
      ).toMatchSnapshot();

      expect(
        await request(gql`
          query GetAnotherObject {
            anotherObjects(where: { id: "${ANOTHER_ID}", deleted: true }) {
              id
              deleted
            }
          }
        `)
      ).toMatchSnapshot();
    });
  });
});
