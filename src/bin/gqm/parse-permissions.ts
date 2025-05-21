import { IndentationText, Project } from 'ts-morph';
import { PermissionsConfig } from '../..';
import { getSetting } from './settings';
import { staticEval } from './static-eval';
import { findDeclarationInFile } from './utils';

export const parsePermissions = async () => {
  const project = new Project({
    manipulationSettings: {
      indentationText: IndentationText.TwoSpaces,
    },
  });
  const permissionsPath = await getSetting('permissionsPath');
  const sourceFile = project.addSourceFileAtPath(permissionsPath);

  const permissionsDeclaration = findDeclarationInFile(sourceFile, 'permissionsConfig');

  return staticEval(permissionsDeclaration, {}) as PermissionsConfig;
};
