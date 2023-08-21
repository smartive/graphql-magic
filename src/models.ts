import { DateTime } from 'luxon';
import { Field } from '.';
import type { Context } from './context';
import type { OrderBy } from './resolvers/arguments';
import type { Value } from './values';

export type RawModels = RawModel[];

export type RawModel = ScalarModel | EnumModel | RawEnumModel | InterfaceModel | ObjectModel | RawObjectModel;

type BaseModel = {
  name: string;
  plural?: string;
  description?: string;
};

export type ScalarModel = BaseModel & { type: 'scalar' };

export type EnumModel = BaseModel & { type: 'enum'; values: string[]; deleted?: true };

export type RawEnumModel = BaseModel & { type: 'raw-enum'; values: string[] };

export type InterfaceModel = BaseModel & { type: 'interface'; fields: ModelField[] };

export type RawObjectModel = BaseModel & {
  type: 'raw';
  fields: RawObjectField[];
};

export type Entity = Record<string, unknown> & { createdAt?: DateTime; deletedAt?: DateTime };

export type Action = 'create' | 'update' | 'delete' | 'restore';

export type MutationHook = (
  model: Model,
  action: Action,
  when: 'before' | 'after',
  data: { prev: Entity; input: Entity; normalizedInput: Entity; next: Entity },
  ctx: Context
) => Promise<void>;

export type ObjectModel = BaseModel & {
  type: 'object';
  interfaces?: string[];
  queriable?: boolean;
  listQueriable?: boolean;
  creatable?: boolean | { createdBy?: Partial<RelationField>; createdAt?: Partial<DateTimeField> };
  updatable?: boolean | { updatedBy?: Partial<RelationField>; updatedAt?: Partial<DateTimeField> };
  deletable?:
    | boolean
    | { deleted?: Partial<BooleanField>; deletedBy?: Partial<RelationField>; deletedAt?: Partial<DateTimeField> };
  displayField?: string;
  defaultOrderBy?: OrderBy;
  fields: ModelField[];

  // temporary fields for the generation of migrations
  deleted?: true;
  oldName?: string;
};

type BaseNumberType = {
  unit?: 'million';
  min?: number;
  max?: number;
};

type BaseField = Omit<Field, 'type'>;

type PrimitiveField =
  | { type: 'ID' }
  | { type: 'Boolean' }
  | {
      type: 'String';
      stringType?: 'email' | 'url' | 'phone';
      large?: true;
      maxLength?: number;
    }
  | {
      type: 'DateTime';
      dateTimeType?: 'year' | 'date' | 'datetime' | 'year_and_month';
      endOfDay?: boolean;
    }
  | ({
      type: 'Int';
      intType?: 'currency';
    } & BaseNumberType)
  | ({
      type: 'Float';
      floatType?: 'currency' | 'percentage';
      double?: boolean;
      precision?: number;
      scale?: number;
    } & BaseNumberType)
  | { type: 'Upload' };

type RawObjectField = BaseField & PrimitiveField;

export type ModelField = BaseField &
  (
    | PrimitiveField
    | { type: 'json'; typeName: string }
    | { type: 'enum'; typeName: string; possibleValues?: Value[] }
    | { type: 'raw'; typeName: string }
    | {
        type: 'relation';
        typeName: string;
        toOne?: boolean;
        reverse?: string;
        foreignKey?: string;
        onDelete?: 'cascade' | 'set-null';
      }
  ) & {
    primary?: boolean;
    unique?: boolean;
    filterable?:
      | boolean
      | {
          default?: Value;
        };
    searchable?: boolean;
    orderable?: boolean;
    comparable?: boolean;
    queriable?:
      | boolean
      | {
          roles?: string[];
        };
    creatable?:
      | boolean
      | {
          roles?: string[];
        };
    updatable?:
      | boolean
      | {
          roles?: string[];
        };
    generated?: boolean;
    // The tooltip is "hidden" behind an icon in the admin forms
    tooltip?: string;
    defaultValue?: string | number | ReadonlyArray<string> | undefined;
    // If true the field must be filled within forms but can be null in the database
    required?: boolean;
    indent?: boolean;
    // If true the field is hidden in the admin interface
    hidden?: boolean;

    // temporary fields for the generation of migrations
    deleted?: true;
    oldName?: string;
  };

export type IDField = Extract<ModelField, { type: 'ID' }>;
export type BooleanField = Extract<ModelField, { type: 'Boolean' }>;
export type StringField = Extract<ModelField, { type: 'String' }>;
export type DateTimeField = Extract<ModelField, { type: 'DateTime' }>;
export type IntField = Extract<ModelField, { type: 'Int' }>;
export type FloatField = Extract<ModelField, { type: 'Float' }>;
export type JsonField = Extract<ModelField, { type: 'json' }>;
export type EnumField = Extract<ModelField, { type: 'enum' }>;
export type RawField = Extract<ModelField, { type: 'raw' }>;
export type RelationField = Extract<ModelField, { type: 'relation' }>;

export type Models = Model[];

export type Model = ObjectModel & {
  fieldsByName: Record<string, ModelField>;
  relations: Relation[];
  relationsByName: Record<string, Relation>;
  reverseRelations: ReverseRelation[];
  reverseRelationsByName: Record<string, ReverseRelation>;
};

export type Relation = {
  field: RelationField;
  model: Model;
  reverseRelation: ReverseRelation;
};

export type ReverseRelation = RelationField & {
  model: Model;
  field: RelationField;
  fieldModel: Model;
};
