import { GraphQLScalarType, Kind } from 'graphql';
import { Models } from '../models/models';
import { and, isCreatable, isRootModel, isUpdatable, merge, not, typeToField } from '../models/utils';
import { parseTime, serializeTime } from '../utils/time';
import { mutationResolver } from './mutations';
import { queryResolver } from './resolver';

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
      serialize: (value) => (value == null ? value : serializeTime(value)),
      parseValue: (value) => parseTime(value),
      parseLiteral: (ast) => {
        if (ast.kind !== Kind.STRING) {
          throw new Error(`Invalid literal for Time scalar. Expected STRING, got ${ast.kind}.`);
        }

        return parseTime(ast.value);
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
