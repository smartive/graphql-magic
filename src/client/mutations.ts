import CodeBlockWriter from 'code-block-writer';
import upperCase from 'lodash/upperCase';
import { isRootModel, not } from '..';
import { Models } from '../models/models';

export const constantCase = (str: string) => upperCase(str).replace(/ /g, '_');

export const generateMutations = (models: Models) => {
  const writer: CodeBlockWriter = new CodeBlockWriter['default']({
    useSingleQuote: true,
    indentNumberOfSpaces: 2,
  });

  writer.writeLine(`import { gql } from "graphql-request";`).blankLine();

  for (const { name, creatable, updatable, deletable } of models.entities.filter(not(isRootModel))) {
    if (creatable) {
      writer
        .writeLine(
          `export const CREATE_${constantCase(
            name
          )} = gql\`\n  mutation Create${name}Mutation($data: Create${name}!) {\n    mutated: create${name}(data: $data) { id }\n  }\n\`;`
        )
        .blankLine();
    }

    if (updatable) {
      writer
        .writeLine(
          `export const UPDATE_${constantCase(
            name
          )} = gql\`\n  mutation Update${name}Mutation($id: ID!, $data: Update${name}!) {\n    mutated: update${name}(where: { id: $id }, data: $data) { id }\n  }\n\`;`
        )
        .blankLine();
    }

    if (deletable) {
      writer
        .writeLine(
          `export const DELETE_${constantCase(
            name
          )} = gql\`\n  mutation Delete${name}Mutation($id: ID!) {\n    mutated: delete${name}(where: { id: $id })\n  }\n\`;`
        )
        .blankLine();

      writer
        .writeLine(
          `export const RESTORE_${constantCase(
            name
          )} = gql\`\n  mutation Restore${name}Mutation($id: ID!) {\n    mutated: restore${name}(where: { id: $id })\n  }\n\`;`
        )
        .blankLine();
    }
  }

  writer
    .blankLine()
    .write(`export const MUTATIONS = `)
    .inlineBlock(() => {
      for (const model of models.entities.filter(not(isRootModel))) {
        writer
          .write(`${model.name}: `)
          .inlineBlock(() => {
            if (model.creatable) {
              writer.writeLine(`create: CREATE_${constantCase(model.name)},`);
            }

            if (model.updatable) {
              writer.writeLine(`update: UPDATE_${constantCase(model.name)},`);
            }

            if (model.deletable) {
              writer.writeLine(`delete: DELETE_${constantCase(model.name)},`);
              writer.writeLine(`restore: RESTORE_${constantCase(model.name)},`);
            }
          })
          .write(',')
          .blankLine();
      }
    })
    .write(';')
    .blankLine();

  return writer.toString();
};
