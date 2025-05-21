import { IndentationText, Project } from 'ts-morph';
import { constantCase, ManyToManyRelation, ReverseRelation } from '..';
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
  role: string,
  fields?: string[],
  additionalFields = '',
) => `query UpdateQuery${model.name}${role} ($id: ID!) {
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

/**
 * @deprecated Use Relation.searchable instead
 */
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
            relation.searchable ? `, $${relation.name}Search: String` : ''
          }`,
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

          if (relation.searchable) {
            filters += `, search: $${relation.name}Search`;
          }

          return `${relation.name}: ${relation.targetModel.pluralField}(where: $${relation.name}Where, limit: $${
            relation.name
          }Limit${filters}) {
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

/**
 * @deprecated Use MUTATIONS from mutations.ts instead
 */
export type MutationQuery = {
  mutated: {
    id: string;
  };
};

/**
 * @deprecated Use MUTATIONS from mutations.ts instead
 */
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

/**
 * @deprecated Use LIST_ queries from queries.ts instead
 */
export const getEntityListQuery = (
  model: EntityModel,
  role: string,
  relations?: string[],
  fragment = '',
  reverseRelation?: ReverseRelation,
) => `query ${model.plural}List${role}(
  ${reverseRelation ? '$id: ID!,' : ''}
  $limit: Int!,
  $where: ${model.name}Where!,
  ${model.fields.some(({ searchable }) => searchable) ? '$search: String,' : ''}
) {
  ${reverseRelation ? `root: ${typeToField(reverseRelation.sourceModel.name)}(where: { id: $id }) {` : ''}
    data: ${reverseRelation ? reverseRelation.name : model.pluralField}(limit: $limit, where: $where, ${
      model.fields.some(({ searchable }) => searchable) ? ', search: $search' : ''
    }) {
      ${displayField(model)}
      ${model.fields.filter(and(isSimpleField, isQueriableBy(role))).map(({ name }) => name)}
      ${fragment}
      ${queryRelations(
        model.models,
        model.relations.filter((relation) => !relations || relations.includes(relation.name)),
      )}
      ${fragment}
    }
  ${reverseRelation ? '}' : ''}
}`;

export const getEntityQuery = (model: EntityModel, role: string, relations?: string[], fragment = '') => `query Get${
  model.name
}Entity ($id: ID!) {
  data: ${typeToField(model.name)}(where: { id: $id }) {
    ${displayField(model)}
    ${model.fields.filter(and(isSimpleField, isQueriableBy(role))).map(({ name }) => name)}
    ${queryRelations(
      model.models,
      model.relations.filter((relation) => !relations || relations.includes(relation.name)),
    )}
    ${queryRelations(
      model.models,
      model.reverseRelations.filter(
        (reverseRelation) =>
          isToOneRelation(reverseRelation.field) && (!relations || relations.includes(reverseRelation.name)),
      ),
    )}
    ${fragment}
  }
}`;

/**
 * @deprecated Use FIND_ queries from queries.ts instead
 */
export const getFindEntityQuery = (model: EntityModel, role: string) => `query Find${model.name}${role}($where: ${
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

export const generateQueries = (models: Models) => {
  const project = new Project({
    manipulationSettings: {
      indentationText: IndentationText.TwoSpaces,
    },
  });

  const sourceFile = project.createSourceFile('temp.ts', '', { overwrite: true });
  sourceFile.addImportDeclaration({
    namedImports: ['gql'],
    moduleSpecifier: './gql',
  });

  const roles = models.getModel('Role', 'enum').values;

  for (const model of models.entities) {
    for (const role of roles) {
      if (model.queriable) {
        if (model.updatable) {
          sourceFile.addStatements(
            `export const UPDATE_QUERY_${constantCase(model.name)}_${role} = gql\`\n${getUpdateEntityQuery(model, role, ['id'], '')}\n\`;`,
          );
        }
      }

      if (model.listQueriable) {
        sourceFile.addStatements(
          `export const FIND_${constantCase(model.name)}_${role} = gql\`\n${getFindEntityQuery(model, role)}\n\`;`,
        );
        sourceFile.addStatements(
          `export const ${constantCase(model.name)}_LIST_${role} = gql\`\n${getEntityListQuery(model, role, ['id'], '')}\n\`;`,
        );
      }
    }
  }

  sourceFile.addStatements((writer) =>
    writer
      .write(`export const UPDATE_QUERIES = `)
      .block(() => {
        for (const model of models.entities) {
          if (model.updatable) {
            writer
              .write(`${model.name}: `)
              .block(() => {
                for (const role of roles) {
                  writer.write(`${role}: UPDATE_QUERY_${constantCase(model.name)}_${role},`).newLine();
                }
              })
              .write(',')
              .newLine();
          }
        }
      })
      .write(';')
      .newLine(),
  );

  sourceFile.addStatements((writer) =>
    writer
      .write(`export const FIND_QUERIES = `)
      .block(() => {
        for (const model of models.entities) {
          if (model.listQueriable) {
            writer
              .write(`${model.name}: `)
              .block(() => {
                for (const role of roles) {
                  writer.write(`${role}: FIND_${constantCase(model.name)}_${role},`).newLine();
                }
              })
              .write(',')
              .newLine();
          }
        }
      })
      .write(';')
      .newLine(),
  );

  return sourceFile.getFullText();
};
