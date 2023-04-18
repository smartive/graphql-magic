import assert from 'assert';
import { pluralize } from 'inflection';
import { camelCase, kebabCase, get as lodashGet, startCase } from 'lodash';
import { Model, Models, ObjectModel, RawModels, Relation, ReverseRelation, isObjectModel } from './models';

const isNotFalsy = <T>(v: T | null | undefined | false): v is T => typeof v !== 'undefined' && v !== null && v !== false;

export const merge = <T>(objects: ({ [name: string]: T } | undefined | false)[] | undefined): { [name: string]: T } =>
  (objects || []).filter(isNotFalsy).reduce((i, acc) => ({ ...acc, ...i }), {});

// Target -> target
export const typeToField = (type: string) => type.substr(0, 1).toLowerCase() + type.substr(1);

export const getModelPlural = (model: ObjectModel | Model) => model.plural || pluralize(model.name);

export const getModelPluralField = (model: Model) => typeToField(getModelPlural(model));

export const getModelSlug = (model: Model) => kebabCase(getModelPlural(model));

export const getModelLabelPlural = (model: Model) => getLabel(getModelPlural(model));

export const getModelLabel = (model: Model) => getLabel(model.name);

export const getLabel = (s: string) => startCase(camelCase(s));

export const getModels = (rawModels: RawModels): Models => {
  const models: Models = rawModels.filter(isObjectModel).map((model) => {
    const objectModel: Model = {
      ...model,
      fieldsByName: {},
      relations: [],
      relationsByName: {},
      reverseRelations: [],
      reverseRelationsByName: {},
      fields: [
        { name: 'id', type: 'ID', nonNull: true, unique: true, primary: true, generated: true },
        ...model.fields,
        ...(model.creatable
          ? [
              { name: 'createdAt', type: 'DateTime', nonNull: !model.nonStrict, orderable: true, generated: true },
              {
                name: 'createdBy',
                type: 'User',
                relation: true,
                nonNull: !model.nonStrict,
                reverse: `created${getModelPlural(model)}`,
                generated: true,
              },
            ]
          : []),
        ...(model.updatable
          ? [
              { name: 'updatedAt', type: 'DateTime', nonNull: !model.nonStrict, orderable: true, generated: true },
              {
                name: 'updatedBy',
                type: 'User',
                relation: true,
                nonNull: !model.nonStrict,
                reverse: `updated${getModelPlural(model)}`,
                generated: true,
              },
            ]
          : []),
        ...(model.deletable
          ? [
              {
                name: 'deleted',
                type: 'Boolean',
                nonNull: true,
                default: false,
                filterable: true,
                defaultFilter: false,
                generated: true,
              },
              { name: 'deletedAt', type: 'DateTime', orderable: true, generated: true },
              {
                name: 'deletedBy',
                type: 'User',
                relation: true,
                reverse: `deleted${getModelPlural(model)}`,
                generated: true,
              },
            ]
          : []),
      ].map(({ foreignKey, ...field }) => ({
        ...field,
        ...(field.relation && {
          foreignKey: foreignKey || `${field.name}Id`,
        }),
      })),
    };

    for (const field of objectModel.fields) {
      objectModel.fieldsByName[field.name] = field;
    }

    return objectModel;
  });

  for (const model of models) {
    for (const field of model.fields.filter(({ relation }) => relation)) {
      const fieldModel = summonByName(models, field.type);

      const reverseRelation: ReverseRelation = {
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

export const summonByKey = <T, U extends keyof T>(array: readonly T[] | undefined, key: string, value: unknown) =>
  summon(array, (element: T) => lodashGet(element, key) === value, `No element found with ${key} ${value}`);

export const summon = <T>(array: readonly T[] | undefined, cb: Parameters<T[]['find']>[1], errorMessage?: string) => {
  if (array === undefined) {
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
