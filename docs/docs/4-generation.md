# Code generation

`graphql-magic` generates a lot of utility code for you based on the models, in particular TypeScript types.

This can be done directly with `npx gqm generate`.

During the first run, the tool applies the following changes to the repo:

* Generate `.gqmrc.json` file.
* Add local database connection variables to `.env` file.
* Add generated folder to `.gitignore`
* Generate `models.ts` file (if not present).
* Generate a basic `get-me.ts` example GraphQL query.
* Generate the `execute.ts` file for the execution

With each application, it generates the following files in the configured "generated" folder:

* `schema.graphql` - the schema of the API, for reference
* `models.json` - the final models array, including generated fields such as "id","createdBy"... for reference
* `api/index.ts` - the server-side model TypeScript types
* `client/index.ts` - the client-side TypeScript types for the provided queries
* `client/mutations.ts` - standard mutation queries for all models
* `db/index.ts` - types for data from/to the database
* `db/knex.ts` - types to extend the `knex` query builder

Whenever the models have been changed, it is necessary to regenerate this code.
It is recommended to create a `package.json` script and to always generate code after install (or with `npm run generate`):

```
"scripts": {
    "bootstrap": "npm ci && npm run generate",
    "generate": "gqm generate"
}
```
