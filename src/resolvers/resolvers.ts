import { Models } from '../models/models';
import { getModelPluralField, merge, typeToField } from '../models/utils';
import { mutationResolver } from './mutations';
import { queryResolver } from './resolver';

export const getResolvers = (models: Models) => ({
  Query: merge([
    {
      me: queryResolver,
    },
    ...models
      .filter(({ queriable }) => queriable)
      .map((model) => ({
        [typeToField(model.name)]: queryResolver,
      })),
    ...models
      .filter(({ listQueriable }) => listQueriable)
      .map((model) => ({
        [getModelPluralField(model)]: queryResolver,
      })),
  ]),
  Mutation: merge<unknown>([
    ...models
      .filter(({ creatable }) => creatable)
      .map((model) => ({
        [`create${model.name}`]: mutationResolver,
      })),
    ...models
      .filter(({ updatable }) => updatable)
      .map((model) => ({
        [`update${model.name}`]: mutationResolver,
      })),
    ...models
      .filter(({ deletable }) => deletable)
      .map((model) => ({
        [`delete${model.name}`]: mutationResolver,
        [`restore${model.name}`]: mutationResolver,
      })),
  ]),
});
