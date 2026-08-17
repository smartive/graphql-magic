import { makeExecutableSchema } from '@graphql-tools/schema';
import { IncomingMessage } from 'http';
import { Knex } from 'knex';
import { createExecutor, execute, gql } from '../../src';
import { ADMIN_ID } from '../utils/database/seed';
import { models, permissions } from '../utils/models';
import { withServer } from '../utils/server';

jest.mock('@graphql-tools/schema', () => {
  const actual = jest.requireActual('@graphql-tools/schema');

  return { ...actual, makeExecutableSchema: jest.fn(actual.makeExecutableSchema) };
});

const schemaBuilds = () => (makeExecutableSchema as unknown as jest.Mock).mock.calls.length;

const OTHER_USER_ID = 'b3c1f0de-6f2a-4a2f-9b2e-1c6a7d5e4f30';

const ME = gql`
  query Me {
    me {
      id
      username
    }
  }
`;

const contextFor = (knex: Knex, userId: string) => ({
  req: {} as IncomingMessage,
  knex,
  locale: 'en',
  locales: ['en'],
  now: '2020-01-01T00:00:00.000Z',
  models,
  permissions,
  user: { id: userId, role: 'ADMIN' },
});

describe('execute', () => {
  it('does not leak one request’s user into another’s when the schema is reused', async () => {
    await withServer(async (_request, knex) => {
      await knex('User').insert({ id: OTHER_USER_ID, username: 'other', role: 'ADMIN' });

      // Same process, same cached schema, two different users. A schema that captured request
      // state — or a resolver map built once around the first caller — would hand the second
      // request the first one's data, silently.
      const first = await execute({ ...contextFor(knex, ADMIN_ID), body: { query: ME } });
      const second = await execute({ ...contextFor(knex, OTHER_USER_ID), body: { query: ME } });

      expect(first.data?.me).toEqual({ id: ADMIN_ID, username: 'admin' });
      expect(second.data?.me).toEqual({ id: OTHER_USER_ID, username: 'other' });
    });
  });

  it('builds the schema once for repeated calls with the same models and resolvers', async () => {
    await withServer(async (_request, knex) => {
      const ctx = contextFor(knex, ADMIN_ID);
      // Warm the cache first, so the assertion is about the calls that follow rather than about
      // whatever else in this file has already populated it.
      await execute({ ...ctx, body: { query: ME } });

      const before = schemaBuilds();
      await execute({ ...ctx, body: { query: ME } });
      await execute({ ...ctx, body: { query: ME } });
      await execute({ ...ctx, body: { query: ME } });

      expect(schemaBuilds()).toBe(before);
    });
  });

  it('rebuilds when the resolver wrapper identity changes, rather than reusing a stale schema', async () => {
    await withServer(async (_request, knex) => {
      const ctx = contextFor(knex, ADMIN_ID);
      const before = schemaBuilds();

      // Two distinct wrapper identities — e.g. a caller passing an inline arrow per request.
      // Each gets its own schema; neither is retained beyond its wrapper (WeakMap).
      await execute({ ...ctx, body: { query: ME }, resolverWrapper: (resolver) => resolver });
      await execute({ ...ctx, body: { query: ME }, resolverWrapper: (resolver) => resolver });

      expect(schemaBuilds()).toBe(before + 2);
    });
  });

  it('accepts a pre-built executor and does not build another schema', async () => {
    await withServer(async (_request, knex) => {
      const executor = createExecutor({ models });
      const before = schemaBuilds();

      const result = await execute({ ...contextFor(knex, ADMIN_ID), body: { query: ME }, executor });

      expect(result.data?.me).toEqual({ id: ADMIN_ID, username: 'admin' });
      expect(schemaBuilds()).toBe(before);
    });
  });

  it('still rejects introspection when it is not enabled, on a cached schema', async () => {
    await withServer(async (_request, knex) => {
      const ctx = contextFor(knex, ADMIN_ID);
      await execute({ ...ctx, body: { query: ME } });

      const result = await execute({
        ...ctx,
        body: {
          query: gql`
            query Introspect {
              __schema {
                types {
                  name
                }
              }
            }
          `,
        },
      });

      expect(result.errors?.[0]?.message).toMatchSnapshot();
      expect(result.data).toBeUndefined();
    });
  });
});
