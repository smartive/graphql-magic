import assert from 'assert';
import { pluralize } from 'inflection';
import camelCase from 'lodash/camelCase';
import lodashGet from 'lodash/get';
import kebabCase from 'lodash/kebabCase';
import startCase from 'lodash/startCase';
import {
  BooleanField,
  CustomField,
  DateTimeField,
  EntityModel,
  EnumField,
  EnumModel,
  InputModel,
  Model,
  ModelField,
  Models,
  ObjectModel,
  PrimitiveField,
  RawEnumModel,
  RawModel,
  RawModels,
  Relation,
  RelationField,
  ReverseRelation,
  ScalarModel,
} from './models';

const isNotFalsy = <T>(v: T | null | undefined | false): v is T => typeof v !== 'undefined' && v !== null && v !== false;

export const merge = <T>(objects: ({ [name: string]: T } | undefined | false)[] | undefined): { [name: string]: T } =>
  (objects || []).filter(isNotFalsy).reduce((i, acc) => ({ ...acc, ...i }), {});

// Target -> target
export const typeToField = (type: string) => type.substr(0, 1).toLowerCase() + type.substr(1);

export const getModelPlural = (model: EntityModel | Model) => model.plural || pluralize(model.name);

export const getModelPluralField = (model: Model) => typeToField(getModelPlural(model));

export const getModelSlug = (model: Model) => kebabCase(getModelPlural(model));

export const getModelLabelPlural = (model: Model) => getLabel(getModelPlural(model));

export const getModelLabel = (model: Model) => getLabel(model.name);

export const getLabel = (s: string) => startCase(camelCase(s));

export const isEntityModel = (model: RawModel): model is EntityModel => model.kind === 'entity';

export const isEnumModel = (model: RawModel): model is EnumModel => model.kind === 'enum';

export const isRawEnumModel = (model: RawModel): model is RawEnumModel => model.kind === 'raw-enum';

export const isScalarModel = (model: RawModel): model is ScalarModel => model.kind === 'scalar';

export const isObjectModel = (model: RawModel): model is ObjectModel => model.kind === 'object';

export const isInputModel = (model: RawModel): model is InputModel => model.kind === 'input';

export const isEnumList = (models: RawModels, field: ModelField) =>
  field?.list === true && models.find(({ name }) => name === field.kind)?.kind === 'enum';

export const and =
  (...predicates: ((field: ModelField) => boolean)[]) =>
  (field: ModelField) =>
    predicates.every((predicate) => predicate(field));

export const not = (predicate: (field: ModelField) => boolean) => (field: ModelField) => !predicate(field);

export const isPrimitive = (field: ModelField): field is PrimitiveField =>
  field.kind === undefined || field.kind === 'primitive';

export const isEnum = (field: ModelField): field is EnumField => field.kind === 'enum';

export const isRelation = (field: ModelField): field is RelationField => field.kind === 'relation';

export const isToOneRelation = (field: ModelField): field is RelationField => isRelation(field) && !!field.toOne;

export const isQueriableField = ({ queriable }: ModelField) => queriable !== false;

export const isCustomField = (field: ModelField): field is CustomField => field.kind === 'custom';

export const isVisible = ({ hidden }: ModelField) => hidden !== true;

export const isSimpleField = and(not(isRelation), not(isCustomField));

export const isUpdatable = ({ updatable }: ModelField) => !!updatable;

export const isCreatable = ({ creatable }: ModelField) => !!creatable;

export const isQueriableBy = (role: string) => (field: ModelField) =>
  field.queriable !== false &&
  (field.queriable === undefined ||
    field.queriable === true ||
    !field.queriable.roles ||
    field.queriable.roles.includes(role));

export const isUpdatableBy = (role: string) => (field: ModelField) =>
  field.updatable && (field.updatable === true || !field.updatable.roles || field.updatable.roles.includes(role));

export const isCreatableBy = (role: string) => (field: ModelField) =>
  field.creatable && (field.creatable === true || !field.creatable.roles || field.creatable.roles.includes(role));

export const actionableRelations = (model: Model, action: 'create' | 'update' | 'filter') =>
  model.fields
    .filter(isRelation)
    .filter(
      (field) =>
        field[`${action === 'filter' ? action : action.slice(0, -1)}able` as 'filterable' | 'creatable' | 'updatable']
    );

