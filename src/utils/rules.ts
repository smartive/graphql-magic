import { FieldNode, ValidationContext } from 'graphql';
import { ForbiddenError } from '../errors';

export const noIntrospection = (context: ValidationContext) => ({
  Field(node: FieldNode) {
    const name = node.name.value;
    if (name === '__schema' || name === '__type') {
      context.reportError(new ForbiddenError('GraphQL introspection is disabled'));
    }
  },
});
