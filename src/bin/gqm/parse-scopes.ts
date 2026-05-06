import { existsSync } from 'fs';
import { IndentationText, Project } from 'ts-morph';
import { ScopesConfig } from '../../permissions/scopes';
import { getSetting } from './settings';
import { staticEval } from './static-eval';
import { findDeclarationInFile } from './utils';

/**
 * Parse the optional scopes config file declared by `scopesPath` in
 * `.gqmrc.json`. Returns `{}` if the file does not exist or does not
 * export a `scopes` declaration.
 */
export const parseScopes = async (): Promise<ScopesConfig> => {
  const scopesPath = await getSetting('scopesPath');

  if (!existsSync(scopesPath)) {
    return {};
  }

  const project = new Project({
    manipulationSettings: {
      indentationText: IndentationText.TwoSpaces,
    },
  });
  const sourceFile = project.addSourceFileAtPath(scopesPath);

  let declaration;
  try {
    declaration = findDeclarationInFile(sourceFile, 'scopes');
  } catch {
    // No `scopes` export — treat as empty (file may exist but be unused).
    return {};
  }

  return staticEval(declaration, {}) as ScopesConfig;
};
