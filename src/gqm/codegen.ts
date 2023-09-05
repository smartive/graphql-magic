import { generate } from '@graphql-codegen/cli';
import { getSetting } from './settings';

export const generateGraphqlApiTypes = async () => {
  const generatedFolderPath = await getSetting('generatedFolderPath');
  await generate({
    overwrite: true,
    schema: `${generatedFolderPath}/schema.graphql`,
    documents: null,
    generates: {
      [`${generatedFolderPath}/api/index.ts`]: {
        plugins: ['typescript', 'typescript-resolvers', { add: { content: `import { DateTime } from 'luxon';` } }],
      },
    },
    config: {
      scalars: {
        DateTime: 'DateTime',
      },
    },
  });
};

export const generateGraphqlClientTypes = async () => {
  const generatedFolderPath = await getSetting('generatedFolderPath');
  await generate({
    schema: `${generatedFolderPath}/schema.graphql`,
    documents: ['./src/**/*.ts', './src/**/*.tsx'],
    generates: {
      [`${generatedFolderPath}/client/index.ts`]: {
        plugins: ['typescript', 'typescript-operations', 'typescript-compatibility'],
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
    },
  });
};
