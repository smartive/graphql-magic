import { makeExecutableSchema } from '@graphql-tools/schema';
import { execute, GraphQLResolveInfo, parse, Source, TypedQueryDocumentNode } from 'graphql';
import graphqlRequest, { RequestDocument, Variables } from 'graphql-request';
import { createServer, RequestListener } from 'http';
import { Knex } from 'knex';
import { up } from '../../migrations/20230912185644_setup';
import { Context, get } from '../../src';
import { resolvers } from '../generated/resolvers';
import { typeDefs } from '../generated/schema';
import { getKnex } from './database/knex';
import { ADMIN_ID, setupSeed } from './database/seed';
import { models, permissions } from './models';

export const withServer = async (
  cb: (
    request: (document: RequestDocument | TypedQueryDocumentNode, ...variablesAndRequestHeaders: any) => Promise<any>,
    knex: Knex
  ) => Promise<void>
) => {
  let handler: RequestListener;
  const server = createServer((req, res) => handler(req, res));

  const port = await new Promise<number>((res, rej) =>
    server
      .listen() // Listen on a random free port (assigned by the OS)
      .once('listening', function () {
        res(this.address().port);
      })
      .once('error', rej)
  );

  const rootKnex = getKnex();
  const dbName = `test_${port}`;
  await rootKnex.raw('DROP DATABASE IF EXISTS ?? WITH (FORCE)', dbName);
  await rootKnex.raw(`CREATE DATABASE ?? OWNER ??`, [dbName, 'postgres']);

  const knex = getKnex(dbName);

  try {
    await up(knex);
    const now = '2020-01-01T00:00:00.000Z';
    await setupSeed(knex, now);

    handler = async (req, res) => {
      const user = await knex('User').where({ id: ADMIN_ID }).first();
      const body = await new Promise<any>((res) => {
        const chunks: any = [];
        req
          .on('data', (chunk) => {
            chunks.push(chunk);
          })
          .on('end', () => {
            res(JSON.parse(Buffer.concat(chunks).toString()));
          });
      });

      const contextValue: Context = {
        req,
        knex,
        locale: 'en',
        locales: ['en'],
        user,
        models,
        permissions,
        now,
      };
      const result = await execute({
        schema: makeExecutableSchema({
          typeDefs,
          resolvers,
        }),
        document: parse(new Source(body.query, 'GraphQL request')),
        contextValue,
        variableValues: body.variables,
        operationName: body.operationName,
        fieldResolver: (parent, _args, _ctx, info: GraphQLResolveInfo) => {
          const node = get(info.fieldNodes, 0);
          const alias = node.alias;

          return parent[alias ? alias.value : node.name.value];
        },
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
