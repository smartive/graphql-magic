import upperCase from 'lodash/upperCase';
import { isRootModel, not } from '..';
import { Models } from '../models/models';

const constantCase = (str: string) => upperCase(str).replace(/ /g, '_');

export const generateMutations = (models: Models) => {
  const parts: string[] = [];
  for (const { name, creatable, updatable, deletable } of models.entities.filter(not(isRootModel))) {
    if (creatable) {
      parts.push(
        `export const CREATE_${constantCase(
          name,
        )} = gql\`\n  mutation Create${name}Mutation($data: Create${name}!) {\n    create${name}(data: $data) { id }\n  }\n\`;`,
      );
    }

    if (updatable) {
      parts.push(
        `export const UPDATE_${constantCase(
          name,
        )} = gql\`\n  mutation Update${name}Mutation($id: ID!, $data: Update${name}!) {\n    update${name}(where: { id: $id }, data: $data) { id }\n  }\n\`;`,
      );
    }

    if (deletable) {
      parts.push(
        `export const DELETE_${constantCase(
          name,
        )} = gql\`\n  mutation Delete${name}Mutation($id: ID!) {\n    delete${name}(where: { id: $id })\n  }\n\`;`,
      );

      parts.push(
        `export const RESTORE_${constantCase(
          name,
        )} = gql\`\n  mutation Restore${name}Mutation($id: ID!) {\n    restore${name}(where: { id: $id })\n  }\n\`;`,
      );
    }
  }

  return `import { gql } from "./gql";\n\n${parts.join('\n\n')}`;
};
