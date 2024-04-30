export const GITIGNORE = (path: string) => `
# graphql-magic
${path}/**/*
${path}/**/.gitkeep
`;

export const EMPTY_MODELS = `import { ModelDefinitions, Models } from '@smartive/graphql-magic';

const modelDefinitions: ModelDefinitions = [
  {
    kind: 'entity',
    name: 'User',
    fields: []
  },
]

export const models = new Models(modelDefinitions);
`;

export const KNEXFILE = `
import { types } from 'pg';

const numberOids = { int8: 20, float8: 701, numeric: 1700 };
for (const oid of Object.values(numberOids)) {
  types.setTypeParser(oid, Number);
}

const knexConfig = {
  client: 'postgresql',
  connection: {
    host: process.env.DATABASE_HOST,
    database: process.env.DATABASE_NAME,
    user: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
  },
  migrations: {
    tableName: 'knex_migrations',
  },
  pool: {
    min: 0,
    max: 30,
  },
} as const;

export default knexConfig;
`;

export const KNEXFILE_LUXON_TYPE_PARSERS = (timeZone: string) => `
import { DateTime } from 'luxon';

const dateOids = { date: 1082, timestamptz: 1184, timestamp: 1114 };
for (const oid of Object.values(dateOids)) {
  types.setTypeParser(oid, (val) => DateTime.fromSQL(val, { zone: "${timeZone}" }));
}
`;

export const KNEXFILE_DAYJS_TYPE_PARSERS = `
import { dayjs } from 'dayjs';

const dateOids = { date: 1082, timestamptz: 1184, timestamp: 1114 };
for (const oid of Object.values(dateOids)) {
  types.setTypeParser(oid, (val) => dayjs(val));
}
`;

export const GET_ME = `import { gql } from '@smartive/graphql-magic';

export const GET_ME = gql\`
  query GetMe {
    me {
      id
    }
  }
\`;
`;

export const EXECUTE = `
import knexConfig from "@/knexfile";
import { Context, User, execute } from "@smartive/graphql-magic";
import { randomUUID } from "crypto";
import { knex } from 'knex';
import { models } from "../config/models";

export const executeGraphql = async <T, V = undefined>(
  body: {
    query: string;
    operationName?: string;
    variables?: V;
    options?: { email?: string };
}): Promise<{ data: T }> => {
  const db = knex(knexConfig);
  let user: User | undefined;
  // TODO: get user

  const result = await execute({
    req: null as unknown as Context['req'],
    body,
    knex: db as unknown as Context['knex'],
    locale: 'en',
    locales: ['en'],
    user,
    models: models,
    permissions: { ADMIN: true, UNAUTHENTICATED: true },
  });
  await db.destroy();

  // https://github.com/vercel/next.js/issues/47447#issuecomment-1500371732
  return JSON.parse(JSON.stringify(result)) as { data: T };
}
`;
