import { makeExecutableSchema } from '@graphql-tools/schema';
import { execute, parse, Source } from 'graphql';
import knex from 'knex';
import { DateTime } from 'luxon';
import { gql } from '../src/client/gql';
import { Context } from '../src/context';
import { generate } from '../src/generate';
import { getResolvers } from '../src/resolvers';
import { models, permissions, rawModels } from './utils/models';

const test = async (operationName: string, query: string, variableValues: object, responses: unknown[]) => {
  const knexInstance = knex({
    client: 'postgresql',
  });

  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const mockKnex = require('mock-knex');
  mockKnex.mock(knexInstance);
  const tracker = mockKnex.getTracker();

  tracker.install();
  tracker.on('query', function someFunction(query, step) {
    expect(query.sql).toMatchSnapshot('query');
    query.response(responses[step - 1]);
  });

  const user = await knexInstance('User').where({ id: 1 }).first();
  const typeDefs = generate(rawModels);
  const contextValue: Context = {
    req: null as any,
    knex: knexInstance,
    document: typeDefs,
    locale: 'en',
    locales: ['en'],
    user,
    rawModels,
    models,
    permissions,
    now: DateTime.fromISO('2020-01-01T00:00:00.000Z'),
  };
  const result = await execute({
    schema: makeExecutableSchema({
      typeDefs,
      resolvers: getResolvers(models),
    }),
    document: parse(new Source(query, 'GraphQL request')),
    contextValue,
    variableValues,
    operationName,
  });

  expect(result).toMatchSnapshot();

  tracker.uninstall();
};

describe('resolvers', () => {
  it('are generated correctly', () => {
    expect(getResolvers(models)).toMatchSnapshot();
  });

  it('resolve lists, many-to-one and one-to-many queries', async () => {
    await test(
      'SomeQuery',
      gql`
        query SomeQuery {
          manyObjects(where: { another: { id: "bar" } }, orderBy: [{ xyz: DESC }]) {
            id
            field
            another {
              id
              manyObjects(where: { id: "foo" }) {
                id
                field
              }
            }
          }
        }
      `,
      {},
      [
        { id: 1, role: 'ADMIN' },
        [
          {
            SO__ID: 'foo',
            SO__id: 'foo',
            SO__field: 'foo',
            SO__a__ID: 'bar',
            SO__a__id: 'bar',
          },
        ],
        [
          {
            SO__a__mO__ID: 'foo',
            SO__a__mO__id: 'foo',
            SO__a__mO__field: 'foo',
            SO__a__mO__anotherId: 'bar',
          },
        ],
      ]
    );
  });

  it('resolve single query', async () => {
    await test(
      'SomeQuery',
      gql`
        query SomeQuery {
          someObject(where: { id: "foo" }) {
            id
            field
          }
        }
      `,
      {},
      [
        { id: 1, role: 'ADMIN' },
        [
          {
            SO__ID: 'foo',
            SO__id: 'foo',
            SO__field: 'foo',
          },
        ],
      ]
    );
  });
});
