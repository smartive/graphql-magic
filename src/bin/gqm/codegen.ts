import { generate } from '@graphql-codegen/cli';
import { DATE_CLASS, DATE_CLASS_IMPORT, DateLibrary } from '../../utils/dates';
import { ensureDirectoryExists, getSetting } from './settings';

export const generateGraphqlApiTypes = async (dateLibrary: DateLibrary) => {
  const generatedFolderPath = await getSetting('generatedFolderPath');
  await generate({
    overwrite: true,
    schema: `${generatedFolderPath}/schema.graphql`,
    documents: undefined,
    generates: {
      [`${generatedFolderPath}/api/index.ts`]: {
        plugins: ['typescript', 'typescript-resolvers', { add: { content: DATE_CLASS_IMPORT[dateLibrary] } }],
      },
    },
    config: {
      scalars: {
        DateTime: DATE_CLASS[dateLibrary],
      },
    },
  });
};

export const generateGraphqlClientTypes = async () => {
  const generatedFolderPath = await getSetting('generatedFolderPath');
  const graphqlQueriesPath = await getSetting('graphqlQueriesPath');
  ensureDirectoryExists(graphqlQueriesPath);
  await generate({
    schema: `${generatedFolderPath}/schema.graphql`,
    documents: [graphqlQueriesPath, `${generatedFolderPath}/client/mutations.ts`],
    generates: {
      [`${generatedFolderPath}/client/index.ts`]: {
        plugins: ['typescript', 'typescript-operations'],
      },
    },
    config: {
      preResolveTypes: true, // Simplifies the generated types
      namingConvention: 'keep', // Keeps naming as-is
      nonOptionalTypename: true, // Forces `__typename` on all selection sets
      skipTypeNameForRoot: true, // Don't generate __typename for root types
      avoidOptionals: {
        // Avoids optionals on the level of the field
        field: true,
      },
      scalars: {
        DateTime: 'string',
      },
      ignoreNoDocuments: true,
    },
  });
};
