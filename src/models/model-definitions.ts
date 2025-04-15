import { Field } from '..';
import type { OrderBy } from '../resolvers/arguments';
import type { Value } from '../values';

type BaseNumberType = {
  unit?: 'million';
  min?: number;
  max?: number;
};

type FieldDefinitionBase = Omit<Field, 'type'>;

type FieldDefinitionBase2 =
  | ({ kind?: 'primitive' | undefined } & (
      | { type: 'ID' }
      | { type: 'Boolean' }
      | {
          type: 'String';
          stringType?: 'email' | 'url' | 'phone' | 'multipleEmail' | 'richText';
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
  | { kind: 'custom'; type: string };

export type ObjectFieldDefinition = FieldDefinitionBase & FieldDefinitionBase2;

export type EntityFieldDefinition = FieldDefinitionBase &
  (
    | FieldDefinitionBase2
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
    reverseFilterable?: boolean;
    searchable?: boolean;
    orderable?: boolean;
    comparable?: boolean;
    queriable?:
      | boolean
      | {
          roles?: readonly string[];
        };
    creatable?:
      | boolean
      | {
          roles?: readonly string[];
        };
    updatable?:
      | boolean
      | {
          roles?: readonly string[];
        };
    // The tooltip is "hidden" behind an icon in the admin forms
    tooltip?: string;
    // If true the field must be filled within forms but can be null in the database
    required?: boolean;
    indent?: boolean;
    // If true the field is hidden in the admin interface
    hidden?: boolean;

    // Temporary fields for the generation of migrations
    deleted?: true;
    oldName?: string;

    // For your additional information about the field
    meta?: Record<string, unknown>;

    // Set by graphql-magic, leave empty
    generated?: boolean;
    inherited?: boolean;
  };

export type PrimitiveFieldDefinition = Extract<EntityFieldDefinition, { kind?: 'primitive' | undefined }>;
export type IDFieldDefinition = Extract<PrimitiveFieldDefinition, { type: 'ID' }>;
export type BooleanFieldDefinition = Extract<PrimitiveFieldDefinition, { type: 'Boolean' }>;
export type StringFieldDefinition = Extract<PrimitiveFieldDefinition, { type: 'String' }>;
export type DateTimeFieldDefinition = Extract<PrimitiveFieldDefinition, { type: 'DateTime' }>;
export type IntFieldDefinition = Extract<PrimitiveFieldDefinition, { type: 'Int' }>;
export type FloatFieldDefinition = Extract<PrimitiveFieldDefinition, { type: 'Float' }>;
export type UploadFieldDefinition = Extract<PrimitiveFieldDefinition, { type: 'Upload' }>;
export type JsonFieldDefinition = Extract<EntityFieldDefinition, { kind: 'json' }>;
export type EnumFieldDefinition = Extract<EntityFieldDefinition, { kind: 'enum' }>;
export type CustomFieldDefinition = Extract<EntityFieldDefinition, { kind: 'custom' }>;
export type RelationFieldDefinition = Extract<EntityFieldDefinition, { kind: 'relation' }>;

export type ModelDefinition = {
  name: string;
  plural?: string;
  description?: string;
} & (
  | { kind: 'scalar' }
  | { kind: 'enum'; values: readonly string[]; deleted?: true }
  | { kind: 'raw-enum'; values: readonly string[] }
  | { kind: 'interface'; fields: EntityFieldDefinition[] }
  | {
      kind: 'input';
      fields: ObjectFieldDefinition[];
    }
  | {
      kind: 'object';
      fields: ObjectFieldDefinition[];
    }
  | {
      kind: 'entity';
      root?: boolean;
      parent?: string;
      interfaces?: readonly string[];
      queriable?: boolean;
      listQueriable?: boolean;
      creatable?: boolean | { createdBy?: Partial<RelationFieldDefinition>; createdAt?: Partial<DateTimeFieldDefinition> };
      updatable?: boolean | { updatedBy?: Partial<RelationFieldDefinition>; updatedAt?: Partial<DateTimeFieldDefinition> };
      deletable?:
        | boolean
        | {
            deleted?: Partial<BooleanFieldDefinition>;
            deletedBy?: Partial<RelationFieldDefinition>;
            deletedAt?: Partial<DateTimeFieldDefinition>;
          };
      displayField?: string;
      defaultOrderBy?: OrderBy;
      fields: EntityFieldDefinition[];

      // temporary fields for the generation of migrations
      deleted?: true;
      oldName?: string;
    }
);

export type ScalarModelDefinition = Extract<ModelDefinition, { kind: 'scalar' }>;
export type EnumModelDefinition = Extract<ModelDefinition, { kind: 'enum' }>;
export type RawEnumModelDefinition = Extract<ModelDefinition, { kind: 'raw-enum' }>;
export type InterfaceModelDefinition = Extract<ModelDefinition, { kind: 'interface' }>;
export type ObjectModelDefinition = Extract<ModelDefinition, { kind: 'object' }>;
export type InputModelDefinition = Extract<ModelDefinition, { kind: 'input' }>;
export type EntityModelDefinition = Extract<ModelDefinition, { kind: 'entity' }>;

export type ModelDefinitions = ModelDefinition[];
