import { Dayjs } from 'dayjs';
import {
  ConstArgumentNode,
  ConstDirectiveNode,
  ConstObjectFieldNode,
  ConstValueNode,
  DefinitionNode,
  DirectiveDefinitionNode,
  DocumentNode,
  EnumTypeDefinitionNode,
  EnumValueDefinitionNode,
  FieldDefinitionNode,
  InputObjectTypeDefinitionNode,
  InputValueDefinitionNode,
  InterfaceTypeDefinitionNode,
  Kind,
  ListTypeNode,
  NamedTypeNode,
  NameNode,
  NonNullTypeNode,
  ObjectTypeDefinitionNode,
  ScalarTypeDefinitionNode,
  StringValueNode,
  TypeNode,
} from 'graphql';
import { DateTime } from 'luxon';
import { Directive, Value, Values } from '../values';

export type Field = {
  name: string;
  type: string;
  description?: string;
  list?: boolean;
  nonNull?: boolean;
  defaultValue?: Value;
  args?: Field[];
  directives?: Directive[];
};

export type DirectiveLocation =
  | 'ARGUMENT_DEFINITION'
  | 'INPUT_FIELD_DEFINITION'
  | 'FIELD'
  | 'FIELD_DEFINITION'
  | 'OBJECT'
  | 'INTERFACE'
  | 'INPUT_OBJECT';

export const document = (definitions: DefinitionNode[]): DocumentNode => ({
  kind: Kind.DOCUMENT,
  definitions,
});

export const directive = (nme: string, locations: DirectiveLocation[], fields?: Field[]): DirectiveDefinitionNode => ({
  name: name(nme),
  repeatable: false,
  kind: Kind.DIRECTIVE_DEFINITION,
  arguments: fields && inputValues(fields),
  locations: locations.map(name),
});

export const scalar = (nme: string): ScalarTypeDefinitionNode => ({
  name: name(nme),
  kind: Kind.SCALAR_TYPE_DEFINITION,
});

export const input = (nme: string, fields: Field[], dvs?: Directive[]): InputObjectTypeDefinitionNode => ({
  name: name(nme),
  fields: inputValues(fields),
  kind: Kind.INPUT_OBJECT_TYPE_DEFINITION,
  directives: directives(dvs),
});

export const object = (nme: string, fds: Field[], interfaces?: string[], dvs?: Directive[]): ObjectTypeDefinitionNode => ({
  name: name(nme),
  fields: fields(fds),
  kind: Kind.OBJECT_TYPE_DEFINITION,
  interfaces: interfaces?.map((i) => namedType(i)),
  directives: directives(dvs),
});

export const iface = (nme: string, fds: Field[], interfaces?: string[], dvs?: Directive[]): InterfaceTypeDefinitionNode => ({
  name: name(nme),
  fields: fields(fds),
  kind: Kind.INTERFACE_TYPE_DEFINITION,
  interfaces: interfaces?.map((i) => namedType(i)),
  directives: directives(dvs),
});

export const inputValues = (fields: Field[]): InputValueDefinitionNode[] =>
  fields.map(
    (field): InputValueDefinitionNode => ({
      kind: Kind.INPUT_VALUE_DEFINITION,
      name: name(field.name),
      type: fieldType(field),
      defaultValue: field.defaultValue === undefined ? undefined : value(field.defaultValue),
      directives: directives(field.directives),
    }),
  );

export const fields = (fields: Field[]): FieldDefinitionNode[] =>
  fields.map(
    (field): FieldDefinitionNode => ({
      kind: Kind.FIELD_DEFINITION,
      name: name(field.name),
      type: fieldType(field),
      arguments: field.args?.map((arg) => ({
        kind: Kind.INPUT_VALUE_DEFINITION,
        name: name(arg.name),
        type: fieldType(arg),
        defaultValue: arg.defaultValue === undefined ? undefined : value(arg.defaultValue),
      })),
      directives: directives(field.directives),
    }),
  );

export const inputValue = (
  nme: string,
  type: TypeNode,
  dvs?: Directive[],
  description?: string,
  defaultValue?: Value,
): InputValueDefinitionNode => ({
  name: name(nme),
  type,
  kind: Kind.INPUT_VALUE_DEFINITION,
  directives: directives(dvs),
  defaultValue: defaultValue ? value(defaultValue) : undefined,
  description: description ? (value(description) as StringValueNode) : undefined,
});

export const directives = (directives?: Directive[]): ConstDirectiveNode[] | undefined =>
  directives?.map(
    (directive): ConstDirectiveNode => ({
      kind: Kind.DIRECTIVE,
      name: name(directive.name),
      arguments: args(directive.values),
    }),
  );

export const args = (ags: Values | undefined): readonly ConstArgumentNode[] | undefined =>
  ags?.map(
    (argument): ConstArgumentNode => ({
      kind: Kind.ARGUMENT,
      name: name(argument.name),
      value: value(argument.values),
    }),
  );

export const enm = (nme: string, values: string[]): EnumTypeDefinitionNode => ({
  name: name(nme),
  kind: Kind.ENUM_TYPE_DEFINITION,
  values: values.map(
    (v): EnumValueDefinitionNode => ({
      kind: Kind.ENUM_VALUE_DEFINITION,
      name: name(v),
    }),
  ),
});

export const nonNull = (type: NamedTypeNode | ListTypeNode): NonNullTypeNode => ({
  type,
  kind: Kind.NON_NULL_TYPE,
});

export const namedType = (nme: string): NamedTypeNode => ({
  kind: Kind.NAMED_TYPE,
  name: name(nme),
});

export const list = (type: TypeNode): ListTypeNode => ({
  type,
  kind: Kind.LIST_TYPE,
});

export const name = (name: string): NameNode => ({
  kind: Kind.NAME,
  value: name,
});

export const fieldType = (field: Field) => {
  let type: TypeNode = namedType(field.type);
  if (field.list) {
    type = list(nonNull(type));
  }
  if (field.nonNull) {
    type = nonNull(type);
  }

  return type;
};

export const value = (val: Value = null): ConstValueNode =>
  val === null
    ? {
        kind: Kind.NULL,
      }
    : typeof val === 'boolean'
      ? {
          kind: Kind.BOOLEAN,
          value: val,
        }
      : typeof val === 'number'
        ? {
            kind: Kind.INT,
            value: `${val}`,
          }
        : typeof val === 'string'
          ? {
              kind: Kind.STRING,
              value: val,
            }
          : val instanceof Symbol
            ? {
                kind: Kind.ENUM,
                value: val.description!,
              }
            : Array.isArray(val)
              ? {
                  kind: Kind.LIST,
                  values: val.map(value),
                }
              : val instanceof DateTime
                ? {
                    kind: Kind.STRING,
                    value: val.toString(),
                  }
                : val instanceof Dayjs
                  ? {
                      kind: Kind.STRING,
                      value: val.toISOString(),
                    }
                  : typeof val === 'object'
                    ? {
                        kind: Kind.OBJECT,
                        fields: Object.keys(val).map(
                          (nme): ConstObjectFieldNode => ({
                            kind: Kind.OBJECT_FIELD,
                            name: name(nme),
                            value: value(val[nme]),
                          }),
                        ),
                      }
                    : doThrow(`Unsupported value ${val}`);

const doThrow = (message: string) => {
  throw new Error(message);
};
