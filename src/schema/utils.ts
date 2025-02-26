import { Dayjs } from 'dayjs';
import {
  ArgumentNode,
  DefinitionNode,
  DirectiveDefinitionNode,
  DirectiveNode,
  DocumentNode,
  EnumTypeDefinitionNode,
  EnumValueDefinitionNode,
  FieldDefinitionNode,
  InputObjectTypeDefinitionNode,
  InputValueDefinitionNode,
  InterfaceTypeDefinitionNode,
  ListTypeNode,
  NamedTypeNode,
  NameNode,
  NonNullTypeNode,
  ObjectFieldNode,
  ObjectTypeDefinitionNode,
  ScalarTypeDefinitionNode,
  StringValueNode,
  TypeNode,
  ValueNode,
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
  kind: 'Document',
  definitions,
});

export const directive = (nme: string, locations: DirectiveLocation[], fields?: Field[]): DirectiveDefinitionNode => ({
  name: name(nme),
  repeatable: false,
  kind: 'DirectiveDefinition',
  arguments: fields && inputValues(fields),
  locations: locations.map(name),
});

export const scalar = (nme: string): ScalarTypeDefinitionNode => ({
  name: name(nme),
  kind: 'ScalarTypeDefinition',
});

export const input = (nme: string, fields: Field[], dvs?: Directive[]): InputObjectTypeDefinitionNode => ({
  name: name(nme),
  fields: inputValues(fields),
  kind: 'InputObjectTypeDefinition',
  directives: directives(dvs),
});

export const object = (nme: string, fds: Field[], interfaces?: string[], dvs?: Directive[]): ObjectTypeDefinitionNode => ({
  name: name(nme),
  fields: fields(fds),
  kind: 'ObjectTypeDefinition',
  interfaces: interfaces?.map((i) => namedType(i)),
  directives: directives(dvs),
});

export const iface = (nme: string, fds: Field[], interfaces?: string[], dvs?: Directive[]): InterfaceTypeDefinitionNode => ({
  name: name(nme),
  fields: fields(fds),
  kind: 'InterfaceTypeDefinition',
  interfaces: interfaces?.map((i) => namedType(i)),
  directives: directives(dvs),
});

export const inputValues = (fields: Field[]): InputValueDefinitionNode[] =>
  fields.map(
    (field): InputValueDefinitionNode => ({
      kind: 'InputValueDefinition',
      name: name(field.name),
      type: fieldType(field),
      defaultValue: field.defaultValue === undefined ? undefined : value(field.defaultValue),
      directives: directives(field.directives),
    }),
  );

export const fields = (fields: Field[]): FieldDefinitionNode[] =>
  fields.map(
    (field): FieldDefinitionNode => ({
      kind: 'FieldDefinition',
      name: name(field.name),
      type: fieldType(field),
      arguments: field.args?.map((arg) => ({
        kind: 'InputValueDefinition',
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
  kind: 'InputValueDefinition',
  directives: directives(dvs),
  defaultValue: defaultValue ? value(defaultValue) : undefined,
  description: description ? (value(description) as StringValueNode) : undefined,
});

export const directives = (directives?: Directive[]): DirectiveNode[] | undefined =>
  directives?.map(
    (directive): DirectiveNode => ({
      kind: 'Directive',
      name: name(directive.name),
      arguments: args(directive.values),
    }),
  );

export const args = (ags: Values | undefined): readonly ArgumentNode[] | undefined =>
  ags?.map(
    (argument): ArgumentNode => ({
      kind: 'Argument',
      name: name(argument.name),
      value: value(argument.values),
    }),
  );

export const enm = (nme: string, values: string[]): EnumTypeDefinitionNode => ({
  name: name(nme),
  kind: 'EnumTypeDefinition',
  values: values.map(
    (v): EnumValueDefinitionNode => ({
      kind: 'EnumValueDefinition',
      name: name(v),
    }),
  ),
});

export const nonNull = (type: NamedTypeNode | ListTypeNode): NonNullTypeNode => ({
  type,
  kind: 'NonNullType',
});

export const namedType = (nme: string): NamedTypeNode => ({
  kind: 'NamedType',
  name: name(nme),
});

export const list = (type: TypeNode): ListTypeNode => ({
  type,
  kind: 'ListType',
});

export const name = (name: string): NameNode => ({
  kind: 'Name',
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

export const value = (val: Value = null): ValueNode =>
  val === null
    ? {
        kind: 'NullValue',
      }
    : typeof val === 'boolean'
      ? {
          kind: 'BooleanValue',
          value: val,
        }
      : typeof val === 'number'
        ? {
            kind: 'IntValue',
            value: `${val}`,
          }
        : typeof val === 'string'
          ? {
              kind: 'StringValue',
              value: val,
            }
          : val instanceof Symbol
            ? {
                kind: 'EnumValue',
                value: val.description!,
              }
            : Array.isArray(val)
              ? {
                  kind: 'ListValue',
                  values: val.map(value),
                }
              : val instanceof DateTime
                ? {
                    kind: 'StringValue',
                    value: val.toString(),
                  }
                : val instanceof Dayjs
                  ? {
                      kind: 'StringValue',
                      value: val.toISOString(),
                    }
                  : typeof val === 'object'
                    ? {
                        kind: 'ObjectValue',
                        fields: Object.keys(val).map(
                          (nme): ObjectFieldNode => ({
                            kind: 'ObjectField',
                            name: name(nme),
                            value: value(val[nme]),
                          }),
                        ),
                      }
                    : doThrow(`Unsupported value ${val}`);

const doThrow = (message: string) => {
  throw new Error(message);
};
