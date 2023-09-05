import upperCase from 'lodash/upperCase';
import { isEntityModel } from '..';
import { RawModels } from '../models/models';

const constantCase = (str: string) => upperCase(str).replace(/ /g, '_');

export const generateMutations = (models: RawModels) => {
  const parts: string[] = [];
  for (const { name, creatable, updatable, deletable } of models.filter(isEntityModel)) {
    if (creatable) {
      parts.push(
        `export const CREATE_${constantCase(
          name
        )} = gql\`\n  mutation Create${name}Mutation($data: Create${name}!) {\n    create${name}(data: $data) { id }\n  }\n\`;`
      );
    }

    if (updatable) {
      parts.push(
        `export const UPDATE_${constantCase(
          name
        )} = gql\`\n  mutation Update${name}Mutation($id: ID!, $data: Update${name}!) {\n    update${name}(where: { id: $id }, data: $data) { id }\n  }\n\`;`
      );
    }

    if (deletable) {
      parts.push(
        `export const DELETE_${constantCase(
          name
        )} = gql\`\n  mutation Delete${name}Mutation($id: ID!) {\n    delete${name}(where: { id: $id })\n  }\n\`;`
      );
    }
  }

  return `import { gql } from "@smartive/graphql-magic";\n\n${parts.join('\n\n')}`;
};
