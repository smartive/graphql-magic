import { makeExecutableSchema } from '@graphql-tools/schema';
import { IResolvers } from '@graphql-tools/utils';
import { GraphQLResolveInfo, Source, execute as graphqlExecute, parse } from 'graphql';
import { Context, get } from '..';

export const execute = async ({
  resolvers,
  typeDefs,
  body,
  ...contextValue
}: {
  typeDefs: string;
  resolvers: IResolvers<any, any>;
  body: any;
} & Omit<Context, 'document'>) =>
  graphqlExecute({
    schema: makeExecutableSchema({
      typeDefs,
      resolvers,
    }),
    document: parse(new Source(body.query, 'GraphQL request')),
    contextValue,
    variableValues: body.variables,
    operationName: body.operationName,
    fieldResolver: (parent, _args, _ctx, info: GraphQLResolveInfo) => {
      const node = get(info.fieldNodes, 0);
      const alias = node.alias;
      return parent[alias ? alias.value : node.name.value];
    },
  });
