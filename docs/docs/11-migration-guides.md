# Migration Guides

## Upgrading to v17.0.0

### Configuration changes

- The `gqlModule` configuration property has been renamed to `gqmModule` to maintain consistency with the project naming. Please update your `.gqmrc.json` file accordingly:

```diff
{
  "modelsPath": "path/to/models.ts",
  "generatedFolderPath": "path/to/generated",
  "graphqlQueriesPath": "path/to/queries",
- "gqlModule": "../path/to/module",
+ "gqmModule": "../path/to/module",
  "knexfilePath": "knexfile.ts",
  "dateLibrary": "luxon"
}
```
