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
import { generateFunctionsFromDatabase } from '../../migrations/generate-functions';
import { updateFunctions } from '../../migrations/update-functions';
import { DateLibrary } from '../../utils/dates';
import { generateGraphqlApiTypes, generateGraphqlClientTypes } from './codegen';
import { parseFunctionsFile } from './parse-functions';
import { parseKnexfile } from './parse-knexfile';
import { parseModels } from './parse-models';
import { generatePermissionTypes } from './permissions';
import { readLine } from './readline';
import { getSetting, writeToFile } from './settings';

config({
  path: '.env',
  quiet: true,
});
config({
  path: '.env.local',
  quiet: true,
});

const gqlTagTemplate = `// This tag does nothing (just generates a string) - it is here for the tooling (syntax highlighting, formatting and type generation)
export const gql = (chunks: TemplateStringsArray, ...variables: (string | number | boolean)[]): string => {
  return chunks.reduce(
    (accumulator, chunk, index) => \`\${accumulator}\${chunk}\${index in variables ? variables[index] : ''}\`,
    '',
  );
};`;

program.description('The graphql-magic cli.');

program
  .command('generate')
  .description('Generate all the things')
  .action(async () => {
    await getSetting('knexfilePath');
    const models = await parseModels();
    const generatedFolderPath = await getSetting('generatedFolderPath');
    writeToFile(`${generatedFolderPath}/schema.graphql`, printSchemaFromModels(models));
    writeToFile(`${generatedFolderPath}/client/mutations.ts`, generateMutations(models));
    writeToFile(`${generatedFolderPath}/client/gql.ts`, gqlTagTemplate);
    const dateLibrary = (await getSetting('dateLibrary')) as DateLibrary;
    writeToFile(`${generatedFolderPath}/db/index.ts`, generateDBModels(models, dateLibrary));
    writeToFile(`${generatedFolderPath}/db/knex.ts`, generateKnexTables(models));
    writeToFile(`${generatedFolderPath}/permissions.ts`, generatePermissionTypes(models));
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
      const functionsPath = await getSetting('functionsPath');
      const parsedFunctions = parseFunctionsFile(functionsPath);
      const migrations = await new MigrationGenerator(db, models, parsedFunctions).generate();

      writeToFile(`migrations/${date || getMigrationDate()}_${name}.ts`, migrations);
    } finally {
      await db.destroy();
    }
  });

program
  .command('check-needs-migration')
  .description('Check if a migration is needed')
  .action(async () => {
    const knexfile = await parseKnexfile();
    const db = knex(knexfile);

    try {
      const models = await parseModels();
      const functionsPath = await getSetting('functionsPath');
      const parsedFunctions = parseFunctionsFile(functionsPath);
      const mg = new MigrationGenerator(db, models, parsedFunctions);
      await mg.generate();

      if (mg.needsMigration) {
        console.error('Migration is needed.');
        process.exit(1);
      }
    } finally {
      await db.destroy();
    }
  });

program
  .command('generate-functions')
  .description('Generate functions.ts file from database')
  .action(async () => {
    const knexfile = await parseKnexfile();
    const db = knex(knexfile);

    try {
      const functionsPath = await getSetting('functionsPath');
      const functions = await generateFunctionsFromDatabase(db);
      writeToFile(functionsPath, functions);
    } finally {
      await db.destroy();
    }
  });

program
  .command('update-functions')
  .description('Update database functions from functions.ts file')
  .action(async () => {
    const knexfile = await parseKnexfile();
    const db = knex(knexfile);

    try {
      const functionsPath = await getSetting('functionsPath');
      await updateFunctions(db, functionsPath);
    } finally {
      await db.destroy();
    }
  });

program
  .command('*')
  .description('Invalid command')
  .action((command) => {
    console.error(`Invalid command: ${command}\nSee --help for a list of available commands.`);
    process.exit(1);
  });

// Parse the arguments
program.parse(process.argv);
