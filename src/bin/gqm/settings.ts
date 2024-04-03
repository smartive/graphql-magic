import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { dirname } from 'path';
import { readLine } from './readline';
import { EMPTY_MODELS, GET_ME, GITIGNORE, KNEXFILE } from './templates';

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
    question: 'Where to look for graphql queries?',
    defaultValue: 'src/graphql/client/queries',
    init: (path: string) => {
      ensureFileExists(`${path}/get-me.ts`, GET_ME);
    },
  },
  gqlModule: {
    defaultValue: '@smartive/graphql-magic',
  },
};

type Settings = {
  [key in keyof typeof DEFAULTS]: string;
};

const initSetting = async (name: string) => {
  const { question, defaultValue, init } = DEFAULTS[name];
  const value = (await readLine(`${question} (${defaultValue})`)) || defaultValue;
  init(value);
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
  writeToFile(SETTINGS_PATH, JSON.stringify(settings, null, 2));
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
  ensureFileExists(filePath, content);
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
