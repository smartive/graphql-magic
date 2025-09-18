import { makeExecutableSchema } from '@graphql-tools/schema';
import { IResolvers } from '@graphql-tools/utils';
import { GraphQLResolveInfo, Source, execute as graphqlExecute, parse, specifiedRules, validate } from 'graphql';
import merge from 'lodash/merge';
import { Context, generate, get, getResolvers } from '..';
import { noIntrospection } from '../utils/rules';

export const execute = async ({
  additionalResolvers,
  body,
  introspection = false,
  ...ctx
}: {
  additionalResolvers?: IResolvers<any, any>;
  introspection?: boolean;
  body: any;
} & Omit<Context, 'document'>) => {
  const document = generate(ctx.models);

  const generatedResolvers = getResolvers(ctx.models);

  const schema = makeExecutableSchema({
    typeDefs: document,
    resolvers: merge(generatedResolvers, additionalResolvers),
  });

  const parsedDocument = parse(new Source(body.query, 'GraphQL request'));

  const validationErrors = validate(
    schema,
    parsedDocument,
    introspection ? specifiedRules : [...specifiedRules, noIntrospection],
  );

  if (validationErrors.length > 0) {
    return { errors: validationErrors };
  }

  const contextValue: Context = {
    document,
    ...ctx,
  };

  const result = await graphqlExecute({
    schema,
    document: parsedDocument,
    contextValue,
    variableValues: body.variables,
    operationName: body.operationName,
    fieldResolver: (parent, _args, _ctx, info: GraphQLResolveInfo) => {
      const node = get(info.fieldNodes, 0);
      const alias = node.alias;

      return parent[alias ? alias.value : node.name.value];
    },
  });

  return result;
};
