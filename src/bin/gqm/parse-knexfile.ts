import { IndentationText, Project } from 'ts-morph';
import { ensureFileExists, getSetting } from './settings';
import { staticEval } from './static-eval';
import { KNEXFILE } from './templates';
import { findDeclarationInFile } from './utils';

export const parseKnexfile = async () => {
  const project = new Project({
    manipulationSettings: {
      indentationText: IndentationText.TwoSpaces,
    },
  });
  const knexfilePath = await getSetting('knexfilePath');
  ensureFileExists(knexfilePath, KNEXFILE);

  const sourceFile = project.addSourceFileAtPath(knexfilePath);
  const configDeclaration = findDeclarationInFile(sourceFile, 'knexConfig');
  const config = staticEval(configDeclaration, {});
  return config;
};
