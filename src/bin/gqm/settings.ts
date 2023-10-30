import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { dirname } from 'path';
import { readLine } from './readline';
import { EMPTY_MODELS } from './templates';

const SETTINGS_PATH = '.gqmrc.json';

const DEFAULTS = {
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
      ensureDirectoryExists(path);
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

const ensureDirectoryExists = (dir: string) => {
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
