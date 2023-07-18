import { buildASTSchema, DefinitionNode, DocumentNode, GraphQLSchema, print } from 'graphql';
import flatMap from 'lodash/flatMap';
import {
  Field,
  isEnumModel,
  isJsonObjectModel,
  isQueriableField,
  isRawEnumModel,
  isRawObjectModel,
  isScalarModel,
  RawModels,
} from '../models';
import { getModelPluralField, getModels, typeToField } from '../utils';
import { document, enm, input, object, scalar } from './utils';

export const generateDefinitions = (rawModels: RawModels): DefinitionNode[] => {
  const models = getModels(rawModels);

  return [
    // Predefined types
    enm('Order', ['ASC', 'DESC']),
    scalar('DateTime'),
    scalar('Upload'),

    ...rawModels.filter(isEnumModel).map((model) => enm(model.name, model.values)),
    ...rawModels.filter(isRawEnumModel).map((model) => enm(model.name, model.values)),
    ...rawModels.filter(isScalarModel).map((model) => scalar(model.name)),
    ...rawModels.filter(isRawObjectModel).map((model) => object(model.name, model.fields)),
    ...rawModels.filter(isJsonObjectModel).map((model) => object(model.name, model.fields)),
    ...rawModels
      .filter(isRawObjectModel)
      .filter(({ rawFilters }) => rawFilters)
      .map((model) =>
        input(
          `${model.name}Where`,
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- array gets filtered above to only include models with rawFilters
          model.rawFilters!.map(({ name, type, list = false, nonNull = false }) => ({ name, type, list, nonNull }))
        )
      ),

    ...flatMap(
      models.map((model) => {
        const types = [
          object(
            model.name,
            [
              ...model.fields.filter(isQueriableField).map((field) => ({
                ...field,
                args: [
                  ...(field.args || []),
                  ...(hasRawFilters(rawModels, field.type) ? [{ name: 'where', type: `${field.type}Where` }] : []),
                ],
                directives: field.directives,
              })),
              ...model.reverseRelations.map(({ name, field, model }) => ({
                name,
                type: model.name,
                list: !field.toOne,
                nonNull: !field.toOne,
                args: [
                  { name: 'where', type: `${model.name}Where` },
                  ...(model.fields.some(({ searchable }) => searchable) ? [{ name: 'search', type: 'String' }] : []),
                  ...(model.fields.some(({ orderable }) => orderable)
                    ? [{ name: 'orderBy', type: `${model.name}OrderBy`, list: true }]
                    : []),
                  { name: 'limit', type: 'Int' },
                  { name: 'offset', type: 'Int' },
                ],
              })),
            ],
            model.interfaces
          ),
          input(`${model.name}Where`, [
            ...model.fields
              .filter(({ unique, filterable, relation }) => (unique || filterable) && !relation)
              .map(({ name, type, defaultFilter }) => ({ name, type, list: true, default: defaultFilter })),
            ...flatMap(
              model.fields.filter(({ comparable }) => comparable),
              ({ name, type }) => [
                { name: `${name}_GT`, type },
                { name: `${name}_GTE`, type },
                { name: `${name}_LT`, type },
                { name: `${name}_LTE`, type },
              ]
            ),
            ...model.fields
              .filter(({ filterable, relation }) => filterable && relation)
              .map(({ name, type }) => ({
                name,
                type: `${type}Where`,
              })),
          ]),
          input(
            `${model.name}WhereUnique`,
            model.fields.filter(({ unique }) => unique).map(({ name, type }) => ({ name, type }))
          ),
          ...(model.fields.some(({ orderable }) => orderable)
            ? [
                input(
                  `${model.name}OrderBy`,
                  model.fields.filter(({ orderable }) => orderable).map(({ name }) => ({ name, type: 'Order' }))
                ),
              ]
            : []),
        ];

        if (model.creatable) {
          types.push(
            input(
              `Create${model.name}`,
              model.fields
                .filter(({ creatable }) => creatable)
                .map(({ name, relation, type, nonNull, list, default: defaultValue }) =>
                  relation
                    ? { name: `${name}Id`, type: 'ID', nonNull }
                    : { name, type, list, nonNull: nonNull && defaultValue === undefined }
                )
            )
          );
        }

        if (model.updatable) {
          types.push(
            input(
              `Update${model.name}`,
              model.fields
                .filter(({ updatable }) => updatable)
                .map(({ name, relation, type, list }) =>
                  relation ? { name: `${name}Id`, type: 'ID' } : { name, type, list }
                )
            )
          );
        }
        return types;
      })
    ),

    object('Query', [
      {
        name: 'me',
        type: 'User',
      },
      ...models
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
      ...models
        .filter(({ listQueriable }) => listQueriable)
        .map((model) => ({
          name: getModelPluralField(model),
          type: model.name,
          list: true,
          nonNull: true,
          args: [
            { name: 'where', type: `${model.name}Where` },
            ...(model.fields.some(({ searchable }) => searchable) ? [{ name: 'search', type: 'String' }] : []),
            ...(model.fields.some(({ orderable }) => orderable)
              ? [{ name: 'orderBy', type: `${model.name}OrderBy`, list: true }]
              : []),
            { name: 'limit', type: 'Int' },
            { name: 'offset', type: 'Int' },
          ],
        })),
    ]),

    object('Mutation', [
      ...flatMap(
        models.map((model): Field[] => {
          const mutations: Field[] = [];

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
              ],
            });
          }

          return mutations;
        })
      ),
    ]),
  ];
};

export const generate = (rawModels: RawModels) => document(generateDefinitions(rawModels));

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

const hasRawFilters = (models: RawModels, type: string) =>
  models.filter(isRawObjectModel).some(({ name, rawFilters }) => name === type && !!rawFilters);

export const printSchemaFromDocument = (document: DocumentNode) => printSchema(buildASTSchema(document));

export const printSchemaFromModels = (models: RawModels) => printSchema(buildASTSchema(generate(models)));