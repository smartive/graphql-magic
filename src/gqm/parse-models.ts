import { IndentationText, Project } from 'ts-morph';
import { getSetting, getSettings, writeToFile } from './settings';
import { staticEval } from './static-eval';
import { findDeclarationInFile } from './utils';

export const parseModels = async () => {
  const settings = await getSettings();

  const project = new Project({
    manipulationSettings: {
      indentationText: IndentationText.TwoSpaces,
    },
  });
  const sourceFile = project.addSourceFileAtPath(settings.modelsPath);

  const modelsDeclaration = findDeclarationInFile(sourceFile, 'rawModels');

  const rawModels = staticEval(modelsDeclaration, {});

  const generatedFolderPath = await getSetting('generatedFolderPath');
  writeToFile(`${generatedFolderPath}/models.json`, JSON.stringify(rawModels, null, 2));

  return rawModels;
};
