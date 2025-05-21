import upperCase from 'lodash/upperCase';
import { IndentationText, Project } from 'ts-morph';
import { isRootModel, not } from '..';
import { Models } from '../models/models';

const constantCase = (str: string) => upperCase(str).replace(/ /g, '_');

export const generateMutations = (models: Models) => {
  const project = new Project({
    manipulationSettings: {
      indentationText: IndentationText.TwoSpaces,
    },
  });

  const sourceFile = project.createSourceFile('temp.ts', '', { overwrite: true });
  sourceFile.addImportDeclaration({
    namedImports: ['gql'],
    moduleSpecifier: './gql',
  });

  for (const { name, creatable, updatable, deletable } of models.entities.filter(not(isRootModel))) {
    if (creatable) {
      sourceFile.addStatements(
        `export const CREATE_${constantCase(name)} = gql\`\n  mutation Create${name}Mutation($data: Create${name}!) {\n    create${name}(data: $data) { id }\n  }\n\`;`,
      );
    }

    if (updatable) {
      sourceFile.addStatements(
        `export const UPDATE_${constantCase(name)} = gql\`\n  mutation Update${name}Mutation($id: ID!, $data: Update${name}!) {\n    update${name}(where: { id: $id }, data: $data) { id }\n  }\n\`;`,
      );
    }

    if (deletable) {
      sourceFile.addStatements(
        `export const DELETE_${constantCase(name)} = gql\`\n  mutation Delete${name}Mutation($id: ID!) {\n    delete${name}(where: { id: $id })\n  }\n\`;`,
      );
      sourceFile.addStatements(
        `export const RESTORE_${constantCase(name)} = gql\`\n  mutation Restore${name}Mutation($id: ID!) {\n    restore${name}(where: { id: $id })\n  }\n\`;`,
      );
    }
  }

  sourceFile.addStatements((writer) => {
    writer.write(`export const MUTATIONS = `).block(() => {
      for (const { name, creatable, updatable, deletable } of models.entities
        .filter(not(isRootModel))
        .filter((model) => model.creatable || model.updatable || model.deletable)) {
        writer
          .write(`${name}: `)
          .block(() => {
            if (creatable) {
              writer.write(`create: CREATE_${constantCase(name)},`).newLine();
            }
            if (updatable) {
              writer.write(`update: UPDATE_${constantCase(name)},`).newLine();
            }
            if (deletable) {
              writer.write(`delete: DELETE_${constantCase(name)},`).newLine();
            }
          })
          .write(',')
          .newLine();
      }
    });
  });

  return sourceFile.getFullText();
};
