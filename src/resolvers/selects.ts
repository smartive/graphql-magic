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
import { getColumnName } from './utils';

export const applySelects = (node: ResolverNode, query: Knex.QueryBuilder, joins: Joins) => {
  if (node.isAggregate) {
    void query.select(
      node.selectionSet
        .filter(isFieldNode)
        .map((field) =>
          node.ctx.knex.raw(`COUNT(*) as ??`, [`${node.ctx.aliases.getShort(node.resultAlias)}__${getNameOrAlias(field)}`]),
        ),
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
        const tableShortAlias = node.ctx.aliases.getShort(tableAlias);
        const resultShortAlias = node.ctx.aliases.getShort(resultAlias);
        const expression = generateAs.expression.replace(/\b(\w+)\b/g, (match, columnName) => {
          const field = node.model.fields.find((f) => {
            if (f.name === columnName) {
              return true;
            }
            const actualColumnName = getColumnName(f);

            return actualColumnName === columnName;
          });
          if (field) {
            const actualColumnName = getColumnName(field);

            return `${tableShortAlias}.${actualColumnName}`;
          }

          return match;
        });

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
