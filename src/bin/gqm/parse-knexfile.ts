import { IndentationText, Project } from 'ts-morph';
import { ensureFileExists } from './settings';
import { staticEval } from './static-eval';
import { KNEXFILE } from './templates';
import { findDeclarationInFile } from './utils';

export const KNEXFILE_PATH = `knexfile.ts`;

export const parseKnexfile = async () => {
  const project = new Project({
    manipulationSettings: {
      indentationText: IndentationText.TwoSpaces,
    },
  });
  ensureFileExists(KNEXFILE_PATH, KNEXFILE);

  const sourceFile = project.addSourceFileAtPath(KNEXFILE_PATH);
  const configDeclaration = findDeclarationInFile(sourceFile, 'config');
  const config = staticEval(configDeclaration, {});
  return config;
};
