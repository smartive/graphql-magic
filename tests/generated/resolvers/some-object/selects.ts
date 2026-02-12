import { Knex } from 'knex';
import { ID_ALIAS, TYPE_ALIAS, isFieldNode, isInlineFragmentNode, isFragmentSpreadNode, getNameOrAlias, getFragmentTypeName, addJoin, UserInputError, PermissionError, getRole } from '../../../../src';
import type { Joins } from '../../../../src';
import type { ConcreteResolverNode } from '../../../../src';
import { applyAnotherObjectSelects } from '../another-object/selects';
import { applyUserSelects } from '../user/selects';

export const applySomeObjectSelects = (
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
      case 'field': {
        void query.select(`${rootShort}.field as ${resultShort}__${fieldAlias}`);
        break;
      }
      case 'float': {
        void query.select(`${rootShort}.float as ${resultShort}__${fieldAlias}`);
        break;
      }
      case 'list': {
        void query.select(`${rootShort}.list as ${resultShort}__${fieldAlias}`);
        break;
      }
      case 'xyz': {
        void query.select(`${rootShort}.xyz as ${resultShort}__${fieldAlias}`);
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
    }
  }

  for (const fragment of node.selectionSet.filter(isFragmentSpreadNode)) {
    const def = node.ctx.info.fragments[fragment.name.value];
    applySomeObjectSelects({
      ...node,
      selectionSet: def.selectionSet.selections,
    }, query, joins);
  }

  for (const fieldNode of node.selectionSet.filter(isFieldNode).filter(({ selectionSet }) => selectionSet)) {
    const fieldName = fieldNode.name.value;
    const fieldAlias = getNameOrAlias(fieldNode);
    switch (fieldName) {
      case 'another': {
        const subTableAlias = `${node.tableAlias}__${fieldAlias}`;
        addJoin(joins, node.tableAlias, 'AnotherObject', subTableAlias, 'anotherId', 'id');
        applyAnotherObjectSelects({
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
        addJoin(joins, node.tableAlias, 'User', subTableAlias, 'createdById', 'id');
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
        addJoin(joins, node.tableAlias, 'User', subTableAlias, 'updatedById', 'id');
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
        addJoin(joins, node.tableAlias, 'User', subTableAlias, 'deletedById', 'id');
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

