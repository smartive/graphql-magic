import { camelCase, lowerFirst, startCase } from 'lodash';
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

export const merge = <T>(objects: ({ [name: string]: T } | undefined | false)[] | undefined): { [name: string]: T } =>
  (objects || []).filter(isNotFalsy).reduce((i, acc) => ({ ...acc, ...i }), {});

export const typeToField = (type: string) => lowerFirst(type);

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

export const isRootModel = (model: EntityModel) => model.root;

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

export const isInherited = (field: EntityField) => field.inherited;

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
