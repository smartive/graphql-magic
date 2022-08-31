import type {
  FieldDefinitionNode,
  FieldNode,
  FragmentDefinitionNode,
  InlineFragmentNode,
  ObjectTypeDefinitionNode,
  SelectionNode,
} from 'graphql';
import { FullContext } from '../context';
import { Model } from '../models';
import { get, summon, summonByName } from '../utils';
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
  const fieldDefinition = summon(
    baseTypeDefinition.fields || [],
    (f: FieldDefinitionNode) => f.name.value === fieldName,
    `No field ${fieldName} found in model ${baseTypeDefinition.name.value}.`
  );

  const typeName = getTypeName(fieldDefinition.type);

  return {
    ctx,
    tableName: typeName,
    tableAlias: typeName,
    baseTypeDefinition,
    typeDefinition: getType(ctx.info.schema, typeName),
    model: summonByName(ctx.models, typeName),
    selectionSet: get(node.selectionSet, 'selections'),
    field: node,
    fieldDefinition,
    isList: isListType(fieldDefinition.type),
  };
};

export const getSimpleFields = (node: ResolverNode) =>
  node.selectionSet.filter(isFieldNode).filter(({ selectionSet }) => !selectionSet);

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
      node: node.ctx.info.fragments[subNode.name.value],
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
    const fieldDefinition = summon(
      baseTypeDefinition.fields || [],
      (f: FieldDefinitionNode) => f.name.value === fieldName,
      `No field ${fieldName} found in model ${baseTypeDefinition.name.value}.`
    );

    const typeName = getTypeName(fieldDefinition.type);

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

    nodes.push({
      ctx,
      tableName: typeName,
      tableAlias: toMany ? typeName : node.tableAlias + '__' + fieldNameOrAlias,
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
