import { DefinitionNode, DocumentNode, GraphQLSchema, buildASTSchema, print } from 'graphql';
import { Models } from '../models/models';
import {
  and,
  getAggregateFieldDefinitions,
  isCreatable,
  isQueriableField,
  isRootModel,
  isStoredInDatabase,
  isUpdatable,
  typeToField,
} from '../models/utils';
import { Field, document, enm, iface, input, object, scalar, union } from './utils';

export const generateDefinitions = ({
  scalars,
  rawEnums,
  enums,
  inputs,
  interfaces,
  entities,
  objects,
  unions,
}: Models): DefinitionNode[] => {
  const definitions = [
    // Predefined types
    ...rawEnums.map((model) => enm(model.name, model.values)),
    ...enums.map((model) => enm(model.name, model.values)),
    ...scalars.map((model) => scalar(model.name)),
    ...objects.filter(({ name }) => !['Query', 'Mutation'].includes(name)).map((model) => object(model.name, model.fields)),
    ...interfaces.map(({ name, fields }) => iface(name, fields)),
    ...inputs.map((model) => input(model.name, model.fields)),
    ...unions.map((model) => union(model.name, model.types)),
    ...objects
      .filter((model) =>
        entities.some((m) => m.creatable && m.fields.some((f) => f.creatable && f.kind === 'json' && f.type === model.name)),
      )
      .map((model) => input(`Create${model.name}`, model.fields)),
    ...objects
      .filter((model) =>
        entities.some((m) => m.updatable && m.fields.some((f) => f.updatable && f.kind === 'json' && f.type === model.name)),
      )
      .map((model) => input(`Update${model.name}`, model.fields)),

    ...entities.flatMap((model) => {
      const types: DefinitionNode[] = [
        (isRootModel(model) ? iface : object)(
          model.name,
          [
            ...model.fields.filter(isQueriableField).map((field) => ({
              ...field,
              type: field.type,
              args: [...(field.args || [])],
              directives: field.directives,
            })),
            ...model.reverseRelations.map(({ name, field, targetModel }) => ({
              name,
              type: targetModel.name,
              list: !field.toOne,
              nonNull: !field.toOne,
              args: [
                {
                  name: 'where',
                  type: `${targetModel.name}Where`,
                  nonNull: targetModel.fields.some(
                    ({ filterable }) => typeof filterable === 'object' && filterable.nonNull === true,
                  ),
                },
                ...(targetModel.fields.some(({ searchable }) => searchable) ? [{ name: 'search', type: 'String' }] : []),
                ...(targetModel.fields.some(({ orderable }) => orderable)
                  ? [{ name: 'orderBy', type: `${targetModel.name}OrderBy`, list: true }]
                  : []),
                { name: 'limit', type: 'Int' },
                { name: 'offset', type: 'Int' },
              ],
            })),
          ],
          [...(model.parent ? [model.parent] : []), ...(model.interfaces || [])],
        ),
        ...[false, true].map((isSubWhere) =>
          input(`${model.name}${isSubWhere ? 'Sub' : ''}Where`, [
            ...model.fields
              .filter(({ kind, unique, filterable }) => (unique || filterable) && kind !== 'relation')
              .map((field) => ({
                name: field.name,
                type: field.type,
                list: true,
                default: typeof field.filterable === 'object' ? field.filterable.default : undefined,
                nonNull: isSubWhere ? false : typeof field.filterable === 'object' && field.filterable.nonNull === true,
              })),
            ...model.fields
              .filter(({ comparable }) => comparable)
              .flatMap((field) => [
                { name: `${field.name}_GT`, type: field.type },
                { name: `${field.name}_GTE`, type: field.type },
                { name: `${field.name}_LT`, type: field.type },
                { name: `${field.name}_LTE`, type: field.type },
              ]),
            ...model.relations
              .filter(({ field: { filterable } }) => filterable)
              .map(({ name, targetModel, field }) => ({
                name,
                type: `${targetModel.name}Where`,
                nonNull: typeof field.filterable === 'object' && field.filterable.nonNull === true,
              })),
            ...model.reverseRelations
              .filter(({ field: { reverseFilterable } }) => reverseFilterable)
              .flatMap((relation) => [
                {
                  name: `${relation.name}_SOME`,
                  type: `${relation.targetModel.name}Where`,
                },
                {
                  name: `${relation.name}_NONE`,
                  type: `${relation.targetModel.name}Where`,
                },
              ]),
            {
              name: 'NOT',
              type: `${model.name}SubWhere`,
            },
            {
              name: 'AND',
              type: `${model.name}SubWhere`,
              list: true,
            },
            {
              name: 'OR',
              type: `${model.name}SubWhere`,
              list: true,
            },
          ]),
        ),
        input(
          `${model.name}WhereUnique`,
          model.fields.filter(({ unique }) => unique).map((field) => ({ name: field.name, type: field.type })),
        ),
        ...(model.fields.some(({ orderable }) => orderable)
          ? [
              input(
                `${model.name}OrderBy`,
                model.fields
                  .filter(({ orderable }) => orderable)
                  .map(({ kind, name, type }) => ({ name, type: kind === 'relation' ? `${type}OrderBy` : 'Order' })),
              ),
            ]
          : []),
      ];

      if (!isRootModel(model)) {
        if (model.creatable) {
          types.push(
            input(
              `Create${model.name}`,
              model.fields.filter(and(isCreatable, isStoredInDatabase)).map((field) =>
                field.kind === 'relation'
                  ? { name: `${field.name}Id`, type: 'ID', nonNull: field.nonNull }
                  : {
                      name: field.name,
                      type: field.kind === 'json' ? `Create${field.type}` : field.type,
                      list: field.list,
                      nonNull: field.nonNull && field.defaultValue === undefined,
                    },
              ),
            ),
          );
        }

        if (model.updatable) {
          types.push(
            input(
              `Update${model.name}`,
              model.fields.filter(and(isUpdatable, isStoredInDatabase)).map((field) =>
                field.kind === 'relation'
                  ? { name: `${field.name}Id`, type: 'ID' }
                  : {
                      name: field.name,
                      type: field.kind === 'json' ? `Update${field.type}` : field.type,
                      list: field.list,
                    },
              ),
            ),
          );
        }

        if (model.aggregatable) {
          types.push(
            object(`${model.name}Aggregate`, [
              { name: 'COUNT', type: 'Int' },
              ...getAggregateFieldDefinitions(model).map((field) => ({
                name: field.outputName,
                type: field.outputType,
              })),
            ]),
          );
        }
      }

      return types;
    }),
    object('Query', [
      {
        name: 'me',
        type: 'User',
      },
      ...entities
        .filter(({ queriable }) => queriable)
        .map(({ name }) => ({
          name: typeToField(name),
          type: name,
          nonNull: true,
          args: [
            {
              name: 'where',
              type: `${name}WhereUnique`,
              nonNull: true,
            },
          ],
        })),
      ...entities
        .filter(({ listQueriable }) => listQueriable)
        .map((model) => ({
          name: model.pluralField,
          type: model.name,
          list: true,
          nonNull: true,
          args: [
            {
              name: 'where',
              type: `${model.name}Where`,
              nonNull: model.fields.some(({ filterable }) => typeof filterable === 'object' && filterable.nonNull === true),
            },
            ...(model.fields.some(({ searchable }) => searchable) ? [{ name: 'search', type: 'String' }] : []),
            ...(model.fields.some(({ orderable }) => orderable)
              ? [{ name: 'orderBy', type: `${model.name}OrderBy`, list: true }]
              : []),
            { name: 'limit', type: 'Int' },
            { name: 'offset', type: 'Int' },
            ...((model.listQueriable && model.listQueriable !== true && model.listQueriable.args) || []),
          ],
        })),
      ...entities
        .filter((model) => model.listQueriable && model.aggregatable)
        .map((model) => ({
          name: `${model.pluralField}_AGGREGATE`,
          type: `${model.name}Aggregate`,
          nonNull: true,
          args: [
            {
              name: 'where',
              type: `${model.name}Where`,
              nonNull: model.fields.some(({ filterable }) => typeof filterable === 'object' && filterable.nonNull === true),
            },
            ...(model.fields.some(({ searchable }) => searchable) ? [{ name: 'search', type: 'String' }] : []),
            { name: 'limit', type: 'Int' },
            { name: 'offset', type: 'Int' },
          ],
        })),
      ...objects.filter((model) => model.name === 'Query').flatMap((model) => model.fields),
    ]),
  ];

  const mutations = [
    ...entities.flatMap((model): Field[] => {
      const mutations: Field[] = [];

      if (!isRootModel(model)) {
        if (model.creatable) {
          mutations.push({
            name: `create${model.name}`,
            type: model.name,
            nonNull: true,
            args: [
              {
                name: 'data',
                type: `Create${model.name}`,
                nonNull: true,
              },
              ...((model.creatable && model.creatable !== true && model.creatable.args) || []),
            ],
          });
        }

        if (model.updatable) {
          mutations.push({
            name: `update${model.name}`,
            type: model.name,
            nonNull: true,
            args: [
              {
                name: 'where',
                type: `${model.name}WhereUnique`,
                nonNull: true,
              },
              {
                name: 'data',
                type: `Update${model.name}`,
                nonNull: true,
              },
              ...((model.updatable && model.updatable !== true && model.updatable.args) || []),
            ],
          });
        }

        if (model.deletable) {
          mutations.push({
            name: `delete${model.name}`,
            type: 'ID',
            nonNull: true,
            args: [
              {
                name: 'where',
                type: `${model.name}WhereUnique`,
                nonNull: true,
              },
              {
                name: 'dryRun',
                type: 'Boolean',
              },
              ...((model.deletable && model.deletable !== true && model.deletable.args) || []),
            ],
          });
          mutations.push({
            name: `restore${model.name}`,
            type: 'ID',
            nonNull: true,
            args: [
              {
                name: 'where',
                type: `${model.name}WhereUnique`,
                nonNull: true,
              },
              ...((model.deletable && model.deletable !== true && model.deletable.restoreArgs) || []),
            ],
          });
        }
      }

      return mutations;
    }),
    ...objects.filter((model) => model.name === 'Mutation').flatMap((model) => model.fields),
  ];

  if (mutations.length) {
    definitions.push(object('Mutation', mutations));
  }

  return definitions;
};

export const generate = (models: Models) => document(generateDefinitions(models));

export const printSchema = (schema: GraphQLSchema): string =>
  [
    ...schema.getDirectives().map((d) => d.astNode && print(d.astNode)),
    ...Object.values(schema.getTypeMap())
      .filter((t) => !t.name.match(/^__/))
      .sort((a, b) => (a.name > b.name ? 1 : -1))
      .map((t) => t.astNode && print(t.astNode)),
  ]
    .filter(Boolean)
    .map((s) => `${s}\n`)
    .join('\n');

export const printSchemaFromDocument = (document: DocumentNode) => printSchema(buildASTSchema(document));

export const printSchemaFromModels = (models: Models) => printSchema(buildASTSchema(generate(models)));
