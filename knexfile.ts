import { DateTime } from 'luxon';
import { types } from 'pg';

const dateOids = { date: 1082, timestamptz: 1184, timestamp: 1114 };
for (const oid of Object.values(dateOids)) {
  types.setTypeParser(oid, (val) => DateTime.fromSQL(val));
}

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
