import { GraphQLError as GQLError, GraphQLErrorOptions } from 'graphql';
import { PermissionAction } from './permissions/generate';

export class GraphQLError extends GQLError {
  /**
   * What to write to a log instead of `message`, when the message names data that must not be kept
   * there — see `sensitiveDisplay`. Deliberately a field and not an extension: extensions are
   * serialized to the client, a field is not, so carrying it cannot change the response.
   */
  public readonly logMessage?: string;

  constructor(message: string, extensions: GraphQLErrorOptions['extensions'], logMessage?: string) {
    super(message, { extensions });
    this.logMessage = logMessage;
  }
}

export class ForbiddenError extends GraphQLError {
  constructor(what: string, logMessage?: string) {
    super(what, { code: 'FORBIDDEN' }, logMessage);
  }
}

export class NotFoundError extends GraphQLError {
  constructor(what: string, logMessage?: string) {
    super(what, { code: 'NOT_FOUND' }, logMessage);
  }
}

export class UserInputError extends GraphQLError {
  constructor(what: string, logMessage?: string) {
    super(what, { code: 'BAD_USER_INPUT' }, logMessage);
  }
}

export class PermissionError extends ForbiddenError {
  constructor(role: string, action: PermissionAction, what: string, why: string) {
    super(`Role ${role} does not have sufficient permissions to ${action.toLowerCase()} ${what} (${why}).`);
  }
}
