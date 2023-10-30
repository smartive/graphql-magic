import { IndentationText, Project } from 'ts-morph';
import { Models } from '../..';
import { getSetting, writeToFile } from './settings';
import { staticEval } from './static-eval';
import { findDeclarationInFile } from './utils';

export const parseModels = async () => {
  const project = new Project({
    manipulationSettings: {
      indentationText: IndentationText.TwoSpaces,
    },
  });
  const modelsPath = await getSetting('modelsPath');
  const sourceFile = project.addSourceFileAtPath(modelsPath);

  const modelsDeclaration = findDeclarationInFile(sourceFile, 'models');

  const models = staticEval(modelsDeclaration, {}) as Models;

  const generatedFolderPath = await getSetting('generatedFolderPath');
  writeToFile(`${generatedFolderPath}/models.json`, JSON.stringify(models.definitions, null, 2));

  return models;
};
