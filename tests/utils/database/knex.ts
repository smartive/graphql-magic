import knex from 'knex';
import knexfile from '../../../knexfile';

export const getKnex = (database?: string) =>
  knex({
    ...knexfile,
    connection: {
      ...knexfile.connection,
      ...(database && { database }),
    },
  });
