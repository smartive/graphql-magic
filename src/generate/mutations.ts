import { upperCase } from 'lodash';
import { Models } from '../models';

const constantCase = (str: string) => upperCase(str).replace(/ /g, '_');

export const generateMutations = (models: Models) => {
  const parts: string[] = [];
  for (const { name, creatable, updatable, deletable } of models) {
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

  return `import { gql } from "../../../lib/graphql-magic/gql";\n\n${parts.join('\n\n')}`;
};

export const generateHooks = (models: Models) => {
  const hooks: string[] = [];

  const indexImports: string[] = [];
  const mutationImports: string[] = [];

  for (const { name, creatable, updatable, deletable } of models) {
    if (!(creatable || updatable || deletable)) {
      continue;
    }

    if (creatable) {
      indexImports.push(`Create${name}Mutation`);
      mutationImports.push(`CREATE_${constantCase(name)}`);
      hooks.push(
        `export const useCreate${name} = () => useMutation<Create${name}Mutation.mutation, Create${name}Mutation.Variables>(CREATE_${constantCase(
          name
        )});`
      );
    }

    if (updatable) {
      indexImports.push(`Update${name}Mutation`);
      mutationImports.push(`UPDATE_${constantCase(name)}`);
      hooks.push(
        `export const useUpdate${name} = () => useMutation<Update${name}Mutation.mutation, Update${name}Mutation.Variables>(UPDATE_${constantCase(
          name
        )});`
      );
    }

    if (deletable) {
      indexImports.push(`Delete${name}Mutation`);
      mutationImports.push(`DELETE_${constantCase(name)}`);
      hooks.push(
        `export const useDelete${name} = () => useMutation<Delete${name}Mutation.mutation, Delete${name}Mutation.Variables>(DELETE_${constantCase(
          name
        )});`
      );
    }
  }

  return `import {useMutation} from "graphql-hooks"

import {
    ${indexImports.sort().join(',\n    ')}
} from "./index";

import {
    ${mutationImports.sort().join(',\n    ')}
} from "./mutations";

${hooks.sort().join('\n\n')}\n`;
};
