import { writeFileSync } from 'fs';
import { simpleGit } from 'simple-git';
import { MigrationGenerator } from '../../src/migrations/generate';
import { getKnex } from './database/knex';
import { rawModels } from './models';

const git = simpleGit();

const getDate = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');

  return `${year}${month}${day}${hours}${minutes}${seconds}`;
};

const writeMigration = async () => {
  const name = process.argv[2] || (await git.branch()).current.split('/').pop();

  const knex = getKnex();

  try {
    const migrations = await new MigrationGenerator(knex, rawModels).generate();

    writeFileSync(`tmp/${getDate()}_${name}.ts`, migrations);
  } finally {
    await knex.destroy();
  }
};

void writeMigration();
