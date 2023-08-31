import { Field } from '..';
import type { OrderBy } from '../resolvers/arguments';
import type { Value } from '../values';

export type RawModels = RawModel[];

export type RawModel = {
  name: string;
  plural?: string;
  description?: string;
} & (
  | { kind: 'scalar' }
  | { kind: 'enum'; values: string[]; deleted?: true }
  | { kind: 'raw-enum'; values: string[] }
  | { kind: 'interface'; fields: ModelField[] }
  | {
      kind: 'raw';
      fields: RawObjectField[];
    }
  | {
      kind: 'object';
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
    }
);

export type ScalarModel = Extract<RawModel, { kind: 'scalar' }>;
export type EnumModel = Extract<RawModel, { kind: 'enum' }>;
export type RawEnumModel = Extract<RawModel, { kind: 'raw-enum' }>;
export type InterfaceModel = Extract<RawModel, { kind: 'interface' }>;
export type RawObjectModel = Extract<RawModel, { kind: 'raw' }>;
export type ObjectModel = Extract<RawModel, { kind: 'object' }>;

type BaseNumberType = {
  unit?: 'million';
  min?: number;
  max?: number;
};

type FieldBase = Omit<Field, 'type'>;

type FieldBase2 =
  | ({ kind?: 'primitive' | undefined } & (
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
      | { type: 'Upload' }
    ))
  | { kind: 'enum'; type: string; possibleValues?: Value[] }
  | { kind: 'raw'; type: string };

export type RawObjectField = FieldBase & FieldBase2;

export type ModelField = FieldBase &
  (
    | FieldBase2
    | { kind: 'json'; type: string }
    | {
        kind: 'relation';
        type: string;
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
    // If true the field must be filled within forms but can be null in the database
    required?: boolean;
    indent?: boolean;
    // If true the field is hidden in the admin interface
    hidden?: boolean;

    // temporary fields for the generation of migrations
    deleted?: true;
    oldName?: string;

    meta?: Record<string, unknown>;
  };

export type PrimitiveField = Extract<ModelField, { kind?: 'primitive' | undefined }>;
export type IDField = Extract<PrimitiveField, { type: 'ID' }>;
export type BooleanField = Extract<PrimitiveField, { type: 'Boolean' }>;
export type StringField = Extract<PrimitiveField, { type: 'String' }>;
export type DateTimeField = Extract<PrimitiveField, { type: 'DateTime' }>;
export type IntField = Extract<PrimitiveField, { type: 'Int' }>;
export type FloatField = Extract<PrimitiveField, { type: 'Float' }>;
export type UploadField = Extract<PrimitiveField, { type: 'Upload' }>;
export type JsonField = Extract<ModelField, { kind: 'json' }>;
export type EnumField = Extract<ModelField, { kind: 'enum' }>;
export type RawField = Extract<ModelField, { kind: 'raw' }>;
export type RelationField = Extract<ModelField, { kind: 'relation' }>;

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
