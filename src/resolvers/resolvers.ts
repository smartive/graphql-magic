import { GraphQLScalarType, Kind } from 'graphql';
import { Models } from '../models/models';
import { and, isCreatable, isRootModel, isUpdatable, merge, not, typeToField } from '../models/utils';
import { mutationResolver } from './mutations';
import { queryResolver } from './resolver';

const normalizeTimeToHHmmForSerialize = (value: unknown): string => {
  if (typeof value !== 'string') {
    throw new Error(`Time must be a string in HH:mm format. Received: ${typeof value}`);
  }

  // Postgres `time` columns may serialize to `HH:mm:ss`.
  // Be permissive here and just extract the leading `HH:mm`.
  const match = value.match(/^(\d{2}:\d{2})/);
  if (!match) {
    throw new Error(`Invalid Time value "${value}". Expected HH:mm.`);
  }

  return match[1];
};

const normalizeTimeToHHmmForParse = (value: unknown): string => {
  if (typeof value !== 'string') {
    throw new Error(`Time must be a string in HH:mm format. Received: ${typeof value}`);
  }

  // For input, we only accept time-without-timezone values.
  // Accept `HH:mm` and `HH:mm:ss[.fraction]`, but explicitly reject `Z` and `+/-HH:mm`.
  const match = value.match(/^(\d{2}):(\d{2})(?::\d{2}(?:\.\d+)?)?$/);
  if (!match) {
    throw new Error(`Invalid Time value "${value}". Expected HH:mm.`);
  }

  return `${match[1]}:${match[2]}`;
};

export const getResolvers = (models: Models) => {
  const resolvers: Record<string, any> = {
    Query: merge([
      {
        me: queryResolver,
      },
      ...models.entities
        .filter(({ queriable }) => queriable)
        .map((model) => ({
          [typeToField(model.name)]: queryResolver,
        })),
      ...models.entities
        .filter(({ listQueriable }) => listQueriable)
        .map((model) => ({
          [model.pluralField]: queryResolver,
        })),
      ...models.entities
        .filter(({ aggregatable }) => aggregatable)
        .map((model) => ({
          [`${model.pluralField}_AGGREGATE`]: queryResolver,
        })),
    ]),
    Time: new GraphQLScalarType({
      name: 'Time',
      description: 'Time without date and timezone (HH:mm)',
      serialize: (value) => (value == null ? value : normalizeTimeToHHmmForSerialize(value)),
      parseValue: (value) => normalizeTimeToHHmmForParse(value),
      parseLiteral: (ast) => {
        if (ast.kind !== Kind.STRING) {
          throw new Error(`Invalid literal for Time scalar. Expected STRING, got ${ast.kind}.`);
        }

        return normalizeTimeToHHmmForParse(ast.value);
      },
    }),
  };
  const mutations = [
    ...models.entities.filter(and(not(isRootModel), isCreatable)).map((model) => ({
      [`create${model.name}`]: mutationResolver,
    })),
    ...models.entities.filter(and(not(isRootModel), isUpdatable)).map((model) => ({
      [`update${model.name}`]: mutationResolver,
    })),
    ...models.entities
      .filter(not(isRootModel))
      .filter(({ deletable }) => deletable)
      .map((model) => ({
        [`delete${model.name}`]: mutationResolver,
        [`restore${model.name}`]: mutationResolver,
      })),
  ];

  if (mutations.length) {
    resolvers.Mutation = merge<unknown>(mutations);
  }

  for (const model of models.entities.filter(isRootModel)) {
    resolvers[model.name] = {
      __resolveType: ({ TYPE }) => TYPE,
    };
  }

  return resolvers;
};
