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
} from '..';
import { generateGraphqlApiTypes, generateGraphqlClientTypes } from '../gqm/codegen';
import { KNEXFILE_PATH, parseKnexfile } from '../gqm/parse-knexfile';
import { parseModels } from '../gqm/parse-models';
import { readLine } from '../gqm/readline';
import { ensureFileExists, getSetting, getSettings, writeToFile } from '../gqm/settings';
import { KNEXFILE } from '../gqm/templates';

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
    const rawModels = await parseModels();
    const generatedFolderPath = await getSetting('generatedFolderPath');
    writeToFile(`${generatedFolderPath}/schema.graphql`, printSchemaFromModels(rawModels));
    writeToFile(`${generatedFolderPath}/client/mutations.ts`, generateMutations(rawModels));
    writeToFile(`${generatedFolderPath}/db/index.ts`, generateDBModels(rawModels));
    writeToFile(`${generatedFolderPath}/db/knex.ts`, generateKnexTables(rawModels));
    await generateGraphqlApiTypes();
    await generateGraphqlClientTypes();
  });

program
  .command('generate-models')
  .description('Generate models.json')
  .action(async () => {
    const rawModels = await parseModels();
    const generatedFolderPath = await getSetting('generatedFolderPath');
    writeToFile(`${generatedFolderPath}/models.json`, JSON.stringify(rawModels, null, 2));
  });

program
  .command('generate-schema')
  .description('Generate schema')
  .action(async () => {
    const rawModels = await parseModels();
    const generatedFolderPath = await getSetting('generatedFolderPath');
    writeToFile(`${generatedFolderPath}/schema.graphql`, printSchemaFromModels(rawModels));
  });

program
  .command('generate-mutation-queries')
  .description('Generate mutation-queries')
  .action(async () => {
    const rawModels = await parseModels();
    const generatedFolderPath = await getSetting('generatedFolderPath');
    writeToFile(`${generatedFolderPath}/client/mutations.ts`, generateMutations(rawModels));
  });

program
  .command('generate-db-types')
  .description('Generate DB types')
  .action(async () => {
    const rawModels = await parseModels();
    const generatedFolderPath = await getSetting('generatedFolderPath');
    writeToFile(`${generatedFolderPath}/db/index.ts`, generateMutations(rawModels));
  });

program
  .command('generate-knex-types')
  .description('Generate Knex types')
  .action(async () => {
    const rawModels = await parseModels();
    const generatedFolderPath = await getSetting('generatedFolderPath');
    writeToFile(`${generatedFolderPath}/db/knex.ts`, generateKnexTables(rawModels));
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
  .command('generate-migration')
  .description('Generate Migration')
  .action(async () => {
    const git = simpleGit();

    let name = process.argv[2] || (await git.branch()).current.split('/').pop();

    if (name && ['staging', 'production'].includes(name)) {
      name = await readLine('Migration name:');
    }

    const knexfile = await parseKnexfile();
    const db = knex(knexfile);

    try {
      const rawModels = await parseModels();
      const migrations = await new MigrationGenerator(db, rawModels).generate();

      writeToFile(`migrations/${getMigrationDate()}_${name}.ts`, migrations);
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
