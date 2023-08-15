import upperFirst from 'lodash/upperFirst';
import {
  actionableRelations,
  and,
  isQueriableBy,
  isRelation,
  isSimpleField,
  isToOneRelation,
  isUpdatableBy,
  isVisibleRelation,
  Model,
  Models,
  not,
  Relation,
  ReverseRelation,
  VisibleRelationsByRole,
} from '../models';
import { getModelPlural, getModelPluralField, summonByName, typeToField } from '../utils';

export const getUpdateEntityQuery = (
  model: Model,
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
    ${actionableRelations(model, 'update')
      .filter(({ name }) => !fields || fields.includes(name))
      .map(({ name }) => `${name} { id }`)}
    ${additionalFields}
  }
}`;

export const getEditEntityRelationsQuery = (
  models: Models,
  model: Model,
  action: 'create' | 'update' | 'filter',
  fields?: string[],
  ignoreFields?: string[],
  additionalFields: Record<string, string> = {}
) => {
  const relations = actionableRelations(model, action).filter(
    ({ name }) => (!fields || fields.includes(name)) && (!ignoreFields || !ignoreFields.includes(name))
  );

  return (
    !!relations.length &&
    `query ${upperFirst(action)}${model.name}Relations {
      ${relations
        .map(({ name, type }) => {
          const model = summonByName(models, type);

          let filters = '';
          if (model.displayField) {
            const displayField = model.fieldsByName[model.displayField];
            if (displayField.orderable) {
              filters = `(orderBy: [{ ${model.displayField}: ASC }])`;
            }
          }

          return `${name}: ${getModelPluralField(model)}${filters} {
            id
            display: ${model.displayField || 'id'}
            ${additionalFields[name] || ''}
          }`;
        })
        .join(' ')}
    }`
  );
};

export const getManyToManyRelations = (model: Model, fields?: string[], ignoreFields?: string[]) => {
  const manyToManyRelations: [ReverseRelation, Relation][] = [];
  for (const field of model.reverseRelations) {
    if ((fields && !fields.includes(field.name)) || (ignoreFields && ignoreFields.includes(field.name))) {
      continue;
    }

    const relation = field.model.relations.find(
      (relation) => !relation.field.generated && relation.field.name !== field.field.name
    );
    if (!relation) {
      continue;
    }

    const inapplicableFields = field.model.fields.filter(
      (otherField) => !otherField.generated && ![field.field.name, relation.field.name].includes(otherField.name)
    );
    if (inapplicableFields.length) {
      continue;
    }

    manyToManyRelations.push([field, relation]);
  }
  return manyToManyRelations;
};

export const getManyToManyRelation = (model: Model, name: string) => getManyToManyRelations(model, [name])[0];

export const getManyToManyRelationsQuery = (
  model: Model,
  action: 'create' | 'update',
  manyToManyRelations: [ReverseRelation, Relation][]
) =>
  !!manyToManyRelations.length &&
  (action === 'update'
    ? `query Update${model.name}ManyToManyRelations($id: ID!) {
            ${typeToField(model.name)}(where: { id: $id }) {
              ${manyToManyRelations
                .map(([reverseRelation, { field }]) => {
                  return `${reverseRelation.name} {
                    id
                    ${field.name} {
                      id
                    }
                  }`;
                })
                .join(' ')}
            }
            ${manyToManyRelations
              .map(([reverseRelation, { model }]) => {
                return `${reverseRelation.name}: ${getModelPluralField(model)} {
                  id
                  ${model.displayField || ''}
                }`;
              })
              .join(' ')}
          }`
    : `query Create${model.name}ManyToManyRelations {
            ${manyToManyRelations
              .map(([reverseRelation, { model }]) => {
                return `${reverseRelation.name}: ${getModelPluralField(model)} {
                  id
                  ${model.displayField || ''}
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

export const displayField = (model: Model) => `
${model.displayField ? `display: ${model.displayField}` : ''}
`;

export const getEntityListQuery = (
  model: Model,
  role: string,
  additionalFields = '',
  root?: {
    model: Model;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    entity: any;
    reverseRelationName: string;
  }
) => `query ${getModelPlural(model)}List(
  ${root ? '$id: ID!,' : ''}
  $limit: Int!,
  $where: ${model.name}Where!,
  ${model.fields.some(({ searchable }) => searchable) ? '$search: String,' : ''}
) {
  ${root ? `root: ${typeToField(root.model.name)}(where: { id: $id }) {` : ''}
    data: ${root ? root.reverseRelationName : getModelPluralField(model)}(limit: $limit, where: $where, ${
  model.fields.some(({ searchable }) => searchable) ? ', search: $search' : ''
}) {
      ${displayField(model)}
      ${model.fields.filter(and(isSimpleField, isQueriableBy(role))).map(({ name }) => name)}
      ${additionalFields}
    }
  ${root ? '}' : ''}
}`;

export const getEntityQuery = (
  models: Models,
  model: Model,
  role: string,
  visibleRelationsByRole: VisibleRelationsByRole,
  typesWithSubRelations: string[]
) => `query Admin${model.name} ($id: ID!) {
  data: ${typeToField(model.name)}(where: { id: $id }) {
    ${displayField(model)}
    ${model.fields.filter(and(isSimpleField, isQueriableBy(role))).map(({ name }) => name)}
    ${queryRelations(
      models,
      model.fields.filter(and(isRelation, isVisibleRelation(visibleRelationsByRole, model.name, role))),
      role,
      typesWithSubRelations
    )}
    ${queryRelations(
      models,
      model.reverseRelations.filter(and(isToOneRelation, isVisibleRelation(visibleRelationsByRole, model.name, role))),
      role,
      typesWithSubRelations
    )}
  }
}`;

export const getFindEntityQuery = (model: Model, role: string) => `query Find${model.name}($where: ${
  model.name
}Where!, $orderBy: [${model.name}OrderBy!]) {
  data: ${getModelPluralField(model)}(limit: 1, where: $where, orderBy: $orderBy) {
    ${model.fields.filter(and(isSimpleField, isQueriableBy(role))).map(({ name }) => name)}
  }
}`;

export const queryRelations = (
  models: Models,
  relations: { name: string; type: string }[],
  role: string,
  typesWithSubRelations: string[]
) =>
  relations
    .map(({ name, type }): string => {
      const relatedModel = summonByName(models, type);
      const subRelations = typesWithSubRelations.includes(type) ? relatedModel.fields.filter(isRelation) : [];

      return `${name} {
          id
          ${displayField(relatedModel)}
          ${subRelations.length > 0 ? queryRelations(models, subRelations, role, typesWithSubRelations) : ''}
        }`;
    })
    .join('\n');
