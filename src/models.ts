import { Dictionary } from 'lodash';
import { DateTime } from 'luxon';
import { Context } from './context';
import { OrderBy } from './resolvers/arguments';
import { Directive, Value } from './values';

export type RawModels = RawModel[];

export type RawModel = ScalarModel | EnumModel | InterfaceModel | ObjectModel | RawObjectModel;

type BaseModel = {
  name: string;
  plural?: string;
  description?: string;
};

export type ScalarModel = BaseModel & { type: 'scalar' };

export type EnumModel = BaseModel & {
  type: 'enum';
  values: string[];
  deleted?: true;
};

export type InterfaceModel = BaseModel & {
  type: 'interface';
  fields: ModelField[];
};

export type RawObjectModel = BaseModel & {
  type: 'raw-object';
  fields: ModelField[];
  rawFilters?: { name: string; type: string; list?: boolean }[];
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- data is derived from the models
export type Entity = Record<string, any>;

export type MutationHook = (
  model: ObjectModel,
  action: 'create' | 'update' | 'delete',
  when: 'before' | 'after',
  data: { prev: Entity; input: Entity; normalizedInput: Entity; next: Entity },
  ctx: Context,
  now: DateTime
) => Promise<void>;

export type ObjectModel = BaseModel & {
  type: 'object';
  interfaces?: string[];
  // createdAt, createdBy, updatedAt, updatedBy can be null
  nonStrict?: boolean;
  queriable?: boolean;
  listQueriable?: boolean;
  creatable?: boolean;
  updatable?: boolean;
  deletable?: boolean;
  displayField?: string;
  defaultOrderBy?: OrderBy;
  fields: ModelField[];

  // temporary fields for the generation of migrations
  deleted?: true;
  oldName?: string;
};

export type InputObject = {
  name: string;
  type: string;
  nonNull?: boolean;
};

export const isObjectModel = (model: RawModel): model is ObjectModel => model.type === 'object';

export const isEnumModel = (model: RawModel): model is EnumModel => model.type === 'enum';

export const isScalarModel = (model: RawModel): model is ScalarModel => model.type === 'scalar';

export const isRawObjectModel = (model: RawModel): model is RawObjectModel => model.type === 'raw-object';

export const isEnumList = (models: RawModels, field: ModelField) =>
  field?.list === true && models.find(({ name }) => name === field.type)?.type === 'enum';

export const and =
  (...predicates: ((field: ModelField) => boolean)[]) =>
  (field: ModelField) =>
    predicates.every((predicate) => predicate(field));

export const not = (predicate: (field: ModelField) => boolean) => (field: ModelField) => !predicate(field);

export const isRelation = ({ relation }: ModelField) => !!relation;

export const isToOneRelation = ({ toOne }: ModelField) => !!toOne;

export const isQueriableField = ({ queriable }: ModelField) => queriable !== false;

export const isRaw = ({ raw }: ModelField) => !!raw;

export const isSimpleField = and(not(isRelation), not(isRaw));

export const isUpdatable = ({ updatable }: ModelField) => !!updatable;

export const isCreatable = ({ creatable }: ModelField) => !!creatable;

export const isQueriableBy = (role: string) => (field: ModelField) =>
  isQueriableField(field) && (!field.queriableBy || field.queriableBy.includes(role));

export const isUpdatableBy = (role: string) => (field: ModelField) =>
  isUpdatable(field) && (!field.updatableBy || field.updatableBy.includes(role));

export const isCreatableBy = (role: string) => (field: ModelField) =>
  isCreatable(field) && (!field.creatableBy || field.creatableBy.includes(role));

export type Field = {
  name: string;
  type: string;
  default?: Value;
  list?: boolean;
  nonNull?: boolean;
  args?: Field[];
  directives?: Directive[];
};

export type ModelField = Field & {
  primary?: boolean;
  unique?: boolean;
  filterable?: boolean;
  defaultFilter?: Value;
  possibleValues?: Value[];
  orderable?: boolean;
  comparable?: boolean;
  relation?: boolean;
  onDelete?: 'cascade' | 'set-null';
  reverse?: string;
  toOne?: boolean;
  foreignKey?: string;
  queriable?: false;
  queriableBy?: string[];
  creatable?: boolean;
  creatableBy?: string[];
  updatable?: boolean;
  updatableBy?: string[];
  generated?: boolean;
  raw?: boolean;
  dateTimeType?: 'year' | 'date' | 'datetime' | 'year_and_month';
  stringType?: 'mobilePhone' | 'email' | 'url';
  floatType?: 'currency' | 'percentage';
  unit?: 'million';
  intType?: 'currency';
  min?: number;
  max?: number;
  description?: string;
  large?: true;
  maxLength?: number;
  double?: boolean;
  precision?: number;
  scale?: number;
  defaultValue?: string | number | ReadonlyArray<string> | undefined;
  endOfDay?: boolean;
  obfuscate?: true;
  // If true the field must be filled within forms but can be null in the database
  required?: boolean;
  indent?: boolean;

  // temporary fields for the generation of migrations
  deleted?: true;
  oldName?: string;
};

export type Models = Model[];

export type Model = ObjectModel & {
  fieldsByName: Dictionary<ModelField>;
  reverseRelations: ReverseRelation[];
  reverseRelationsByName: Dictionary<ReverseRelation>;
};

export type ReverseRelation = {
  name: string;
  type: string;
  foreignKey: string;
  toOne: boolean;
  model: Model;
  field: ModelField;
  fieldModel: Model;
};
