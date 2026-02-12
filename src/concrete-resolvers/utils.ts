import type { FieldDefinitionNode, FieldNode, SelectionNode, ValueNode } from 'graphql';
import { GraphQLSchema, Kind } from 'graphql';
import { FullContext } from '../context';
import { summonByKey } from '../models/utils';
import { PermissionStack } from '../permissions/generate';
import { NormalizedArguments, normalizeValue } from '../resolvers/arguments';
import { AliasGenerator, Entry, ID_ALIAS } from '../resolvers/utils';
import { Value } from '../values';

export type ConcreteResolverNode = {
  ctx: FullContext;
  rootTableAlias: string;
  tableAlias: string;
  resultAlias: string;
  selectionSet: readonly SelectionNode[];
  isAggregate: boolean;
};

export type ConcreteFieldNode = ConcreteResolverNode & {
  field: FieldNode;
  fieldDefinition: FieldDefinitionNode;
  isList: boolean;
};

export type ConcreteFilterNode = {
  ctx: FullContext;
  rootTableAlias: string;
  tableAlias: string;
};

export type VerifiedPermissionStacks = Record<string, PermissionStack>;

const getRawValue = (value: ValueNode, values?: Record<string, Value>): Value => {
  switch (value.kind) {
    case Kind.LIST:
      if (!values) {
        return;
      }

      return value.values.map((v) => getRawValue(v, values));
    case Kind.VARIABLE:
      return values?.[value.name.value];
    case Kind.INT:
      return parseInt(value.value, 10);
    case Kind.NULL:
      return null;
    case Kind.FLOAT:
      return parseFloat(value.value);
    case Kind.STRING:
    case Kind.BOOLEAN:
    case Kind.ENUM:
      return value.value;
    case Kind.OBJECT: {
      if (!value.fields.length) {
        return;
      }
      const res: Record<string, Value> = {};
      for (const field of value.fields) {
        res[field.name.value] = getRawValue(field.value, values);
      }

      return res;
    }
  }
};

export const concreteNormalizeArguments = (
  field: FieldNode,
  fieldDefinition: FieldDefinitionNode,
  schema: GraphQLSchema,
  variableValues: Record<string, Value>,
): NormalizedArguments => {
  const normalizedArguments: NormalizedArguments = {};
  if (field.arguments) {
    for (const argument of field.arguments) {
      const rawValue = getRawValue(argument.value, variableValues);
      const normalizedValue = normalizeValue(
        rawValue,
        summonByKey(fieldDefinition.arguments || [], 'name.value', argument.name.value).type,
        schema,
      );
      if (normalizedValue === undefined) {
        continue;
      }
      (normalizedArguments as Record<string, Value>)[argument.name.value] = normalizedValue;
    }
  }

  return normalizedArguments;
};

export const concreteHydrate = <T extends Entry>(
  resultAlias: string,
  aliases: AliasGenerator,
  isAggregate: boolean,
  raw: Record<string, undefined | null | string | Date | number>[],
): T[] =>
  raw.map((entry) => {
    const res: Record<string, unknown> = {};
    outer: for (const [column, value] of Object.entries(entry)) {
      let current: Record<string, unknown> = res;
      const match = column.match(/^(.*\w)__(\w+)$/);
      if (!match) {
        continue;
      }
      const [, columnWithoutField, fieldName] = match;
      const longColumn = aliases.getLong(columnWithoutField);
      const longColumnWithoutRoot = longColumn.replace(new RegExp(`^${resultAlias}(__)?`), '');
      const allParts = [resultAlias, ...(longColumnWithoutRoot ? longColumnWithoutRoot.split('__') : []), fieldName];
      for (let i = 0; i < allParts.length - 1; i++) {
        const part = allParts[i];

        if (!current[part]) {
          if (!isAggregate) {
            const idField = [aliases.getShort(allParts.slice(0, i + 1).join('__')), ID_ALIAS].join('__');
            if (!entry[idField]) {
              continue outer;
            }
          }
          current[part] = { PARENT: current };
        }
        current = current[part] as Record<string, unknown>;
      }

      current[fieldName] = value;
    }

    return res[resultAlias] as T;
  });
