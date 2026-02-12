import { Knex } from 'knex';
import { ID_ALIAS, TYPE_ALIAS, isFieldNode, isInlineFragmentNode, isFragmentSpreadNode, getNameOrAlias, getFragmentTypeName, addJoin, UserInputError, PermissionError, getRole } from '../../../../src';
import type { Joins } from '../../../../src';
import type { ConcreteResolverNode } from '../../../../src';
import { applyReactionSelects } from '../reaction/selects';
import { applyUserSelects } from '../user/selects';

export const applyReviewSelects = (
  node: ConcreteResolverNode,
  query: Knex.QueryBuilder,
  joins: Joins,
) => {
  const aliases = node.ctx.aliases;

  if (node.isAggregate) {
    void query.select(
      node.selectionSet
        .filter(isFieldNode)
        .map((field) =>
          node.ctx.knex.raw('COUNT(*) as ??', [`${aliases.getShort(node.resultAlias)}__${getNameOrAlias(field)}`]),
        ),
    );
    return;
  }

  const resultShort = aliases.getShort(node.resultAlias);
  const rootShort = aliases.getShort(node.rootTableAlias);
  const tableShort = aliases.getShort(node.tableAlias);

  void query.select(`${rootShort}.id as ${resultShort}__${ID_ALIAS}`);

  for (const fieldNode of node.selectionSet.filter(isFieldNode)) {
    const fieldName = fieldNode.name.value;
    const fieldAlias = getNameOrAlias(fieldNode);

    if (fieldNode.selectionSet) {
      continue;
    }

    if ([ID_ALIAS, TYPE_ALIAS].includes(fieldAlias)) {
      throw new UserInputError(`Keyword ${fieldAlias} is reserved by graphql-magic.`);
    }

    switch (fieldName) {
      case 'id':
        break;
      case 'type': {
        void query.select(`${rootShort}.type as ${resultShort}__${fieldAlias}`);
        break;
      }
      case 'content': {
        void query.select(`${rootShort}.content as ${resultShort}__${fieldAlias}`);
        break;
      }
      case 'createdAt': {
        void query.select(`${rootShort}.createdAt as ${resultShort}__${fieldAlias}`);
        break;
      }
      case 'updatedAt': {
        void query.select(`${rootShort}.updatedAt as ${resultShort}__${fieldAlias}`);
        break;
      }
      case 'deleted': {
        void query.select(`${rootShort}.deleted as ${resultShort}__${fieldAlias}`);
        break;
      }
      case 'deletedAt': {
        void query.select(`${rootShort}.deletedAt as ${resultShort}__${fieldAlias}`);
        break;
      }
      case 'deleteRootType': {
        void query.select(`${rootShort}.deleteRootType as ${resultShort}__${fieldAlias}`);
        break;
      }
      case 'deleteRootId': {
        void query.select(`${rootShort}.deleteRootId as ${resultShort}__${fieldAlias}`);
        break;
      }
      case 'rating': {
        addJoin(joins, node.rootTableAlias, 'Review', node.tableAlias, 'id', 'id');
        void query.select(`${tableShort}.rating as ${resultShort}__${fieldAlias}`);
        break;
      }
    }
  }

  for (const fragment of node.selectionSet.filter(isFragmentSpreadNode)) {
    const def = node.ctx.info.fragments[fragment.name.value];
    applyReviewSelects({
      ...node,
      selectionSet: def.selectionSet.selections,
    }, query, joins);
  }

  for (const fieldNode of node.selectionSet.filter(isFieldNode).filter(({ selectionSet }) => selectionSet)) {
    const fieldName = fieldNode.name.value;
    const fieldAlias = getNameOrAlias(fieldNode);
    switch (fieldName) {
      case 'parent': {
        const subTableAlias = `${node.tableAlias}__${fieldAlias}`;
        addJoin(joins, node.rootTableAlias, 'Reaction', subTableAlias, 'parentId', 'id');
        applyReactionSelects({
          ...node,
          rootTableAlias: subTableAlias,
          tableAlias: subTableAlias,
          resultAlias: subTableAlias,
          selectionSet: fieldNode.selectionSet!.selections,
          isAggregate: false,
        }, query, joins);
        break;
      }
      case 'createdBy': {
        const subTableAlias = `${node.tableAlias}__${fieldAlias}`;
        addJoin(joins, node.rootTableAlias, 'User', subTableAlias, 'createdById', 'id');
        applyUserSelects({
          ...node,
          rootTableAlias: subTableAlias,
          tableAlias: subTableAlias,
          resultAlias: subTableAlias,
          selectionSet: fieldNode.selectionSet!.selections,
          isAggregate: false,
        }, query, joins);
        break;
      }
      case 'updatedBy': {
        const subTableAlias = `${node.tableAlias}__${fieldAlias}`;
        addJoin(joins, node.rootTableAlias, 'User', subTableAlias, 'updatedById', 'id');
        applyUserSelects({
          ...node,
          rootTableAlias: subTableAlias,
          tableAlias: subTableAlias,
          resultAlias: subTableAlias,
          selectionSet: fieldNode.selectionSet!.selections,
          isAggregate: false,
        }, query, joins);
        break;
      }
      case 'deletedBy': {
        const subTableAlias = `${node.tableAlias}__${fieldAlias}`;
        addJoin(joins, node.rootTableAlias, 'User', subTableAlias, 'deletedById', 'id');
        applyUserSelects({
          ...node,
          rootTableAlias: subTableAlias,
          tableAlias: subTableAlias,
          resultAlias: subTableAlias,
          selectionSet: fieldNode.selectionSet!.selections,
          isAggregate: false,
        }, query, joins);
        break;
      }
    }
  }
}

