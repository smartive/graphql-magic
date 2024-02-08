import { ManyToManyRelation } from '..';
import { EntityModel, Model, Models, Relation } from '../models/models';
import {
  and,
  getActionableRelations,
  isQueriableBy,
  isRelation,
  isSimpleField,
  isToOneRelation,
  isUpdatableBy,
  not,
  typeToField,
} from '../models/utils';

export const getUpdateEntityQuery = (
  model: EntityModel,
  role: any,
  fields?: string[] | undefined,
  additionalFields = ''
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
      .map((name) => `${name} { id }`)}
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

export const getSelectEntityRelationsQuery = (model: EntityModel, relationNames: string[]) => {
  const relations = relationNames.map((name) => model.getRelation(name));

  return (
    !!relations.length &&
    `query Select${model.name}Relations(${relations
      .map(
        (relation) =>
          `$${relation.name}Where: ${relation.targetModel.name}Where, $${relation.name}Limit: Int${
            fieldIsSearchable(model, relation.name) ? `, $${relation.name}Search: String` : ''
          }`
      )
      .join(', ')}) {
      ${relations
        .map((relation) => {
          let filters = '';

          if (relation.targetModel.displayField) {
            const displayField = relation.targetModel.fieldsByName[relation.targetModel.displayField];
            if ('orderable' in displayField && displayField.orderable) {
              filters += `, orderBy: [{ ${relation.targetModel.displayField}: ASC }]`;
            }
          }

          if (fieldIsSearchable(model, relation.name)) {
            filters += `, search: $${relation.name}Search`;
          }

          return `${relation.name}: ${relation.targetModel.pluralField}(where: $${relation.name}Where, limit: $${
            relation.name
          }Limit, ${filters}) {
            id
            display: ${relation.targetModel.displayField || 'id'}
          }`;
        })
        .join(' ')}
    }`
  );
};

export const getManyToManyRelationsQuery = (
  model: Model,
  action: 'create' | 'update',
  manyToManyRelations: ManyToManyRelation[]
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

export const getEntityListQuery = (
  model: EntityModel,
  role: string,
  visibleRelationsByRole: VisibleRelationsByRole,
  typesWithSubRelations: string[],
  additionalFields = '',
  root?: {
    model: EntityModel;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    entity: any;
    reverseRelationName: string;
  }
) => `query ${model.plural}List(
  ${root ? '$id: ID!,' : ''}
  $limit: Int!,
  $where: ${model.name}Where!,
  ${model.relations.some(({ field: { searchable } }) => searchable) ? '$search: String,' : ''}
) {
  ${root ? `root: ${typeToField(root.model.name)}(where: { id: $id }) {` : ''}
    data: ${root ? root.reverseRelationName : model.pluralField}(limit: $limit, where: $where, ${
  model.relations.some(({ field: { searchable } }) => searchable) ? ', search: $search' : ''
}) {
      ${displayField(model)}
      ${model.fields.filter(and(isSimpleField, isQueriableBy(role))).map(({ name }) => name)}
      ${additionalFields}
      ${queryRelations(
        model.models,
        model.relations.filter(isVisibleRelation(visibleRelationsByRole, model.name, role)),
        role,
        typesWithSubRelations
      )}
      ${additionalFields}
    }
  ${root ? '}' : ''}
}`;

export type VisibleRelationsByRole = Record<string, Record<string, string[]>>;

export const isVisibleRelation = (visibleRelationsByRole: VisibleRelationsByRole, modelName: string, role: string) => {
  const whitelist = visibleRelationsByRole[role]?.[modelName];
  return (relation: Relation) => (whitelist ? whitelist.includes(relation.name) : true);
};

export const getEntityQuery = (
  model: EntityModel,
  role: string,
  visibleRelationsByRole: VisibleRelationsByRole,
  typesWithSubRelations: string[],
  additionalFields = ''
) => `query Get${model.name}Entity ($id: ID!) {
  data: ${typeToField(model.name)}(where: { id: $id }) {
    ${displayField(model)}
    ${model.fields.filter(and(isSimpleField, isQueriableBy(role))).map(({ name }) => name)}
    ${queryRelations(
      model.models,
      model.relations.filter(isVisibleRelation(visibleRelationsByRole, model.name, role)),
      role,
      typesWithSubRelations
    )}
    ${queryRelations(
      model.models,
      model.reverseRelations.filter(
        (reverseRelation) =>
          isToOneRelation(reverseRelation.field) &&
          isVisibleRelation(visibleRelationsByRole, model.name, role)(reverseRelation)
      ),
      role,
      typesWithSubRelations
    )}
    ${additionalFields}
  }
}`;

export const getFindEntityQuery = (model: EntityModel, role: string) => `query Find${model.name}($where: ${
  model.name
}Where!, $orderBy: [${model.name}OrderBy!]) {
  data: ${model.pluralField}(limit: 1, where: $where, orderBy: $orderBy) {
    ${model.fields.filter(and(isSimpleField, isQueriableBy(role))).map(({ name }) => name)}
  }
}`;

export const queryRelations = (models: Models, relations: Relation[], role: string, typesWithSubRelations: string[]) =>
  relations
    .map((relation): string => {
      const subRelations = typesWithSubRelations.includes(relation.targetModel.name) ? relation.targetModel.relations : [];

      return `${relation.name} {
          id
          ${displayField(relation.targetModel)}
          ${subRelations.length > 0 ? queryRelations(models, subRelations, role, typesWithSubRelations) : ''}
        }`;
    })
    .join('\n');
