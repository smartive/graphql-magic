import type {
  FieldDefinitionNode,
  FieldNode,
  FragmentDefinitionNode,
  InlineFragmentNode,
  ObjectTypeDefinitionNode,
  SelectionNode,
} from 'graphql';

import { FullContext } from '../context';
import { isJsonObjectModel, Model } from '../models';
import { get, summonByKey, summonByName } from '../utils';
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

  tableName: string;
  tableAlias: string;
  shortTableAlias: string;

  baseTypeDefinition: ObjectTypeDefinitionNode;
  baseModel?: Model;

  typeDefinition: ObjectTypeDefinitionNode;
  model: Model;

  selectionSet: readonly SelectionNode[];
};

export type FieldResolverNode = ResolverNode & {
  field: FieldNode;
  fieldDefinition: FieldDefinitionNode;
  foreignKey?: string;
  isList: boolean;
};

export type WhereNode = {
  ctx: FullContext;
  tableName: string;
  tableAlias: string;
  shortTableAlias: string;
  model: Model;

  foreignKey?: string;
};

export const getResolverNode = ({
  ctx,
  node,
  tableAlias,
  baseTypeDefinition,
  typeName,
}: {
  ctx: FullContext;
  node: FieldNode | InlineFragmentNode | FragmentDefinitionNode;
  baseTypeDefinition: ObjectTypeDefinitionNode;
  tableAlias: string;
  typeName: string;
}): ResolverNode => ({
  ctx,
  tableName: typeName,
  tableAlias,
  shortTableAlias: ctx.aliases.getShort(tableAlias),
  baseTypeDefinition,
  baseModel: ctx.models.find((model) => model.name === baseTypeDefinition.name.value),
  typeDefinition: getType(ctx.info.schema, typeName),
  model: summonByName(ctx.models, typeName),
  selectionSet: get(node.selectionSet, 'selections'),
});

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

  return {
    ctx,
    tableName: typeName,
    tableAlias: typeName,
    shortTableAlias: ctx.aliases.getShort(typeName),
    baseTypeDefinition,
    typeDefinition: getType(ctx.info.schema, typeName),
    model: summonByName(ctx.models, typeName),
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

    return node.model.fields.some(({ json, name }) => json && name === selection.name.value);
  });
};

export const getInlineFragments = (node: ResolverNode) =>
  node.selectionSet.filter(isInlineFragmentNode).map((subNode) =>
    getResolverNode({
      ctx: node.ctx,
      node: subNode,
      tableAlias: node.tableAlias + '__' + getFragmentTypeName(subNode),
      baseTypeDefinition: node.baseTypeDefinition,
      typeName: getFragmentTypeName(subNode),
    })
  );

export const getFragmentSpreads = (node: ResolverNode) =>
  node.selectionSet.filter(isFragmentSpreadNode).map((subNode) =>
    getResolverNode({
      ctx: node.ctx,
      node: node.ctx.info.fragments[subNode.name.value]!,
      tableAlias: node.tableAlias,
      baseTypeDefinition: node.baseTypeDefinition,
      typeName: node.model.name,
    })
  );

export const getJoins = (node: ResolverNode, toMany: boolean) => {
  const nodes: FieldResolverNode[] = [];
  for (const subNode of node.selectionSet.filter(isFieldNode).filter(({ selectionSet }) => selectionSet)) {
    const ctx = node.ctx;
    const baseTypeDefinition = node.typeDefinition;
    const fieldName = subNode.name.value;
    const fieldNameOrAlias = getNameOrAlias(subNode);
    const fieldDefinition = summonByKey(baseTypeDefinition.fields || [], 'name.value', fieldName);

    const typeName = getTypeName(fieldDefinition.type);

    if (isJsonObjectModel(summonByName(ctx.rawModels, typeName))) {
      continue;
    }

    const baseModel = summonByName(ctx.models, baseTypeDefinition.name.value);

    let foreignKey;
    if (toMany) {
      const reverseRelation = baseModel.reverseRelationsByName[fieldName];
      if (!reverseRelation) {
        continue;
      }
      foreignKey = reverseRelation.foreignKey;
    } else {
      const modelField = baseModel.fieldsByName[fieldName];
      if (!modelField || modelField.raw) {
        continue;
      }
      foreignKey = modelField.foreignKey;
    }

    const tableAlias = node.tableAlias + '__' + fieldNameOrAlias;

    nodes.push({
      ctx,
      tableName: typeName,
      tableAlias,
      shortTableAlias: ctx.aliases.getShort(tableAlias),
      baseTypeDefinition,
      baseModel,
      typeDefinition: getType(ctx.info.schema, typeName),
      model: summonByName(ctx.models, typeName),
      selectionSet: get(subNode.selectionSet, 'selections'),
      field: subNode,
      fieldDefinition,
      foreignKey,
      isList: isListType(fieldDefinition.type),
    });
  }
  return nodes;
};
