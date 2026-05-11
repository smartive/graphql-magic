#!/usr/bin/env node

import { readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { parseArgs } from 'node:util';
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
import type { DateLibrary } from '../../utils/dates';
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
      if (!match) return undefined;
      gitDir = match[1];
    }
    const head = readFileSync(join(gitDir, 'HEAD'), 'utf8').trim();
    const match = /^ref:\s*refs\/heads\/(.+)$/.exec(head);
    return match ? match[1] : undefined;
  } catch {
    return undefined;
  }
};

type Command = {
  description: string;
  usage: string;
  run: (positionals: string[]) => Promise<void>;
};

const commands: Record<string, Command> = {
  generate: {
    description: 'Generate all the things',
    usage: 'gqm generate',
    run: async () => {
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
    },
  },
  'generate-migration': {
    description: 'Generate Migration',
    usage: 'gqm generate-migration [<name>] [<date>]',
    run: async (positionals) => {
      let [name, date] = positionals;

      if (!name) {
        name = readCurrentBranch()?.split('/').pop() ?? '';
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
    },
  },
  'check-needs-migration': {
    description: 'Check if a migration is needed',
    usage: 'gqm check-needs-migration',
    run: async () => {
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
    },
  },
  'generate-functions': {
    description: 'Generate functions.ts file from database',
    usage: 'gqm generate-functions',
    run: async () => {
      const knexfile = await parseKnexfile();
      const db = knex(knexfile);

      try {
        const functionsPath = await getSetting('functionsPath');
        const functions = await generateFunctionsFromDatabase(db);
        writeToFile(functionsPath, functions);
      } finally {
        await db.destroy();
      }
    },
  },
  'update-functions': {
    description: 'Update database functions from functions.ts file',
    usage: 'gqm update-functions',
    run: async () => {
      const knexfile = await parseKnexfile();
      const db = knex(knexfile);

      try {
        const functionsPath = await getSetting('functionsPath');
        const parsedFunctions = parseFunctionsFile(functionsPath);
        await updateFunctions(db, parsedFunctions);
      } finally {
        await db.destroy();
      }
    },
  },
};

const printHelp = (): void => {
  const names = Object.keys(commands);
  const pad = Math.max(...names.map((name) => name.length)) + 2;
  const lines = [
    'The graphql-magic cli.',
    '',
    'Usage: gqm <command> [arguments]',
    '',
    'Commands:',
    ...names.map((name) => `  ${name.padEnd(pad)}${commands[name].description}`),
    '',
    'Run `gqm <command> --help` for command details.',
  ];
  console.info(lines.join('\n'));
};

const printCommandHelp = (command: Command): void => {
  console.info(`${command.description}\n\nUsage: ${command.usage}`);
};

const main = async (): Promise<void> => {
  const [, , subcommand, ...rest] = process.argv;

  if (!subcommand || subcommand === '--help' || subcommand === '-h') {
    printHelp();
    return;
  }

  const command = commands[subcommand];
  if (!command) {
    console.error(`Invalid command: ${subcommand}\nSee --help for a list of available commands.`);
    process.exit(1);
  }

  const { values, positionals } = parseArgs({
    args: rest,
    options: {
      help: { type: 'boolean', short: 'h' },
    },
    allowPositionals: true,
  });

  if (values.help) {
    printCommandHelp(command);
    return;
  }

  await command.run(positionals);
};

void main();
