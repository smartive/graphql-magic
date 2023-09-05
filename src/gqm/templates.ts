export const EMPTY_MODELS = `
import { RawModels, getModels } from '@smartive/graphql-magic';

export const rawModels: RawModels = [
  {
    kind: 'entity',
    name: 'User',
    fields: []
  },
]

export const models = getModels(rawModels);
`;

export const GRAPHQL_CODEGEN = (path: string) => `
overwrite: true
schema: '${path}/schema.graphql'
documents: null
generates:
  ${path}/api/index.ts:
    plugins:
      - 'typescript'
      - 'typescript-resolvers'
      - add:
          content: "import { DateTime } from 'luxon'"
config:
  scalars:
    DateTime: DateTime
`;

export const CLIENT_CODEGEN = (path: string) => `
schema: ${path}/schema.graphql
documents: [ './src/**/*.ts', './src/**/*.tsx' ]
generates:
  ${path}/client/index.ts:
    plugins:
      - typescript
      - typescript-operations
      - typescript-compatibility

config:
  preResolveTypes: true # Simplifies the generated types
  namingConvention: keep # Keeps naming as-is
  nonOptionalTypename: true # Forces \`__typename\` on all selection sets
  skipTypeNameForRoot: true # Don't generate __typename for root types
  avoidOptionals: # Avoids optionals on the level of the field
    field: true
  scalars:
    DateTime: string
`;
