import { ImplementedKindToNodeMappings, Node, SyntaxKind } from 'ts-morph';
import { get } from '../..';

export type Visitor<T, C> = {
  undefined?: () => T;
  unknown?: (node: Node) => T;
} & {
  [kind in keyof ImplementedKindToNodeMappings]?: (node: ImplementedKindToNodeMappings[kind], context: C) => T;
};

export const visit = <T, C>(node: Node | undefined, context: C, visitor: Visitor<T, C>) => {
  if (!node) {
    if (visitor.undefined) {
      return visitor.undefined();
    }
    console.trace();
    throw new Error(`Cannot handle undefined node.`);
  }

  const kind = node.getKind();
  const func = visitor[kind];
  if (func) {
    return func(node, context);
  }

  if (visitor.unknown) {
    return visitor.unknown(node);
  }

  console.error(node.getText());
  throw new Error(
    `Cannot handle kind ${get(
      Object.entries(SyntaxKind).find(([, val]) => val === kind),
      0
    )}`
  );
};
