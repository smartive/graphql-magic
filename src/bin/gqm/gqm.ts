#!/usr/bin/env node

import { readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { program } from 'commander';
import { config } from 'dotenv';
import knex from 'knex';
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
import { parsePermissionsConfig } from './parse-permissions-config';
import { parseScopes } from './parse-scopes';
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

// Read the current branch by inspecting `.git/HEAD` directly, so the CLI does
// not depend on the `git` binary being on PATH (or on a JS git wrapper).
// Handles both regular checkouts (`.git/` is a directory) and linked worktrees
// (`.git` is a file containing `gitdir: <path>`). Returns undefined on detached
// HEAD, missing repo, or anything unparseable — the caller falls back to a
// readline prompt.
const readCurrentBranch = (): string | undefined => {
  try {
    let gitDir = '.git';
    if (statSync(gitDir).isFile()) {
      const pointer = readFileSync(gitDir, 'utf8').trim();
      const match = /^gitdir:\s*(.+)$/.exec(pointer);
      if (!match) {
        return undefined;
      }
      gitDir = match[1];
    }
    const head = readFileSync(join(gitDir, 'HEAD'), 'utf8').trim();
    const match = /^ref:\s*refs\/heads\/(.+)$/.exec(head);

    return match ? match[1] : undefined;
  } catch {
    return undefined;
  }
};

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
    if (!name) {
      const branch = readCurrentBranch();
      if (branch) {
        name = branch.split('/').pop();
      }
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
      const scopes = await parseScopes();
      const permissionsConfig = await parsePermissionsConfig();
      const migrations = await new MigrationGenerator(db, models, parsedFunctions, scopes, permissionsConfig).generate();

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
      const scopes = await parseScopes();
      const permissionsConfig = await parsePermissionsConfig();
      const mg = new MigrationGenerator(db, models, parsedFunctions, scopes, permissionsConfig);
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
      const parsedFunctions = parseFunctionsFile(functionsPath);
      await updateFunctions(db, parsedFunctions);
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
