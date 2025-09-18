import { ManyToManyRelation } from '..';
import { EntityModel, Model, Models, Relation } from '../models/models';
import {
  and,
  getActionableRelations,
  isQueriableBy,
  isRelation,
  isSimpleField,
  isUpdatableBy,
  not,
  typeToField,
} from '../models/utils';

export const getUpdateEntityQuery = (
  model: EntityModel,
  role: string,
  fields?: string[],
  additionalFields = '',
) => `query Update${model.name}Fields ($id: ID!) {
  data: ${typeToField(model.name)}(where: { id: $id }) {
    id
    ${model.fields
      .filter(({ name }) => !fields || fields.includes(name))
      .filter(not(isRelation))
      .filter(isUpdatableBy(role))
      .map(({ name }) => name)
      .join(' ')}
    ${getActionableRelations(model, 'update')
      .filter((name) => !fields || fields.includes(name))
      .map((name) => `${name} { id, display: ${model.getRelation(name).targetModel.displayField || 'id'} }`)}
    ${additionalFields}
  }
}`;

export type RelationConstraints = Record<string, (source: any) => any>;

export const fieldIsSearchable = (model: EntityModel, fieldName: string) => {
  const relation = model.getRelation(fieldName);
  const targetModel = relation.targetModel;
  const displayField = targetModel.getField(targetModel.displayField || 'id');

  return displayField.searchable;
};

export const getManyToManyRelationsQuery = (
  model: Model,
  action: 'create' | 'update',
  manyToManyRelations: ManyToManyRelation[],
) =>
  !!manyToManyRelations.length &&
  (action === 'update'
    ? `query Update${model.name}ManyToManyRelations($id: ID!) {
            ${typeToField(model.name)}(where: { id: $id }) {
              ${manyToManyRelations
                .map((relation) => {
                  return `${relation.name} {
                    id
                    ${relation.relationToTarget.name} {
                      id
                    }
                  }`;
                })
                .join(' ')}
            }
            ${manyToManyRelations
              .map((relation) => {
                return `${relation.name}: ${relation.targetModel.pluralField} {
                  id
                  ${relation.targetModel.displayField || ''}
                }`;
              })
              .join(' ')}
          }`
    : `query Create${model.name}ManyToManyRelations {
            ${manyToManyRelations
              .map((relation) => {
                return `${relation.name}: ${relation.targetModel.pluralField} {
                  id
                  ${relation.targetModel.displayField || ''}
                }`;
              })
              .join(' ')}
          }`);

export type MutationQuery = {
  mutated: {
    id: string;
  };
};

export const getMutationQuery = (model: Model, action: 'create' | 'update' | 'delete') =>
  action === 'create'
    ? `
        mutation Create${model.name} ($data: Create${model.name}!) {
          mutated: create${model.name}(data: $data) {
            id
          }
        }
        `
    : action === 'update'
      ? `
        mutation Update${model.name} ($id: ID!, $data: Update${model.name}!) {
          mutated: update${model.name}(where: { id: $id } data: $data) {
            id
          }
        }
        `
      : `
        mutation Delete${model.name} ($id: ID!) {
          mutated: delete${model.name}(where: { id: $id }) {
            id
          }
        }
        `;

export const displayField = (model: EntityModel) => `
${model.displayField ? `display: ${model.displayField}` : ''}
`;

export const getFindEntityQuery = (model: EntityModel, role: string) => `query Find${model.name}($where: ${
  model.name
}Where!, $orderBy: [${model.name}OrderBy!]) {
  data: ${model.pluralField}(limit: 1, where: $where, orderBy: $orderBy) {
    ${model.fields.filter(and(isSimpleField, isQueriableBy(role))).map(({ name }) => name)}
  }
}`;

export const queryRelations = (models: Models, relations: Relation[]) =>
  relations
    .map(
      (relation): string => `${relation.name} {
          id
          ${displayField(relation.targetModel)}
        }`,
    )
    .join('\n');
