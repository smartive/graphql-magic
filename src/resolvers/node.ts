import type {
  FieldDefinitionNode,
  FieldNode,
  FragmentDefinitionNode,
  InlineFragmentNode,
  ObjectTypeDefinitionNode,
  SelectionNode,
} from 'graphql';

import { FullContext } from '../context';
import { EntityModel, Relation } from '../models/models';
import { isObjectModel } from '../models/utils';
import { get, summonByKey } from '../utils/getters';
import {
  getFragmentTypeName,
  getNameOrAlias,
  getType,
  getTypeName,
  isFieldNode,
  isFragmentSpreadNode,
  isInlineFragmentNode,
  isListType,
} from './utils';

export type ResolverNode = {
  ctx: FullContext;

  rootModel: EntityModel;
  rootTableAlias: string;

  model: EntityModel;
  tableAlias: string;

  resultAlias: string;

  baseTypeDefinition: ObjectTypeDefinitionNode;
  baseModel?: EntityModel;

  typeDefinition: ObjectTypeDefinitionNode;

  selectionSet: readonly SelectionNode[];
};

export type FieldResolverNode = ResolverNode & {
  field: FieldNode;
  fieldDefinition: FieldDefinitionNode;
  isList: boolean;
};

export type RelationResolverNode = FieldResolverNode & {
  relation: Relation;
  foreignKey: string;
};

export const getResolverNode = ({
  ctx,
  node,
  tableAlias,
  rootTableAlias,
  resultAlias,
  baseTypeDefinition,
  typeName,
}: {
  ctx: FullContext;
  node: FieldNode | InlineFragmentNode | FragmentDefinitionNode;
  baseTypeDefinition: ObjectTypeDefinitionNode;
  tableAlias: string;
  rootTableAlias: string;
  resultAlias: string;
  typeName: string;
}): ResolverNode => {
  const model = ctx.models.getModel(typeName, 'entity');
  const rootModel = model.parent ? ctx.models.getModel(model.parent, 'entity') : model;

  return {
    ctx,

    rootModel,
    rootTableAlias,

    model,
    tableAlias,

    resultAlias,

    baseTypeDefinition,
    baseModel: ctx.models.entities.find((model) => model.name === baseTypeDefinition.name.value),
    typeDefinition: getType(ctx.info.schema, typeName),
    selectionSet: get(node.selectionSet, 'selections'),
  };
};

export const getRootFieldNode = ({
  ctx,
  node,
  baseTypeDefinition,
}: {
  ctx: FullContext;
  node: FieldNode;
  baseTypeDefinition: ObjectTypeDefinitionNode;
}): FieldResolverNode => {
  const fieldName = node.name.value;
  const fieldDefinition = summonByKey(baseTypeDefinition.fields || [], 'name.value', fieldName);

  const typeName = getTypeName(fieldDefinition.type);
  const model = ctx.models.getModel(typeName, 'entity');
  const rootModel = model.parent ? ctx.models.getModel(model.parent, 'entity') : model;

  return {
    ctx,

    rootModel,
    rootTableAlias: rootModel.name,

    model,
    tableAlias: model.name,

    resultAlias: rootModel.name,

    baseTypeDefinition,
    typeDefinition: getType(ctx.info.schema, typeName),
    selectionSet: get(node.selectionSet, 'selections'),
    field: node,
    fieldDefinition,
    isList: isListType(fieldDefinition.type),
  };
};

export const getSimpleFields = (node: ResolverNode) => {
  return node.selectionSet.filter(isFieldNode).filter((selection) => {
    if (!selection.selectionSet) {
      return true;
    }

    return node.model.fields.some(({ kind: type, name }) => type === 'json' && name === selection.name.value);
  });
};

export const getInlineFragments = (node: ResolverNode) =>
  node.selectionSet.filter(isInlineFragmentNode).map((subNode) =>
    getResolverNode({
      ctx: node.ctx,
      node: subNode,

      rootTableAlias: node.rootTableAlias,

      tableAlias: node.tableAlias + '__' + getFragmentTypeName(subNode),

      resultAlias: node.resultAlias,

      baseTypeDefinition: node.baseTypeDefinition,
      typeName: getFragmentTypeName(subNode),
    })
  );

export const getFragmentSpreads = (node: ResolverNode) =>
  node.selectionSet.filter(isFragmentSpreadNode).map((subNode) =>
    getResolverNode({
      ctx: node.ctx,
      node: node.ctx.info.fragments[subNode.name.value],

      rootTableAlias: node.rootTableAlias,

      tableAlias: node.tableAlias,

      resultAlias: node.resultAlias,

      baseTypeDefinition: node.baseTypeDefinition,
      typeName: node.model.name,
    })
  );

export const getJoins = (node: ResolverNode, toMany: boolean) => {
  const nodes: RelationResolverNode[] = [];
  for (const subNode of node.selectionSet.filter(isFieldNode).filter(({ selectionSet }) => selectionSet)) {
    const ctx = node.ctx;
    const baseTypeDefinition = node.typeDefinition;
    const fieldName = subNode.name.value;
    const fieldNameOrAlias = getNameOrAlias(subNode);
    const fieldDefinition = summonByKey(baseTypeDefinition.fields || [], 'name.value', fieldName);

    const typeName = getTypeName(fieldDefinition.type);

    if (isObjectModel(ctx.models.getModel(typeName))) {
      continue;
    }

    const baseModel = ctx.models.getModel(baseTypeDefinition.name.value, 'entity');

    const relation = (toMany ? baseModel.reverseRelationsByName : baseModel.relationsByName)[fieldName];
    if (!relation) {
      continue;
    }

    const tableAlias = node.tableAlias + '__' + fieldNameOrAlias;
    const model = ctx.models.getModel(typeName, 'entity');
    const rootModel = model;

    nodes.push({
      ctx,

      rootModel,
      rootTableAlias: tableAlias,

      model,
      tableAlias,

      resultAlias: tableAlias,

      baseTypeDefinition,
      baseModel,
      typeDefinition: getType(ctx.info.schema, typeName),
      selectionSet: get(subNode.selectionSet, 'selections'),
      field: subNode,
      fieldDefinition,
      relation,
      foreignKey: relation.field.foreignKey,
      isList: isListType(fieldDefinition.type),
    });
  }
  return nodes;
};
