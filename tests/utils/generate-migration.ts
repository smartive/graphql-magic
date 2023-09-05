import { writeFileSync } from 'fs';
import { simpleGit } from 'simple-git';
import { MigrationGenerator, getMigrationDate } from '../../src/migrations/generate';
import { getKnex } from './database/knex';
import { rawModels } from './models';

const git = simpleGit();


const writeMigration = async () => {
  const name = process.argv[2] || (await git.branch()).current.split('/').pop();

  const knex = getKnex();

  try {
    const migrations = await new MigrationGenerator(knex, rawModels).generate();

    writeFileSync(`tmp/${getMigrationDate()}_${name}.ts`, migrations);
  } finally {
    await knex.destroy();
  }
};

void writeMigration();
