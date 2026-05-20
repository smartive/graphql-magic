import { DefinitionNode, DocumentNode, GraphQLSchema, buildASTSchema, print } from 'graphql';
import upperFirst from 'lodash/upperFirst';
import { EntityField, EntityModel, Models } from '../models/models';
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

const isMandatoryFilterable = (field: Pick<EntityField, 'filterable'>): boolean =>
  typeof field.filterable === 'object' && field.filterable !== null && field.filterable.nonNull === true;

const mandatoryFilterableRelationFields = (model: EntityModel) =>
  model.relations.filter(({ field }) => isMandatoryFilterable(field));

const hasAnyMandatoryFilterableField = (model: EntityModel, exemptedFieldName?: string) =>
  model.fields.some((field) => field.name !== exemptedFieldName && isMandatoryFilterable(field));

const variantWhereName = (model: EntityModel, exemptedFieldName: string) =>
  `From${upperFirst(exemptedFieldName)}${model.name}Where`;

const pickWhereVariant = (targetModel: EntityModel, exemptedFieldName?: string): { typeName: string; nonNull: boolean } => {
  if (exemptedFieldName) {
    const exempted = targetModel.fieldsByName[exemptedFieldName];
    if (exempted && isMandatoryFilterable(exempted)) {
      return {
        typeName: variantWhereName(targetModel, exemptedFieldName),
        nonNull: hasAnyMandatoryFilterableField(targetModel, exemptedFieldName),
      };
    }
  }

  return {
    typeName: `${targetModel.name}Where`,
    nonNull: hasAnyMandatoryFilterableField(targetModel),
  };
};

const buildWhereFields = (
  model: EntityModel,
  { isSubWhere = false, exemptedFieldName }: { isSubWhere?: boolean; exemptedFieldName?: string } = {},
): Field[] => [
  ...model.fields
    .filter(({ kind, unique, filterable }) => (unique || filterable) && kind !== 'relation')
    .map((field) => ({
      name: field.name,
      type: field.type,
      list: true,
      default: typeof field.filterable === 'object' ? field.filterable.default : undefined,
      nonNull: isSubWhere ? false : isMandatoryFilterable(field),
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
      nonNull: name === exemptedFieldName ? false : isMandatoryFilterable(field),
    })),
  ...model.reverseRelations
    .filter(({ field: { reverseFilterable } }) => reverseFilterable)
    .flatMap((relation) => {
      // _SOME / _NONE implies each matched target satisfies target.<backref> = (some parent),
      // so the backref field on the target is implicitly constrained — use the relaxed variant.
      // SubWhere stays as-is (spec: XSubWhere is orthogonal to the new logic).
      const type = isSubWhere
        ? `${relation.targetModel.name}Where`
        : pickWhereVariant(relation.targetModel, relation.field.name).typeName;

      return [
        { name: `${relation.name}_SOME`, type },
        { name: `${relation.name}_NONE`, type },
      ];
    }),
  { name: 'NOT', type: `${model.name}SubWhere` },
  { name: 'AND', type: `${model.name}SubWhere`, list: true },
  { name: 'OR', type: `${model.name}SubWhere`, list: true },
];

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
            ...model.reverseRelations.map(({ name, field, targetModel }) => {
              const variant = pickWhereVariant(targetModel, field.name);

              return {
                name,
                type: targetModel.name,
                list: !field.toOne,
                nonNull: !field.toOne,
                args: [
                  {
                    name: 'where',
                    type: variant.typeName,
                    nonNull: variant.nonNull,
                  },
                  ...(targetModel.fields.some(({ searchable }) => searchable) ? [{ name: 'search', type: 'String' }] : []),
                  ...(targetModel.fields.some(({ orderable }) => orderable)
                    ? [{ name: 'orderBy', type: `${targetModel.name}OrderBy`, list: true }]
                    : []),
                  { name: 'limit', type: 'Int' },
                  { name: 'offset', type: 'Int' },
                ],
              };
            }),
          ],
          [...(model.parent ? [model.parent] : []), ...(model.interfaces || [])],
        ),
        input(`${model.name}Where`, buildWhereFields(model)),
        input(`${model.name}SubWhere`, buildWhereFields(model, { isSubWhere: true })),
        // Relaxed variants: one per forward-relation field on `model` with `filterable.nonNull === true`.
        // Used at nested positions (reverse-relation arg, _SOME / _NONE) where stepping through a
        // specific edge implicitly constrains that one forward-relation field on the target.
        ...mandatoryFilterableRelationFields(model).map(({ field }) =>
          input(variantWhereName(model, field.name), buildWhereFields(model, { exemptedFieldName: field.name })),
        ),
        input(
          `${model.name}WhereUnique`,
          model.fields.filter(({ unique }) => unique).map((field) => ({ name: field.name, type: field.type })),
        ),
        // Singular-query lookup type: WhereUnique fields + mandatory filterables (and
        // mandatory-filterable relation FKs), every one nonNull so callers of the singular
        // `entity(where: …)` query can't bypass the cascade the plural `Where` enforces. The
        // separate name keeps `WhereUnique` as the original simple identifier shape that
        // mutations (create/update/delete/restore) continue to use without forcing them to
        // route through the filter-enforcement layer.
        input(`${model.name}WhereLookup`, [
          ...model.fields.filter(({ unique }) => unique).map((field) => ({ name: field.name, type: field.type })),
          ...model.fields
            .filter(({ kind, filterable }) => isMandatoryFilterable({ filterable }) && kind !== 'relation')
            .map((field) => ({
              name: field.name,
              type: field.type,
              list: true,
              default: typeof field.filterable === 'object' ? field.filterable.default : undefined,
              nonNull: true,
            })),
          ...model.relations
            .filter(({ field }) => isMandatoryFilterable(field))
            .map(({ name, targetModel }) => ({
              name,
              type: `${targetModel.name}Where`,
              nonNull: true,
            })),
        ]),
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
              type: `${name}WhereLookup`,
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
              nonNull: hasAnyMandatoryFilterableField(model),
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
              nonNull: hasAnyMandatoryFilterableField(model),
            },
            ...(model.fields.some(({ searchable }) => searchable) ? [{ name: 'search', type: 'String' }] : []),
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