export const getModels = (rawModels: RawModels): Models => {
  const models: Models = rawModels.filter(isEntityModel).map((model) => {
    const objectModel: Model = {
      ...model,
      fieldsByName: {},
      relations: [],
      relationsByName: {},
      reverseRelations: [],
      reverseRelationsByName: {},
      fields: (
        [
          { name: 'id', type: 'ID', nonNull: true, unique: true, primary: true, generated: true },
          ...model.fields,
          ...(model.creatable
            ? [
                {
                  name: 'createdAt',
                  type: 'DateTime',
                  nonNull: true,
                  orderable: true,
                  generated: true,
                  ...(typeof model.creatable === 'object' && model.creatable.createdAt),
                } satisfies DateTimeField,
                {
                  name: 'createdBy',
                  kind: 'relation',
                  type: 'User',
                  nonNull: true,
                  reverse: `created${getModelPlural(model)}`,
                  generated: true,
                  ...(typeof model.creatable === 'object' && model.creatable.createdBy),
                } satisfies RelationField,
              ]
            : []),
          ...(model.updatable
            ? [
                {
                  name: 'updatedAt',
                  type: 'DateTime',
                  nonNull: true,
                  orderable: true,
                  generated: true,
                  ...(typeof model.updatable === 'object' && model.updatable.updatedAt),
                } satisfies DateTimeField,
                {
                  name: 'updatedBy',
                  kind: 'relation',
                  type: 'User',
                  nonNull: true,
                  reverse: `updated${getModelPlural(model)}`,
                  generated: true,
                  ...(typeof model.updatable === 'object' && model.updatable.updatedBy),
                } satisfies RelationField,
              ]
            : []),
          ...(model.deletable
            ? [
                {
                  name: 'deleted',
                  type: 'Boolean',
                  nonNull: true,
                  defaultValue: false,
                  filterable: { default: false },
                  generated: true,
                  ...(typeof model.deletable === 'object' && model.deletable.deleted),
                } satisfies BooleanField,
                {
                  name: 'deletedAt',
                  type: 'DateTime',
                  orderable: true,
                  generated: true,
                  ...(typeof model.deletable === 'object' && model.deletable.deletedAt),
                } satisfies DateTimeField,
                {
                  name: 'deletedBy',
                  kind: 'relation',
                  type: 'User',
                  reverse: `deleted${getModelPlural(model)}`,
                  generated: true,
                  ...(typeof model.deletable === 'object' && model.deletable.deletedBy),
                } satisfies RelationField,
              ]
            : []),
        ] satisfies ModelField[]
      ).map((field: ModelField) => ({
        ...field,
        ...(field.kind === 'relation' && {
          foreignKey: field.foreignKey || `${field.name}Id`,
        }),
      })),
    };

    for (const field of objectModel.fields) {
      objectModel.fieldsByName[field.name] = field;
    }

    return objectModel;
  });

  for (const model of models) {
    for (const field of model.fields) {
      if (field.kind !== 'relation') {
        continue;
      }

      const fieldModel = summonByName(models, field.type);

      const reverseRelation: ReverseRelation = {
        kind: 'relation',
        name: field.reverse || (field.toOne ? typeToField(model.name) : getModelPluralField(model)),
        foreignKey: get(field, 'foreignKey'),
        type: model.name,
        toOne: !!field.toOne,
        fieldModel,
        field,
        model,
      };

      const relation: Relation = {
        field,
        model: fieldModel,
        reverseRelation,
      };
      model.relations.push(relation);
      model.relationsByName[relation.field.name] = relation;

      fieldModel.reverseRelations.push(reverseRelation);

      fieldModel.reverseRelationsByName[reverseRelation.name] = reverseRelation;
    }
  }

  return models;
};

export const summonByName = <T extends { name: string }>(array: T[], value: string) => summonByKey(array, 'name', value);

export const summonByKey = <T>(array: readonly T[] | undefined, key: string, value: unknown) =>
  summon(array, (element: T) => lodashGet(element, key) === value, `No element found with ${key} ${value}`);

export const summon = <T>(array: readonly T[] | undefined, cb: Parameters<T[]['find']>[1], errorMessage?: string) => {
  if (array === undefined) {
    console.trace();
    throw new Error('Base array is not defined.');
  }
  const result = array.find(cb);
  if (result === undefined) {
    console.trace();
    throw new Error(errorMessage || 'Element not found.');
  }
  return result;
};

type ForSure<T> = T extends undefined | null ? never : T;

export const it = <T>(object: T | null | undefined): ForSure<T> => {
  if (object === undefined || object === null) {
    console.trace();
    throw new Error('Base object is not defined.');
  }

  return object as ForSure<T>;
};

export const get = <T, U extends keyof ForSure<T>>(object: T | null | undefined, key: U): ForSure<ForSure<T>[U]> => {
  const value = it(object)[key];
  if (value === undefined || value === null) {
    console.trace();
    throw new Error(`Object doesn't have ${String(key)}`);
  }
  return value as ForSure<ForSure<T>[U]>;
};

export const getString = (v: unknown) => {
  assert(typeof v === 'string');
  return v;
};

export const retry = async <T>(cb: () => Promise<T>, condition: (e: any) => boolean) => {
  try {
    return await cb();
  } catch (e) {
    if (condition(e)) {
      return await cb();
    } else {
      throw e;
    }
  }
};
