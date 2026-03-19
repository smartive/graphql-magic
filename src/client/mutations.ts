import upperCase from 'lodash/upperCase';
import { Field } from '../schema/utils';
import { isRootModel, not } from '..';
import { Models } from '../models/models';

const constantCase = (str: string) => upperCase(str).replace(/ /g, '_');

const argTypeStr = (field: Field) => {
  const base = field.list ? `[${field.type}!]` : field.type;

  return field.nonNull ? `${base}!` : base;
};

const argsToVariables = (args: readonly Field[]) => args.map((a) => `$${a.name}: ${argTypeStr(a)}`).join(', ');

const argsToMutationArgs = (args: readonly Field[]) => args.map((a) => `${a.name}: $${a.name}`).join(', ');

export const generateMutations = (models: Models) => {
  const parts: string[] = [];
  for (const { name, creatable, updatable, deletable } of models.entities.filter(not(isRootModel))) {
    if (creatable) {
      const extraArgs = creatable !== true && creatable.args ? creatable.args : [];
      const variables = extraArgs.length ? `$data: Create${name}!, ${argsToVariables(extraArgs)}` : `$data: Create${name}!`;
      const mutationArgs = extraArgs.length ? `data: $data, ${argsToMutationArgs(extraArgs)}` : `data: $data`;
      parts.push(
        `export const CREATE_${constantCase(
          name,
        )} = gql\`\n  mutation Create${name}Mutation(${variables}) {\n    create${name}(${mutationArgs}) { id }\n  }\n\`;`,
      );
    }

    if (updatable) {
      const extraArgs = updatable !== true && updatable.args ? updatable.args : [];
      const variables = extraArgs.length
        ? `$id: ID!, $data: Update${name}!, ${argsToVariables(extraArgs)}`
        : `$id: ID!, $data: Update${name}!`;
      const mutationArgs = extraArgs.length
        ? `where: { id: $id }, data: $data, ${argsToMutationArgs(extraArgs)}`
        : `where: { id: $id }, data: $data`;
      parts.push(
        `export const UPDATE_${constantCase(
          name,
        )} = gql\`\n  mutation Update${name}Mutation(${variables}) {\n    update${name}(${mutationArgs}) { id }\n  }\n\`;`,
      );
    }

    if (deletable) {
      const deleteExtraArgs = deletable !== true && deletable.args ? deletable.args : [];
      const deleteVariables = deleteExtraArgs.length ? `$id: ID!, ${argsToVariables(deleteExtraArgs)}` : `$id: ID!`;
      const deleteMutationArgs = deleteExtraArgs.length
        ? `where: { id: $id }, ${argsToMutationArgs(deleteExtraArgs)}`
        : `where: { id: $id }`;
      parts.push(
        `export const DELETE_${constantCase(
          name,
        )} = gql\`\n  mutation Delete${name}Mutation(${deleteVariables}) {\n    delete${name}(${deleteMutationArgs})\n  }\n\`;`,
      );

      const restoreExtraArgs = deletable !== true && deletable.restoreArgs ? deletable.restoreArgs : [];
      const restoreVariables = restoreExtraArgs.length ? `$id: ID!, ${argsToVariables(restoreExtraArgs)}` : `$id: ID!`;
      const restoreMutationArgs = restoreExtraArgs.length
        ? `where: { id: $id }, ${argsToMutationArgs(restoreExtraArgs)}`
        : `where: { id: $id }`;
      parts.push(
        `export const RESTORE_${constantCase(
          name,
        )} = gql\`\n  mutation Restore${name}Mutation(${restoreVariables}) {\n    restore${name}(${restoreMutationArgs})\n  }\n\`;`,
      );
    }
  }

  return `import { gql } from "./gql";\n\n${parts.join('\n\n')}`;
};
