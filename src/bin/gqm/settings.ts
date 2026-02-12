import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { dirname } from 'path';
import { DateLibrary } from '../../utils/dates';
import { readLine } from './readline';
import {
  EMPTY_MODELS,
  EXECUTE,
  GET_ME,
  GITIGNORE,
  KNEXFILE,
  KNEXFILE_DAYJS_TYPE_PARSERS,
  KNEXFILE_LUXON_TYPE_PARSERS,
} from './templates';

const SETTINGS_PATH = '.gqmrc.json';

const DEFAULT_ENV = {
  DATABASE_HOST: 'localhost',
  DATABASE_NAME: 'postgres',
  DATABASE_USER: 'postgres',
  DATABASE_PASSWORD: 'password',
};

const DEFAULTS = {
  knexfilePath: {
    question: 'What is the knexfile path?',
    defaultValue: 'knexfile.ts',
    init: (path: string) => {
      for (const [name, value] of Object.entries(DEFAULT_ENV)) {
        ensureFileContains('.env', `${name}=`, `${name}=${value}\n`);
      }
      ensureFileExists(path, KNEXFILE);
    },
  },
  modelsPath: {
    question: 'What is the models path?',
    defaultValue: 'src/config/models.ts',
    init: (path: string) => {
      ensureFileExists(path, EMPTY_MODELS);
    },
  },
  functionsPath: {
    question: 'What is the PostgreSQL functions file path?',
    defaultValue: 'src/config/functions.ts',
    init: (path: string) => {
      ensureFileExists(path, `export const functions: string[] = [];\n`);
    },
  },
  generatedFolderPath: {
    question: 'What is the path for generated stuff?',
    defaultValue: 'src/generated',
    init: (path: string) => {
      ensureFileContains('.gitignore', GITIGNORE(path));
      ensureFileExists(`${path}/.gitkeep`, '');
      ensureFileExists(`${path}/db/.gitkeep`, '');
      ensureFileExists(`${path}/api/.gitkeep`, '');
      ensureFileExists(`${path}/client/.gitkeep`, '');
    },
  },
  graphqlQueriesPath: {
    question: 'Where to put graphql code?',
    defaultValue: 'src/graphql',
    init: (path: string) => {
      ensureFileExists(`${path}/client/queries/get-me.ts`, GET_ME);
      ensureFileExists(`${path}/execute.ts`, EXECUTE);
    },
  },
  resolversPath: {
    question: 'Where to generate concrete resolvers?',
    defaultValue: 'src/generated/resolvers',
    init: () => {
      // Do nothing
    },
  },
  gqmModule: {
    defaultValue: '@smartive/graphql-magic',
  },
  dateLibrary: {
    question: 'Which date library to use (dayjs|luxon)?',
    defaultValue: 'dayjs',
    init: async (dateLibrary: DateLibrary) => {
      const knexfilePath = await getSetting('knexfilePath');
      switch (dateLibrary) {
        case 'luxon': {
          const timeZone = await getSetting('timeZone');
          ensureFileContains(knexfilePath, 'luxon', KNEXFILE_LUXON_TYPE_PARSERS(timeZone));
          break;
        }
        case 'dayjs':
          ensureFileContains(knexfilePath, 'dayjs', KNEXFILE_DAYJS_TYPE_PARSERS);
          break;
        default:
          throw new Error('Invalid or unsupported date library.');
      }
    },
  },
  timeZone: {
    question: 'Which time zone to use?',
    defaultValue: 'Europe/Zurich',
    init: () => {
      // Do nothing
    },
  },
};

type Settings = {
  [key in keyof typeof DEFAULTS]: string;
};

const initSetting = async (name: string) => {
  const { question, defaultValue, init } = DEFAULTS[name];
  const value = (await readLine(`${question} (${defaultValue})`)) || defaultValue;
  await init(value);
  return value;
};

const initSettings = async () => {
  const settings: Settings = {} as Settings;
  for (const [name, config] of Object.entries(DEFAULTS)) {
    if ('queston' in config) {
      settings[name] = await initSetting(name);
    }
  }
  saveSettings(settings);
};

const saveSettings = (settings: Settings) => {
  writeToFile(SETTINGS_PATH, JSON.stringify(settings, null, 2) + '\n');
};

export const getSettings = async (): Promise<Settings> => {
  if (!existsSync(SETTINGS_PATH)) {
    await initSettings();
  }
  return JSON.parse(readFileSync(SETTINGS_PATH, 'utf8'));
};

export const getSetting = async (name: keyof Settings): Promise<string> => {
  const settings = await getSettings();
  if (!(name in settings)) {
    if ('question' in DEFAULTS[name]) {
      settings[name] = await initSetting(name);
      saveSettings(settings);
    } else {
      return DEFAULTS[name].defaultValue;
    }
  }
  return settings[name];
};

export const ensureDirectoryExists = (dir: string) => {
  if (existsSync(dir)) {
    return true;
  }

  ensureDirectoryExists(dirname(dir));

  try {
    console.info(`Creating directory ${dir}`);
    mkdirSync(dir);
    return true;
  } catch (err) {
    if (err.code === 'EEXIST') {
      return true;
    }
    throw err;
  }
};

export const ensureFileExists = (filePath: string, content: string) => {
  if (!existsSync(filePath)) {
    console.info(`Creating ${filePath}`);
    ensureDirectoryExists(dirname(filePath));
    writeFileSync(filePath, content);
  }
};

export const ensureFileContains = (filePath: string, content: string, fallback?: string) => {
  ensureFileExists(filePath, '');
  const fileContent = readFileSync(filePath, 'utf-8');
  if (!fileContent.includes(content)) {
    writeFileSync(filePath, fileContent + (fallback ?? content));
  }
};

export const writeToFile = (filePath: string, content: string) => {
  ensureDirectoryExists(dirname(filePath));
  if (existsSync(filePath)) {
    const currentContent = readFileSync(filePath, 'utf-8');
    if (content === currentContent) {
      // console.info(`${filePath} unchanged`);
    } else {
      writeFileSync(filePath, content);
      console.info(`${filePath} updated`);
    }
  } else {
    writeFileSync(filePath, content);
    console.info(`Created ${filePath}`);
  }
};
