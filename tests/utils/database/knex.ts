import knex from 'knex';

export const getKnex = (database = 'postgres') =>
  knex({
    client: 'postgresql',
    connection: {
      host: 'localhost',
      database,
      user: 'postgres',
      password: 'password',
    },
    migrations: {
      tableName: 'knex_migrations',
    },
    pool: {
      min: 0,
      max: 30,
    },
  });
