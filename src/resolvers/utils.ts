import { createHash } from 'crypto';
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
import { UserInputError } from '../errors';
import { get, it } from '../models/utils';
import { Value } from '../values';
import { FieldResolverNode } from './node';

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
  node: FieldResolverNode,
  raw: { [key: string]: undefined | null | string | Date | number }[]
): T[] {
  const tableAlias = node.tableAlias;
  const res = raw.map((entry) => {
    const res: any = {};
    outer: for (const [column, value] of Object.entries(entry)) {
      let current = res;
      const shortParts = column.split('__');
      const fieldName = shortParts.pop();
      const columnWithoutField = shortParts.join('__');
      const longColumn = node.ctx.aliases.getLong(columnWithoutField);
      const longColumnWithoutRoot = longColumn.replace(new RegExp(`^${tableAlias}(__)?`), '');
      const allParts = [tableAlias, ...(longColumnWithoutRoot ? longColumnWithoutRoot.split('__') : []), fieldName];
      for (let i = 0; i < allParts.length - 1; i++) {
        const part = allParts[i];

        if (!current[part]) {
          const idField = [node.ctx.aliases.getShort(allParts.slice(0, i + 1).join('__')), ID_ALIAS].join('__');
          if (!entry[idField]) {
            continue outer;
          }
          current[part] = {};
        }
        current = current[part];
      }
      current[it(fieldName)] = value;
    }
    return res[tableAlias];
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

export type Joins = Record<`${string}:${string}`, { table1Alias: string; column1: string; column2: string }>;

export const applyJoins = (aliases: AliasGenerator, query: Knex.QueryBuilder, joins: Joins) => {
  for (const [tableName, { table1Alias, column1, column2 }] of Object.entries(joins)) {
    const [table, alias] = tableName.split(':');
    const table1ShortAlias = aliases.getShort(table1Alias);
    const table2ShortAlias = aliases.getShort(alias);
    // eslint-disable-next-line @typescript-eslint/no-floating-promises -- we do not need to await knex here
    query.leftJoin(`${table} as ${table2ShortAlias}`, `${table1ShortAlias}.${column1}`, `${table2ShortAlias}.${column2}`);
  }
};

/**
 * Note: modifies the join parameter.
 */
export const addJoin = (
  joins: Joins,
  table1Alias: string,
  table2: string,
  alias2: string,
  column1: string,
  column2: string
) => {
  joins[`${table2}:${alias2}`] ||= { table1Alias, column1, column2 };
};

export class AliasGenerator {
  private reverse: Record<string, string> = {};

  public getShort(long?: string) {
    if (!long) {
      const short = `a${Object.keys(this.reverse).length}`;
      return (this.reverse[short] = short);
    }

    const shortPrefix = long
      .split('__')
      .map((part) => part[0] + part.slice(1).replaceAll(/[a-z]+/g, ''))
      .join('__');
    let postfix = 0;
    let short = shortPrefix + (postfix || '');
    while (short in this.reverse && this.reverse[short] !== long) {
      short = shortPrefix + ++postfix;
    }

    this.reverse[short] = long;
    return short;
  }

  public getLong(short: string) {
    return get(this.reverse, short);
  }
}

export const hash = (s: any) => createHash('md5').update(JSON.stringify(s)).digest('hex');
