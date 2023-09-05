import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { dirname } from 'path';
import { readLine } from './readline';
import { CLIENT_CODEGEN, EMPTY_MODELS, GRAPHQL_CODEGEN } from './templates';

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
      ensureFileExists(`graphql-codegen.yml`, GRAPHQL_CODEGEN(path));
      ensureFileExists(`client-codegen.yml`, CLIENT_CODEGEN(path));
    },
  },
};

type Settings = {
  modelsPath: string;
  generatedFolderPath: string;
};

const initSetting = async (name: string) => {
  const { question, defaultValue, init } = DEFAULTS[name];
  const value = (await readLine(`${question} (${defaultValue})`)) || defaultValue;
  init(value);
  return value;
};

const initSettings = async () => {
  const settings: Settings = {} as Settings;
  for (const name of Object.keys(DEFAULTS)) {
    settings[name] = await initSetting(name);
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
    settings[name] = await initSetting(name);
    saveSettings(settings);
  }
  return settings[name];
};

const ensureDirectoryExists = (filePath: string) => {
  const dir = dirname(filePath);

  if (existsSync(dir)) {
    return true;
  }

  ensureDirectoryExists(dir);

  try {
    mkdirSync(dir);
    return true;
  } catch (err) {
    if (err.code === 'EEXIST') {
      return true;
    }
    throw err;
  }
};

const ensureFileExists = (filePath: string, content: string) => {
  if (!existsSync(filePath)) {
    console.info(`Creating ${filePath}`);
    ensureDirectoryExists(filePath);
    writeFileSync(filePath, content);
  }
};

export const writeToFile = (filePath: string, content: string) => {
  console.info(`Writing to ${filePath}`);
  ensureDirectoryExists(filePath);
  writeFileSync(filePath, content);
};
