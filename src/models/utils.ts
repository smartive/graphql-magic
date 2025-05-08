import assert from 'assert';
import camelCase from 'lodash/camelCase';
import lodashGet from 'lodash/get';
import startCase from 'lodash/startCase';
import {
  CustomField,
  EntityField,
  EntityModel,
  EnumField,
  EnumModel,
  InputModel,
  InterfaceModel,
  Model,
  ObjectModel,
  PrimitiveField,
  RawEnumModel,
  RelationField,
  ScalarModel,
} from './models';

const isNotFalsy = <T>(v: T | null | undefined | false): v is T => typeof v !== 'undefined' && v !== null && v !== false;

export const merge = <T>(objects: (Record<string, T> | undefined | false)[] | undefined): Record<string, T> =>
  (objects || []).filter(isNotFalsy).reduce((i, acc) => ({ ...acc, ...i }), {});

// Target -> target
export const typeToField = (type: string) => type.substr(0, 1).toLowerCase() + type.substr(1);

export const getLabel = (s: string) => startCase(camelCase(s));

export const or =
  <T>(...predicates: ((field: T) => boolean)[]) =>
  (field: T) =>
    predicates.some((predicate) => predicate(field));

export const and =
  <T>(...predicates: ((field: T) => boolean)[]) =>
  (field: T) =>
    predicates.every((predicate) => predicate(field));

export const not =
  <T>(predicate: (field: T) => boolean) =>
  (field: T) =>
    !predicate(field);

export const isRootModel = (model: EntityModel) => !!model.root;

export const isEntityModel = (model: Model): model is EntityModel => model instanceof EntityModel;

export const isEnumModel = (model: Model): model is EnumModel => model instanceof EnumModel;

export const isRawEnumModel = (model: Model): model is RawEnumModel => model instanceof RawEnumModel;

export const isScalarModel = (model: Model): model is ScalarModel => model instanceof ScalarModel;

export const isObjectModel = (model: Model): model is ObjectModel => model instanceof ObjectModel;

export const isInputModel = (model: Model): model is InputModel => model instanceof InputModel;

export const isInterfaceModel = (model: Model): model is InterfaceModel => model instanceof InterfaceModel;

export const isCreatableModel = (model: EntityModel) => model.creatable && model.fields.some(isCreatableField);

export const isUpdatableModel = (model: EntityModel) => model.updatable && model.fields.some(isUpdatableField);

export const isCreatableField = (field: EntityField) => !field.inherited && !!field.creatable;

export const isUpdatableField = (field: EntityField) => !field.inherited && !!field.updatable;

export const modelNeedsTable = (model: EntityModel) => model.fields.some((field) => !field.inherited);

export const hasName = (name: string) => (field: EntityField) => field.name == name;

export const isPrimitive = (field: EntityField): field is PrimitiveField =>
  field.kind === undefined || field.kind === 'primitive';

export const isEnum = (field: EntityField): field is EnumField => field.kind === 'enum';

export const isRelation = (field: EntityField): field is RelationField => field.kind === 'relation';

export const isInherited = (field: EntityField) => !!field.inherited;

export const isInTable = (field: EntityField) => field.name === 'id' || !field.inherited;

export const isToOneRelation = (field: EntityField): field is RelationField => isRelation(field) && !!field.toOne;

export const isQueriableField = ({ queriable }: EntityField) => queriable !== false;

export const isCustomField = (field: EntityField): field is CustomField => field.kind === 'custom';

export const isVisible = ({ hidden }: EntityField) => hidden !== true;

export const isSimpleField = and(not(isRelation), not(isCustomField));

export const isUpdatable = ({ updatable }: EntityField) => !!updatable;

export const isCreatable = ({ creatable }: EntityField) => !!creatable;

export const isQueriableBy = (role: string) => (field: EntityField) =>
  field.queriable !== false &&
  (field.queriable === undefined ||
    field.queriable === true ||
    !field.queriable.roles ||
    field.queriable.roles.includes(role));

export const isUpdatableBy = (role: string) => (field: EntityField) =>
  field.updatable && (field.updatable === true || !field.updatable.roles || field.updatable.roles.includes(role));

export const isCreatableBy = (role: string) => (field: EntityField) =>
  field.creatable && (field.creatable === true || !field.creatable.roles || field.creatable.roles.includes(role));

export const getActionableRelations = (model: EntityModel, action: 'create' | 'update' | 'filter') =>
  model.relations
    .filter(
      (relation) =>
        relation.field[
          `${action === 'filter' ? action : action.slice(0, -1)}able` as 'filterable' | 'creatable' | 'updatable'
        ],
    )
    .map(({ name }) => name);

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
    const error = new Error(`Object doesn't have ${String(key)}`);
    console.warn(error);
    throw error;
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
    }
    throw e;
  }
};

type Typeof = {
  string: string;
  number: number;
  bigint: bigint;
  boolean: boolean;
  symbol: symbol;
  undefined: undefined;
  object: object;
  function: Function;
};

export const as = <T extends keyof Typeof>(value: unknown, type: T): Typeof[T] => {
  if (typeof value !== type) {
    throw new Error(`No string`);
  }

  return value as Typeof[T];
};
