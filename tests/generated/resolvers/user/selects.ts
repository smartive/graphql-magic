import { Knex } from 'knex';
import { ID_ALIAS, TYPE_ALIAS, isFieldNode, isInlineFragmentNode, isFragmentSpreadNode, getNameOrAlias, getFragmentTypeName, addJoin, UserInputError, PermissionError, getRole } from '../../../../src';
import type { Joins } from '../../../../src';
import type { ConcreteResolverNode } from '../../../../src';

export const applyUserSelects = (
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
      case 'username': {
        void query.select(`${rootShort}.username as ${resultShort}__${fieldAlias}`);
        break;
      }
      case 'role': {
        void query.select(`${rootShort}.role as ${resultShort}__${fieldAlias}`);
        break;
      }
    }
  }

  for (const fragment of node.selectionSet.filter(isFragmentSpreadNode)) {
    const def = node.ctx.info.fragments[fragment.name.value];
    applyUserSelects({
      ...node,
      selectionSet: def.selectionSet.selections,
    }, query, joins);
  }

}

