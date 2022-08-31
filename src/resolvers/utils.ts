import { UserInputError } from 'apollo-server-errors';
import type {
  ASTNode,
  FieldNode,
  FragmentDefinitionNode,
  FragmentSpreadNode,
  GraphQLObjectType,
  GraphQLSchema,
  InlineFragmentNode,
  TypeNode,
} from 'graphql';
import { Kind } from 'graphql';
import { Knex } from 'knex';
import type { Dictionary } from 'lodash';
import { get } from '../utils';
import { Value } from '../values';

export const ID_ALIAS = 'ID';

export type VariableValues = {
  [variableName: string]: Value;
};

export const getTypeName = (t: TypeNode): string => {
  switch (t.kind) {
    case 'ListType':
    case 'NonNullType':
      return getTypeName(t.type);
    default:
      return t.name.value;
  }
};

export const isListType = (type: TypeNode): boolean => {
  switch (type.kind) {
    case 'ListType':
      return true;
    case 'NonNullType':
      return isListType(type.type);
    default:
      return false;
  }
};

export const isFieldNode = (n: ASTNode): n is FieldNode => n.kind === Kind.FIELD;

export const isInlineFragmentNode = (n: ASTNode): n is InlineFragmentNode => n.kind === Kind.INLINE_FRAGMENT;

export const isFragmentSpreadNode = (n: ASTNode): n is FragmentSpreadNode => n.kind === Kind.FRAGMENT_SPREAD;

export type Maybe<T> = null | undefined | T;

export const getType = (schema: GraphQLSchema, name: string) =>
  get(schema.getType(name) as Maybe<GraphQLObjectType>, 'astNode');

export const getFragmentTypeName = (node: InlineFragmentNode | FragmentDefinitionNode) =>
  get(get(node.typeCondition, 'name'), 'value');

export type Entry = {
  [ID_ALIAS]: string;
  [field: string]: null | string | number | Entry | Entry[];
};

export function hydrate<T extends Entry>(
  table: string,
  raw: { [key: string]: undefined | null | string | Date | number }[]
): T[] {
  const res = raw.map((entry) => {
    const res: Dictionary<any> = {};
    Object.keys(entry).forEach((column) => {
      let current = res;
      const allParts = column.split('__');
      for (let i = 0; i < allParts.length - 1; i++) {
        const part = allParts[i];

        if (!current[part]) {
          const idField = [...allParts.slice(0, i + 1), ID_ALIAS].join('__');
          if (!entry[idField]) {
            return;
          }
          current[part] = {};
        }
        current = current[part];
      }
      const fieldName = allParts[allParts.length - 1];
      current[fieldName] = entry[column];
    });

    return res[table];
  });

  return res;
}

export const ors = (query: Knex.QueryBuilder, [first, ...rest]: ((query: Knex.QueryBuilder) => Knex.QueryBuilder)[]) => {
  if (!first) {
    return query;
  }
  return query.where((subQuery) => {
    // eslint-disable-next-line @typescript-eslint/no-floating-promises -- we do not need to await knex here
    subQuery.where((subSubQuery) => {
      // eslint-disable-next-line @typescript-eslint/no-floating-promises -- we do not need to await knex here
      first(subSubQuery);
    });
    for (const cb of rest) {
      // eslint-disable-next-line @typescript-eslint/no-floating-promises -- we do not need to await knex here
      subQuery.orWhere((subSubQuery) => {
        // eslint-disable-next-line @typescript-eslint/no-floating-promises -- we do not need to await knex here
        cb(subSubQuery);
      });
    }
  });
};

export const getNameOrAlias = (node: FieldNode) => {
  const name = node.alias ? node.alias.value : node.name.value;

  if ([ID_ALIAS].indexOf(name) >= 0) {
    throw new UserInputError(`"${name}" can not be used as alias since it's a reserved word`);
  }

  return name;
};

export type Ops<T> = ((target: T) => T)[];

export const apply = <T>(target: T, ops: ((target: T) => T)[]) => ops.reduce((target, op) => op(target), target);

export type Joins = Dictionary<
  Dictionary<{
    column1: string;
    column2: string;
  }>
>;

export const applyJoins = (query: Knex.QueryBuilder, joins: Joins) => {
  for (const table of Object.keys(joins)) {
    for (const alias of Object.keys(joins[table])) {
      const { column1, column2 } = joins[table][alias];
      // eslint-disable-next-line @typescript-eslint/no-floating-promises -- we do not need to await knex here
      query.leftJoin(`${table} as ${alias}`, column1, column2);
    }
  }
};

/**
 * Note: modifies the join parameter.
 */
export const addJoin = (joins: Joins, table: string, alias: string, column1: string, column2: string) => {
  if (!joins[table]) {
    joins[table] = {};
  }
  if (!joins[table][alias]) {
    joins[table][alias] = {
      column1,
      column2,
    };
  }
};
