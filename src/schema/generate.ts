import { DefinitionNode, DocumentNode, GraphQLSchema, buildASTSchema, print } from 'graphql';
import flatMap from 'lodash/flatMap';
import { RawModels } from '../models/models';
import {
  getModelPluralField,
  getModels,
  isEnumModel,
  isQueriableField,
  isRawEnumModel,
  isRawObjectModel,
  isRelation,
  isScalarModel,
  typeToField,
} from '../models/utils';
import { Field, document, enm, input, object, scalar } from './utils';

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
    ...rawModels
      .filter(isRawObjectModel)
      .filter((model) =>
        models.some((m) => m.creatable && m.fields.some((f) => f.creatable && f.kind === 'json' && f.type === model.name))
      )
      .map((model) => input(`Create${model.name}`, model.fields)),
    ...rawModels
      .filter(isRawObjectModel)
      .filter((model) =>
        models.some((m) => m.creatable && m.fields.some((f) => f.creatable && f.kind === 'json' && f.type === model.name))
      )
      .map((model) => input(`Update${model.name}`, model.fields)),

    ...flatMap(
      models.map((model) => {
        const types = [
          object(
            model.name,
            [
              ...model.fields.filter(isQueriableField).map((field) => ({
                ...field,
                type: field.type,
                args: [...(field.args || [])],
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
              .filter(({ kind, unique, filterable }) => (unique || filterable) && kind !== 'relation')
              .map((field) => ({
                name: field.name,
                type: field.type,
                list: true,
                default: typeof field.filterable === 'object' ? field.filterable.default : undefined,
              })),
            ...flatMap(
              model.fields.filter(({ comparable }) => comparable),
              (field) => [
                { name: `${field.name}_GT`, type: field.type },
                { name: `${field.name}_GTE`, type: field.type },
                { name: `${field.name}_LT`, type: field.type },
                { name: `${field.name}_LTE`, type: field.type },
              ]
            ),
            ...model.fields
              .filter(isRelation)
              .filter(({ filterable }) => filterable)
              .map(({ name, type }) => ({
                name,
                type: `${type}Where`,
              })),
          ]),
          input(
            `${model.name}WhereUnique`,
            model.fields.filter(({ unique }) => unique).map((field) => ({ name: field.name, type: field.type }))
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
                .map((field) =>
                  field.kind === 'relation'
                    ? { name: `${field.name}Id`, type: 'ID', nonNull: field.nonNull }
                    : {
                        name: field.name,
                        type: field.kind === 'json' ? `Create${field.type}` : field.type,
                        list: field.list,
                        nonNull: field.nonNull && field.defaultValue === undefined,
                      }
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
                .map((field) =>
                  field.kind === 'relation'
                    ? { name: `${field.name}Id`, type: 'ID' }
                    : {
                        name: field.name,
                        type: field.kind === 'json' ? `Update${field.type}` : field.type,
                        list: field.list,
                      }
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

export const printSchemaFromDocument = (document: DocumentNode) => printSchema(buildASTSchema(document));

export const printSchemaFromModels = (models: RawModels) => printSchema(buildASTSchema(generate(models)));
