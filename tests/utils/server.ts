import { makeExecutableSchema } from '@graphql-tools/schema';
import { execute, parse, Source, TypedQueryDocumentNode } from 'graphql';
import graphqlRequest, { RequestDocument, Variables } from 'graphql-request';
import { createServer, RequestListener } from 'http';
import { Knex } from 'knex';
import { DateTime } from 'luxon';
import { Context } from '../../src/context';
import { generate } from '../../src/generate';
import { getResolvers } from '../../src/resolvers';
import { getKnex } from './database/knex';
import { setupSchema } from './database/schema';
import { ADMIN_ID, setupSeed } from './database/seed';
import { models, permissions, rawModels } from './models';

const MIN_PORT = 49152;
const MAX_PORT = 65535;

export const withServer = async (
  cb: (
    request: (document: RequestDocument | TypedQueryDocumentNode, ...variablesAndRequestHeaders: any) => Promise<any>,
    knex: Knex
  ) => Promise<void>
) => {
  // eslint-disable-next-line prefer-const
  let handler: RequestListener;
  let port: number;
  const server = createServer((req, res) => handler(req, res));

  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      port = Math.floor(Math.random() * (MAX_PORT - MIN_PORT + 1)) + MIN_PORT;
      await new Promise<void>((res, rej) => server.listen(port, res).once('error', rej));
      break;
    } catch (e) {
      console.error(e);
    }
  }

  const rootKnex = getKnex();
  const dbName = `test_${port}`;
  await rootKnex.raw('DROP DATABASE IF EXISTS ?? WITH (FORCE)', dbName);
  await rootKnex.raw(`CREATE DATABASE ?? OWNER ??`, [dbName, 'postgres']);

  const knex = getKnex(dbName);

  try {
    await setupSchema(knex);
    await setupSeed(knex);

    handler = async (req, res) => {
      const user = await knex('User').where({ id: ADMIN_ID }).first();

      const typeDefs = generate(rawModels);
      const contextValue: Context = {
        req,
        knex,
        document: typeDefs,
        locale: 'en',
        locales: ['en'],
        user,
        rawModels,
        models,
        permissions,
        now: DateTime.fromISO('2020-01-01T00:00:00.000Z'),
      };
      const {
        query,
        variables: variableValues,
        operationName,
      } = await new Promise<any>((res) => {
        const chunks: any = [];
        req
          .on('data', (chunk) => {
            chunks.push(chunk);
          })
          .on('end', () => {
            res(JSON.parse(Buffer.concat(chunks).toString()));
          });
      });
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

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(result));
    };

    const request = <T, V extends Variables = Variables>(
      document: RequestDocument | TypedQueryDocumentNode<T, V>,
      ...variablesAndRequestHeaders: any
    ) => graphqlRequest(`http://localhost:${port}`, document, ...variablesAndRequestHeaders);

    await cb(request, knex);
  } finally {
    server.close();
    await knex.destroy();
    await rootKnex.raw('DROP DATABASE IF EXISTS ?? WITH (FORCE)', dbName);
    await rootKnex.destroy();
  }
};
