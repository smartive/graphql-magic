import { GraphQLError as GQLError } from 'graphql';
import { PermissionAction } from './permissions/generate';

export class GraphQLError extends GQLError {
  constructor(message: string, extensions: ConstructorParameters<typeof GQLError>[6]) {
    super(message, undefined, undefined, undefined, undefined, undefined, extensions);
  }
}

export class ForbiddenError extends GraphQLError {
  constructor(what: string) {
    super(what, { code: 'FORBIDDEN' });
  }
}

export class NotFoundError extends GraphQLError {
  constructor(what: string) {
    super(what, { code: 'NOT_FOUND' });
  }
}

export class UserInputError extends GraphQLError {
  constructor(what: string) {
    super(what, { code: 'BAD_USER_INPUT' });
  }
}

export class PermissionError extends ForbiddenError {
  constructor(action: PermissionAction, what: string, why: string) {
    super(`You do not have sufficient permissions to ${action.toLowerCase()} ${what} (${why}).`);
  }
}
