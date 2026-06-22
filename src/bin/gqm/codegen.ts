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
        plugins: [
          'typescript',
          'typescript-resolvers',
          { add: { content: DATE_CLASS_IMPORT[dateLibrary] } },
          { add: { content: `import type { Time } from '@smartive/graphql-magic';` } },
        ],
      },
    },
    config: {
      scalars: {
        DateTime: DATE_CLASS[dateLibrary],
        Time: 'Time',
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
      // The schema types and the operation types are emitted into two separate files on purpose.
      // Since `@graphql-codegen/typescript-operations` v6 the operations plugin re-emits every enum
      // and input-object type that an operation uses directly into its own output, unless
      // `importSchemaTypesFrom` is set. Running it together with the `typescript` plugin in a single
      // file therefore declares every used `*Where`/`Create*`/`Update*` input and every used enum
      // twice (`TS2300: Duplicate identifier`), and `ReactionType`-style enums additionally clash as
      // an `enum` (typescript) vs a string-literal `type` alias (typescript-operations) (`TS2567`).
      // Splitting schema types into their own file and pointing the operations plugin at them via
      // `importSchemaTypesFrom` is the upstream-recommended fix, see
      // dotansimha/graphql-code-generator#10782.
      [`${generatedFolderPath}/client/schema.ts`]: {
        plugins: ['typescript'],
      },
      // `export * from './schema'` keeps the public surface unchanged: consumers can still import
      // both the schema types and the operation types from the single `client` entrypoint.
      [`${generatedFolderPath}/client/index.ts`]: {
        plugins: ['typescript-operations', { add: { content: `export * from './schema';` } }],
        config: {
          importSchemaTypesFrom: `${generatedFolderPath}/client/schema`,
        },
      },
    },
    config: {
      preResolveTypes: true, // Simplifies the generated types
      namingConvention: 'keep', // Keeps naming as-is
      skipTypename: true, // Don't generate __typename
      avoidOptionals: {
        // Avoids optionals on the level of the field
        field: true,
      },
      scalars: {
        DateTime: 'string',
        // Reference the `Time` type via its module so codegen imports it only in the files that
        // actually use it. A hard-coded `add` import would land in the operations file too and trip
        // `noUnusedLocals` for consumers whose operations never select a `Time` field.
        Time: '@smartive/graphql-magic#Time',
      },
      useTypeImports: true, // Emit `import type` for the scalar (and any other type) imports
      ignoreNoDocuments: true,
    },
  });
};
