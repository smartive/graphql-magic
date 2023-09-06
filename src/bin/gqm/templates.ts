export const EMPTY_MODELS = `
import { RawModels, getModels } from '@smartive/graphql-magic';

export const rawModels: RawModels = [
  {
    kind: 'entity',
    name: 'User',
    fields: []
  },
]

export const models = getModels(rawModels);
`;

export const KNEXFILE = `
const config = {
  client: 'postgresql',
  connection: {
    host: process.env.DATABASE_HOST,
    database: process.env.DATABASE_NAME,
    user: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
  },
} as const;

export default config;
`;
