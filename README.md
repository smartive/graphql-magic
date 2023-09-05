# graphql-magic

Welcome to graphql-magic!

## Usage

### Prerequisites

* Next.js
* TypeScript
* Knex.js
* Postgresql

### Setup

Dependencies:

```
npm i @smartive/graphql-magic
```

Dev Dependencies:

```
npm i -D @graphql-codegen/add @graphql-codegen/cli @graphql-codegen/schema-ast @graphql-codegen/typescript @graphql-codegen/typescript-compatibility @graphql-codegen/typescript-operations @graphql-codegen/typescript-resolvers simple-git
```

Add the following scripts to your package:

```
    "gqm:local": "(cd ../graphql-magic && npm run build && npm pack) && npm i ../graphql-magic/smartive-graphql-magic-0.0.0-development.tgz",
    "gqm:upgrade": "npm rm @smartive/graphql-magic && npm i @smartive/graphql-magic",
    "generate": "npm run generate:db && npm run generate:graphql:schema && npm run generate:graphql:api && npm run generate:graphql:client",
    "generate:db": "npm run ts-node scripts/generate-db-models",
    "generate:graphql:schema": "npm run ts-node scripts/generate-schema",
    "generate:graphql:api": "graphql-codegen --config graphql-codegen.yml",
    "generate:graphql:client": "graphql-codegen --config client-codegen.yml",
    "db:migrate:generate": "npm run ts-node scripts/generate-migrations",
```

To be continued...

## Development

```
npm bootstrap
```

```
npm run lint
```

```
npm run build
```
