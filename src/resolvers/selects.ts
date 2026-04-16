import { Knex } from 'knex';
import {
  ID_ALIAS,
  Joins,
  ResolverNode,
  TYPE_ALIAS,
  addJoin,
  getFragmentSpreads,
  getInlineFragments,
  getJoins,
  getNameOrAlias,
  getSimpleFields,
  isFieldNode,
} from '.';
import { PermissionError, UserInputError, getRole } from '..';
import { getAggregateFieldDefinitions, isQueriableByRole } from '../models/utils';
import { getColumnExpression, getColumnName } from './utils';

export const applySelects = (node: ResolverNode, query: Knex.QueryBuilder, joins: Joins) => {
  if (node.isAggregate) {
    const aggregateFields = new Map(getAggregateFieldDefinitions(node.model).map((field) => [field.outputName, field]));
    const tableAlias = node.ctx.aliases.getShort(node.resultAlias);
    const role = getRole(node.ctx);
    void query.select(
      node.selectionSet.filter(isFieldNode).flatMap((field) => {
        const fieldName = field.name.value;
        if (fieldName === '__typename') {
          return [];
        }

        const fieldAlias = `${tableAlias}__${getNameOrAlias(field)}`;
        if (fieldName === 'COUNT') {
          return [node.ctx.knex.raw(`COUNT(*) as ??`, [fieldAlias])];
        }

        const aggregateField = aggregateFields.get(fieldName);
        if (aggregateField) {
          const sourceField = node.model.getField(aggregateField.sourceFieldName);
          if (!isQueriableByRole(sourceField, role)) {
            throw new PermissionError(
              role,
              'READ',
              `${node.model.name}'s field "${sourceField.name}"`,
              'field permission not available',
            );
          }
          if (sourceField.generateAs?.type === 'expression') {
            const sourceColumn = getColumnExpression(node, aggregateField.sourceFieldName);

            return [node.ctx.knex.raw(`SUM(${sourceColumn}) as ??`, [fieldAlias])];
          }

          return [
            node.ctx.knex.raw('SUM(??.??) as ??', [
              node.ctx.aliases.getShort(sourceField.inherited ? node.rootTableAlias : node.tableAlias),
              getColumnName(sourceField),
              fieldAlias,
            ]),
          ];
        }

        throw new UserInputError(`Unsupported aggregate field "${fieldName}".`);
      }),
    );

    return;
  }

  // Simple field selects
  void query.select(
    ...[
      { tableAlias: node.rootTableAlias, resultAlias: node.resultAlias, field: 'id', fieldAlias: ID_ALIAS },
      ...(node.model.root
        ? [
            {
              tableAlias: node.rootTableAlias,
              resultAlias: node.resultAlias,
              field: 'type',
              fieldAlias: TYPE_ALIAS,
              generateAs: undefined,
            },
          ]
        : []),
      ...getSimpleFields(node)
        .filter((fieldNode) => {
          const field = node.model.fieldsByName[fieldNode.name.value];
          if (!field || field.kind === 'relation' || field.kind === 'custom') {
            return false;
          }

          const role = getRole(node.ctx);
          if (typeof field.queriable === 'object' && !field.queriable.roles?.includes(role)) {
            throw new PermissionError(
              role,
              'READ',
              `${node.model.name}'s field "${field.name}"`,
              'field permission not available',
            );
          }

          return true;
        })
        .map((fieldNode) => {
          const field = node.model.getField(fieldNode.name.value);
          if (node.model.parent && !field.inherited) {
            addJoin(joins, node.rootTableAlias, node.model.name, node.tableAlias, 'id', 'id');
          }
          const fieldAlias = getNameOrAlias(fieldNode);
          if ([ID_ALIAS, TYPE_ALIAS].includes(fieldAlias)) {
            throw new UserInputError(`Keyword ${fieldAlias} is reserved by graphql-magic.`);
          }

          return {
            fieldNode,
            field: fieldNode.name.value,
            tableAlias: field.inherited ? node.rootTableAlias : node.tableAlias,
            resultAlias: node.resultAlias,
            fieldAlias,
            generateAs: field.generateAs,
          };
        }),
    ].map(({ tableAlias, resultAlias, field, fieldAlias, generateAs }) => {
      if (generateAs?.type === 'expression') {
        const resultShortAlias = node.ctx.aliases.getShort(resultAlias);
        const columnExpression = getColumnExpression(node, field);
        const expression = columnExpression.slice(1, -1);

        return node.ctx.knex.raw(`(${expression}) as ??`, [`${resultShortAlias}__${fieldAlias}`]);
      }

      return `${node.ctx.aliases.getShort(tableAlias)}.${field} as ${node.ctx.aliases.getShort(resultAlias)}__${fieldAlias}`;
    }),
  );

  for (const subNode of getInlineFragments(node)) {
    applySelects(subNode, query, joins);
  }

  for (const subNode of getFragmentSpreads(node)) {
    applySelects(subNode, query, joins);
  }

  for (const subNode of getJoins(node, false)) {
    addJoin(joins, node.tableAlias, subNode.rootModel.name, subNode.rootTableAlias, subNode.foreignKey, 'id');

    applySelects(subNode, query, joins);
  }
};
