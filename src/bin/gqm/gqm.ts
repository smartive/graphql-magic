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
import { DateLibrary } from '../../utils/dates';
import { generateGraphqlApiTypes, generateGraphqlClientTypes } from './codegen';
import { parseKnexfile } from './parse-knexfile';
import { parseModels } from './parse-models';
import { readLine } from './readline';
import { getSetting, writeToFile } from './settings';

config({
  path: '.env',
});
config({
  path: '.env.local',
});

program.description('The graphql-magic cli.');

program
  .command('generate')
  .description('Generate all the things')
  .action(async () => {
    await getSetting('knexfilePath');
    const models = await parseModels();
    const generatedFolderPath = await getSetting('generatedFolderPath');
    const gqmModule = await getSetting('gqmModule');
    writeToFile(`${generatedFolderPath}/schema.graphql`, printSchemaFromModels(models));
    writeToFile(`${generatedFolderPath}/client/mutations.ts`, generateMutations(models, gqmModule));
    const dateLibrary = (await getSetting('dateLibrary')) as DateLibrary;
    writeToFile(`${generatedFolderPath}/db/index.ts`, generateDBModels(models, dateLibrary));
    writeToFile(`${generatedFolderPath}/db/knex.ts`, generateKnexTables(models));
    await generateGraphqlApiTypes(dateLibrary);
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
