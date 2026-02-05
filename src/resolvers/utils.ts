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
import isEqual from 'lodash/isEqual';
import { Entity, EntityField, EntityModel, ManyToManyRelation } from '..';
import { UserInputError } from '../errors';
import { get, it } from '../models/utils';
import { Value } from '../values';
import { FieldResolverNode, ResolverNode } from './node';

export const ID_ALIAS = 'ID';
export const TYPE_ALIAS = 'TYPE';

export type VariableValues = Record<string, Value>;

export const getTypeName = (t: TypeNode): string => {
  switch (t.kind) {
    case 'ListType':
    case 'NonNullType':
      return getTypeName(t.type);
    case 'NamedType':
      return t.name.value;
    default:
      throw new Error(`Unknown type node kind: ${t.kind}`);
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
  raw: Record<string, undefined | null | string | Date | number>[],
): T[] {
  const resultAlias = node.resultAlias;
  const res = raw.map((entry) => {
    const res: any = {};
    outer: for (const [column, value] of Object.entries(entry)) {
      let current = res;
      const [, columnWithoutField, fieldName] = column.match(/^(.*\w)__(\w+)$/)!;
      const longColumn = node.ctx.aliases.getLong(columnWithoutField);
      const longColumnWithoutRoot = longColumn.replace(new RegExp(`^${resultAlias}(__)?`), '');
      const allParts = [resultAlias, ...(longColumnWithoutRoot ? longColumnWithoutRoot.split('__') : []), fieldName];
      for (let i = 0; i < allParts.length - 1; i++) {
        const part = allParts[i];

        if (!current[part]) {
          if (!node.isAggregate) {
            const idField = [node.ctx.aliases.getShort(allParts.slice(0, i + 1).join('__')), ID_ALIAS].join('__');
            if (!entry[idField]) {
              continue outer;
            }
          }
          current[part] = {
            PARENT: current,
          };
        }
        current = current[part];
      }

      current[it(fieldName)] = value;
    }

    return res[resultAlias];
  });

  return res;
}

export const ors = (query: Knex.QueryBuilder, [first, ...rest]: ((query: Knex.QueryBuilder) => Knex.QueryBuilder)[]) => {
  if (!first) {
    return query;
  }

  return query.where((subQuery) => {
    void subQuery.where((subSubQuery) => {
      void first(subSubQuery);
    });
    for (const cb of rest) {
      void subQuery.orWhere((subSubQuery) => {
        void cb(subSubQuery);
      });
    }
  });
};

export const getNameOrAlias = (node: FieldNode) => {
  const name = node.alias ? node.alias.value : node.name.value;

  if ([ID_ALIAS].includes(name)) {
    throw new UserInputError(`"${name}" can not be used as alias since it's a reserved word`);
  }

  return name;
};

export type Ops<T> = ((target: T) => T)[];

export type QueryBuilderOps = Ops<Knex.QueryBuilder>;

export const apply = <T>(target: T, ops: ((target: T) => T)[]) => ops.reduce((target, op) => op(target), target);

type Join = { table1Alias: string; column1: string; table2Name: string; table2Alias: string; column2: string };
export type Joins = Join[];

export const applyJoins = (aliases: AliasGenerator, query: Knex.QueryBuilder, joins: Joins) => {
  for (const { table1Alias, table2Name, table2Alias, column1, column2 } of joins) {
    const table1ShortAlias = aliases.getShort(table1Alias);
    const table2ShortAlias = aliases.getShort(table2Alias);
    void query.leftJoin(
      `${table2Name} as ${table2ShortAlias}`,
      `${table1ShortAlias}.${column1}`,
      `${table2ShortAlias}.${column2}`,
    );
  }
};

/**
 * Note: modifies the join parameter.
 */
export const addJoin = (
  joins: Joins,
  table1Alias: string,
  table2Name: string,
  table2Alias: string,
  column1: string,
  column2: string,
) => {
  const join = { table1Alias, table2Name, table2Alias, column1, column2 };
  const existingJoin = joins.find((j) => j.table2Alias === join.table2Alias);
  if (existingJoin) {
    if (!isEqual(existingJoin, join)) {
      throw new Error(`Join collision: ${existingJoin}, ${join}`);
    }
  } else {
    joins.push(join);
  }
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

export const getColumnName = (field: EntityField) =>
  field.kind === 'relation' ? field.foreignKey || `${field.name}Id` : field.name;

export const getColumn = (
  node: Pick<ResolverNode, 'model' | 'ctx' | 'rootTableAlias' | 'tableAlias'>,
  fieldName: string,
) => {
  const field = node.model.fields.find((field) => field.name === fieldName)!;

  return `${node.ctx.aliases.getShort(field.inherited ? node.rootTableAlias : node.tableAlias)}.${getColumnName(field)}`;
};

const replaceColumnReferences = (
  expression: string,
  node: Pick<ResolverNode, 'model' | 'ctx' | 'rootTableAlias' | 'tableAlias'>,
) => {
  const replaceField = (columnName: string) => {
    const referencedField = node.model.fields.find((f) => getColumnName(f) === columnName);
    if (referencedField) {
      const actualColumnName = getColumnName(referencedField);
      const referencedTableAlias = referencedField.inherited ? node.rootTableAlias : node.tableAlias;

      return {
        tableAlias: node.ctx.aliases.getShort(referencedTableAlias),
        columnName: actualColumnName,
      };
    }

    return null;
  };

  return expression.replace(/"(\w+)"/g, (match, columnName) => {
    const replacement = replaceField(columnName);
    if (replacement) {
      return `"${replacement.tableAlias}"."${replacement.columnName}"`;
    }

    return match;
  });
};

export const getColumnExpression = (
  node: Pick<ResolverNode, 'model' | 'ctx' | 'rootTableAlias' | 'tableAlias'>,
  fieldName: string,
) => {
  const field = node.model.fields.find((field) => field.name === fieldName)!;

  if (field.generateAs?.type === 'expression') {
    const expression = replaceColumnReferences(field.generateAs.expression, node);

    return `(${expression})`;
  }

  return getColumn(node, fieldName);
};

export const getTechnicalDisplay = (model: EntityModel, entity: Entity) =>
  model.displayField && entity[model.displayField]
    ? `${model.name} "${entity[model.displayField]}" (${entity.id})`
    : entity.id
      ? `${model.name} ${entity.id}`
      : model.name;

export const fetchDisplay = async (knex: Knex, model: EntityModel, entity: Entity) => {
  if (model.isManyToManyRelation) {
    return fetchManyToManyDisplay(knex, model, entity);
  }

  return getDisplay(model, entity);
};

export const getDisplay = (model: EntityModel, entity: Entity) =>
  (entity[model.displayField || 'id'] || entity.id) as string;

export const fetchManyToManyDisplay = async (knex: Knex, model: EntityModel, entity: Entity) => {
  const manyToManyRelation = model.asManyToManyRelation;
  const leftEntity = await knex
    .from(manyToManyRelation.sourceModel.name)
    .where({ id: entity[manyToManyRelation.relationFromSource.field.foreignKey] })
    .first();
  const rightEntity = await knex
    .from(manyToManyRelation.targetModel.name)
    .where({ id: entity[manyToManyRelation.relationToTarget.field.foreignKey] })
    .first();

  return getManyToManyDisplay(manyToManyRelation, leftEntity, rightEntity);
};

export const getManyToManyDisplay = async (
  manyToManyRelation: ManyToManyRelation,
  sourceEntity: Entity,
  targetEntity: Entity,
) =>
  `${getDisplay(manyToManyRelation.sourceModel, sourceEntity)} ↔ ${getDisplay(manyToManyRelation.targetModel, targetEntity)}`;
