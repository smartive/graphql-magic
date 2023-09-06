import { IndentationText, Project } from 'ts-morph';
import { RawModels } from '../..';
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

  const modelsDeclaration = findDeclarationInFile(sourceFile, 'rawModels');

  const rawModels = staticEval(modelsDeclaration, {});

  const generatedFolderPath = await getSetting('generatedFolderPath');
  writeToFile(`${generatedFolderPath}/models.json`, JSON.stringify(rawModels, null, 2));

  return rawModels as RawModels;
};
