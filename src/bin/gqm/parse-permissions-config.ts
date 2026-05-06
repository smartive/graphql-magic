import { existsSync } from 'fs';
import { IndentationText, Project } from 'ts-morph';
import { PermissionsConfig } from '../../permissions/generate';
import { getSetting } from './settings';
import { staticEval } from './static-eval';
import { findDeclarationInFile } from './utils';

/**
 * Parse the file referenced by `permissionsConfigPath` (default
 * `'src/config/permissions/index.ts'`) and return its top-level
 * `permissionsConfig` declaration. Returns `undefined` if the file or
 * the declaration is missing — e.g., when scope-derivation isn't needed.
 */
export const parsePermissionsConfig = async (): Promise<PermissionsConfig | undefined> => {
  const permissionsConfigPath = await getSetting('permissionsConfigPath');

  if (!existsSync(permissionsConfigPath)) {
    return undefined;
  }

  const project = new Project({
    manipulationSettings: {
      indentationText: IndentationText.TwoSpaces,
    },
  });
  const sourceFile = project.addSourceFileAtPath(permissionsConfigPath);

  let declaration;
  try {
    declaration = findDeclarationInFile(sourceFile, 'permissionsConfig');
  } catch {
    return undefined;
  }

  return staticEval(declaration, {}) as PermissionsConfig;
};
