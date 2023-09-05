import { KindToNodeMappings, Node, SyntaxKind } from 'ts-morph';
import { get } from '..';

export type Visitor<T, C> = {
  undefined?: () => T;
  unknown?: (node: Node) => T;
} & {
  [kind in keyof KindToNodeMappings]?: (node: KindToNodeMappings[kind], context: C) => T;
};

export const visit = <T, C>(node: Node | undefined, context: C, visitor: Visitor<T, C>) => {
  const kind: undefined | keyof KindToNodeMappings = node?.getKind();
  if (kind in visitor) {
    return visitor[kind](node.asKindOrThrow(kind), context);
  }

  if ('unknown' in visitor) {
    return visitor.unknown(node);
  }

  console.error(node.getText());
  console.error(node.getParent().getText());
  throw new Error(
    `Cannot handle kind ${get(
      Object.entries(SyntaxKind).find(([, val]) => val === kind),
      0
    )}`
  );
};
