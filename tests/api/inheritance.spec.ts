import { gql } from '../../src';
import { DELETE_REVIEW, RESTORE_REVIEW } from '../generated/client/mutations';
import { REVIEW_ID } from '../utils/database/seed';
import { withServer } from '../utils/server';

describe('inheritance', () => {
  describe('queries', () => {
    it('root type listQuery', async () => {
      await withServer(async (request) => {
        expect(
          await request(gql`
            query GetReactions {
              reactions {
                type
                content
                ... on Review {
                  rating
                }
              }
            }
          `)
        ).toMatchSnapshot();
      });
    });

    it('root type query', async () => {
      await withServer(async (request) => {
        expect(
          await request(gql`
            query GetReaction {
              reaction(where: { id: "${REVIEW_ID}" }) {
                type
                content
                ... on Review {
                  rating
                }
              }
            }
          `)
        ).toMatchSnapshot();
      });
    });

    it('sub type listQuery', async () => {
      await withServer(async (request) => {
        expect(
          await request(gql`
            query GetReviews {
              reviews {
                type
                content
                rating
              }
            }
          `)
        ).toMatchSnapshot();
      });
    });

    it('sub type query', async () => {
      await withServer(async (request) => {
        expect(
          await request(gql`
            query GetReview {
              review(where: { id: "${REVIEW_ID}" }) {
                type
                content
                rating
              }
            }
          `)
        ).toMatchSnapshot();
      });
    });

    // TODO
    // root type -> root type relation
    // root type -> sub type relation
    // sub type -> root type relation
    // sub type -> sub type relation
    // reverse relations...
    // basically all schema possibilities...
  });

  describe('mutations', () => {
    it('create', async () => {
      await withServer(async (request) => {
        expect(
          await request(
            gql`
              mutation CreateReview($data: CreateReview!) {
                createReview(data: $data) {
                  content
                  rating
                }
              }
            `,
            { data: { content: 'A review', rating: 5 } }
          )
        ).toMatchSnapshot();
      });
    });

    it('update', async () => {
      await withServer(async (request) => {
        expect(
          await request(
            gql`
              mutation UpdateReview($id: ID!, $data: UpdateReview!) {
                updateReview(where: { id: $id }, data: $data) {
                  content
                  rating
                }
              }
            `,
            { id: REVIEW_ID, data: { content: 'A review', rating: 5 } }
          )
        ).toMatchSnapshot();
      });
    });

    it('delete and restore', async () => {
      await withServer(async (request) => {
        expect(await request(DELETE_REVIEW, { id: REVIEW_ID })).toMatchSnapshot();

        expect(await request(RESTORE_REVIEW, { id: REVIEW_ID })).toMatchSnapshot();
      });
    });
  });
});
