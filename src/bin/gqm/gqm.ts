#!/usr/bin/env node

import { program } from 'commander';
import { config } from 'dotenv';
import knex from 'knex';
import { simpleGit } from 'simple-git';
import {
  MigrationGenerator,
  generateDBModels,
  generateKnexTables,
  generateMutations,
  getMigrationDate,
  printSchemaFromModels,
} from '../..';
import { generateGraphqlApiTypes, generateGraphqlClientTypes } from './codegen';
import { KNEXFILE_PATH, parseKnexfile } from './parse-knexfile';
import { parseModels } from './parse-models';
import { readLine } from './readline';
import { ensureFileExists, getSetting, getSettings, writeToFile } from './settings';
import { KNEXFILE } from './templates';

config({
  path: '.env',
});
config({
  path: '.env.local',
});

program.description('The graphql-magic cli.');

program
  .command('setup')
  .description('Set up the project')
  .action(async () => {
    await getSettings();
    ensureFileExists(KNEXFILE_PATH, KNEXFILE);
  });

program
  .command('generate')
  .description('Generate all the things')
  .action(async () => {
    const models = await parseModels();
    const generatedFolderPath = await getSetting('generatedFolderPath');
    const gqlModule = await getSetting('gqlModule');
    writeToFile(`${generatedFolderPath}/schema.graphql`, printSchemaFromModels(models));
    writeToFile(`${generatedFolderPath}/client/mutations.ts`, generateMutations(models, gqlModule));
    writeToFile(`${generatedFolderPath}/db/index.ts`, generateDBModels(models));
    writeToFile(`${generatedFolderPath}/db/knex.ts`, generateKnexTables(models));
    await generateGraphqlApiTypes();
    await generateGraphqlClientTypes();
  });

program
  .command('generate-models')
  .description('Generate models.json')
  .action(async () => {
    await parseModels();
  });

program
  .command('generate-schema')
  .description('Generate schema')
  .action(async () => {
    const models = await parseModels();
    const generatedFolderPath = await getSetting('generatedFolderPath');
    writeToFile(`${generatedFolderPath}/schema.graphql`, printSchemaFromModels(models));
  });

program
  .command('generate-mutation-queries')
  .description('Generate mutation-queries')
  .action(async () => {
    const models = await parseModels();
    const generatedFolderPath = await getSetting('generatedFolderPath');
    const gqlModule = await getSetting('gqlModule');
    writeToFile(`${generatedFolderPath}/client/mutations.ts`, generateMutations(models, gqlModule));
  });

program
  .command('generate-db-types')
  .description('Generate DB types')
  .action(async () => {
    const models = await parseModels();
    const generatedFolderPath = await getSetting('generatedFolderPath');
    writeToFile(`${generatedFolderPath}/db/index.ts`, generateDBModels(models));
  });

program
  .command('generate-knex-types')
  .description('Generate Knex types')
  .action(async () => {
    const models = await parseModels();
    const generatedFolderPath = await getSetting('generatedFolderPath');
    writeToFile(`${generatedFolderPath}/db/knex.ts`, generateKnexTables(models));
  });

program
  .command('generate-graphql-api-types')
  .description('Generate Graphql API types')
  .action(async () => {
    await generateGraphqlApiTypes();
  });

program
  .command('generate-graphql-client-types')
  .description('Generate Graphql client types')
  .action(async () => {
    await generateGraphqlClientTypes();
  });

program
  .command('generate-migration [<name>] [<date>]')
  .description('Generate Migration')
  .action(async (name, date) => {
    const git = simpleGit();

    if (!name) {
      name = (await git.branch()).current.split('/').pop();
    }

    if (!name || ['main', 'staging', 'production'].includes(name)) {
      name = await readLine('Migration name:');
    }

    const knexfile = await parseKnexfile();
    const db = knex(knexfile);

    try {
      const models = await parseModels();
      const migrations = await new MigrationGenerator(db, models).generate();

      writeToFile(`migrations/${date || getMigrationDate()}_${name}.ts`, migrations);
    } finally {
      await db.destroy();
    }
  });

program
  .command('*', { noHelp: true })
  .description('Invalid command')
  .action(() => {
    console.error('Invalid command: %s\nSee --help for a list of available commands.', program.args.join(' '));
    process.exit(1);
  });

// Parse the arguments
program.parse(process.argv);
