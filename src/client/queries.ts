import { ManyToManyRelation } from '..';
import { EntityModel, Model, Models, Relation } from '../models/models';
import { typeToField } from '../models/utils';

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

export const displayField = (model: EntityModel) => `
${model.displayField ? `display: ${model.displayField}` : ''}
`;

export const queryRelations = (models: Models, relations: Relation[]) =>
  relations
    .map(
      (relation): string => `${relation.name} {
          id
          ${displayField(relation.targetModel)}
        }`,
    )
    .join('\n');
