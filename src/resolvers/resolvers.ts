import { Models } from '../models/models';
import { isRootModel, merge, not, typeToField } from '../models/utils';
import { mutationResolver } from './mutations';
import { queryResolver } from './resolver';

export const getResolvers = (models: Models) => ({
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
  ]),
  Mutation: merge<unknown>([
    ...models.entities
      .filter(not(isRootModel))
      .filter(({ creatable }) => creatable)
      .map((model) => ({
        [`create${model.name}`]: mutationResolver,
      })),
    ...models.entities
      .filter(not(isRootModel))
      .filter(({ updatable }) => updatable)
      .map((model) => ({
        [`update${model.name}`]: mutationResolver,
      })),
    ...models.entities
      .filter(not(isRootModel))
      .filter(({ deletable }) => deletable)
      .map((model) => ({
        [`delete${model.name}`]: mutationResolver,
        [`restore${model.name}`]: mutationResolver,
      })),
  ]),
  ...Object.assign(
    {},
    ...models.entities.filter(isRootModel).map((model) => ({
      [model.name]: {
        __resolveType: ({ TYPE }) => TYPE,
      },
    }))
  ),
});
