import { UserInputError } from 'apollo-server-errors';
import { GraphQLScalarType, Kind, ValueNode } from 'graphql';
import { DateTime } from 'luxon';
import { date } from '../dates';

export const scalars = {
  DateTime: new GraphQLScalarType({
    name: 'DateTime',
    description: 'DateTime',
    parseValue(value: string): DateTime | null {
      if (!value) {
        return null;
      }
      return date(value);
    },
    serialize(value: DateTime): string | null {
      if (!value) {
        return null;
      }
      return value.toString();
    },
    parseLiteral(ast: ValueNode): DateTime | null {
      if (ast.kind === Kind.STRING) {
        if (!ast.value) {
          throw new UserInputError(`Empty string is not a valid DateTime.`);
        }
        return date(ast.value);
      }
      return null;
    },
  }),
};
