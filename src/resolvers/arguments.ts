import type {
  GraphQLObjectType,
  GraphQLSchema,
  InputValueDefinitionNode,
  TypeDefinitionNode,
  TypeNode,
  ValueNode,
} from 'graphql';
import { Kind } from 'graphql';
import { Dictionary } from 'lodash';
import { summon } from '../utils';
import { Value } from '../values';
import { FieldResolverNode } from './node';
import { Maybe, VariableValues } from './utils';

export type Where = Dictionary<Value>;

export type OrderBy = Record<string, 'ASC' | 'DESC'>[];

export type Args = {
  where?: Where | null;
};

export type ListArgs = {
  limit?: number | null | undefined;
  offset?: number | null | undefined;
  orderBy?: string[];
};

export type NormalizedArguments = {
  limit?: number;
  offset?: number;
  orderBy?: OrderBy;
  where?: Where;
  mine?: boolean;
  language?: string;
};

function getRawValue(value: ValueNode, values?: VariableValues): Value {
  switch (value.kind) {
    case Kind.LIST:
      if (!values) {
        return undefined;
      }
      return value.values.map((value) => getRawValue(value, values));
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
        return undefined;
      }
      const res: Dictionary<Value> = {};
      for (const field of value.fields) {
        res[field.name.value] = getRawValue(field.value, values);
      }
      return res;
    }
  }
}

export const normalizeArguments = (node: FieldResolverNode) => {
  const normalizedArguments: NormalizedArguments = {};
  if (node.field.arguments) {
    for (const argument of node.field.arguments) {
      const rawValue = getRawValue(argument.value, node.ctx.info.variableValues);
      const normalizedValue = normalizeValue(
        rawValue,
        summon(
          node.fieldDefinition.arguments || [],
          (arg: InputValueDefinitionNode) => arg.name.value === argument.name.value
        ).type,
        node.ctx.info.schema
      );
      if (normalizedValue === undefined) {
        continue;
      }
      (normalizedArguments as any)[argument.name.value] = normalizedValue;
    }
  }
  return normalizedArguments;
};

export function normalizeValue(value: Value, type: TypeNode, schema: GraphQLSchema): Value {
  switch (type.kind) {
    case Kind.LIST_TYPE: {
      if (Array.isArray(value)) {
        const res: Value[] = [];
        for (const v of value) {
          res.push(normalizeValue(v, type.type, schema));
        }
        return res;
      }

      const normalizedValue = normalizeValue(value, type.type, schema);
      if (normalizedValue === undefined) {
        return undefined;
      }

      return [normalizedValue];
    }
    case Kind.NON_NULL_TYPE:
      return normalizeValue(value, type.type, schema);
    case Kind.NAMED_TYPE:
      return normalizeValueByTypeDefinition(
        value,
        (schema.getType(type.name.value) as Maybe<GraphQLObjectType>)?.astNode,
        schema
      );
  }
}

export const normalizeValueByTypeDefinition = (value: Value, type: Maybe<TypeDefinitionNode>, schema: GraphQLSchema) => {
  if (!type || type.kind !== Kind.INPUT_OBJECT_TYPE_DEFINITION) {
    return value;
  }
  if (!value) {
    return undefined;
  }
  const res: Record<string, Value> = {};
  for (const key of Object.keys(value)) {
    const field = summon(type.fields, (field: InputValueDefinitionNode) => field.name.value === key);
    const normalizedValue = normalizeValue((value as Dictionary<Value>)[key], field.type, schema);
    if (normalizedValue === undefined) {
      continue;
    }
    res[key] = normalizedValue;
  }
  return res;
};
