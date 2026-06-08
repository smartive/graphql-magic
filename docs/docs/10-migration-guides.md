# Migration Guides

## Upgrading to the next major version

### `deleted` is a top-level argument, not a `where` filter

The `deleted` field is no longer part of the auto-generated `Where` input. Instead, queries that operate on deletable entities expose a top-level `deleted: Boolean = false` argument. This applies to plural list queries, aggregate queries, singular `entity(where: …)` queries and reverse-relation list fields.

Semantics of the new argument:

- omitted or `deleted: false` (default): only non-deleted entries.
- `deleted: true`: only deleted entries (requires `DELETE` permission).
- `deleted: null`: both deleted and non-deleted entries (requires `DELETE` permission).

Update affected queries:

```diff
- posts(where: { author: { id: "..." }, deleted: [true] }) { id }
+ posts(where: { author: { id: "..." } }, deleted: true) { id }

- invoices_AGGREGATE(where: { deleted: [false] }) { COUNT }
+ invoices_AGGREGATE(deleted: false) { COUNT }

- posts(where: { deleted: [true, false] }) { id }
+ posts(where: {}, deleted: null) { id }
```

Permission `WHERE` rules can no longer filter on `deleted` via the generated permission `Where` types. The hard-coded `deleted = false` join used by permission chains is unchanged.

## Upgrading to v19.0.0

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

### Enhanced delete functionality

#### New `onDelete` option: `restrict`

You can now use `restrict` as an `onDelete` option for relations, in addition to the existing `cascade` and `set-null` options:

```ts
{
  name: 'author',
  type: 'User',
  kind: 'relation',
  onDelete: 'restrict', // New option
}
```

When using `restrict`, deletion of a parent entity will be prevented if it has related child entities, ensuring referential integrity.

#### Database schema changes

New fields have been added to deletable entities to track deletion context:

- `deleteRootType`: Stores the type of the root entity that initiated the deletion
- `deleteRootId`: Stores the ID of the root entity that initiated the deletion

Generate a migration to add these fields:

```bash
npx gqm generate-migration
```

### Mutation hook signature changes

The `MutationHook` function signature has been updated to use object destructuring for better maintainability and extensibility. Update your mutation hook implementations:

```diff
- export const mutationHook: MutationHook = (model, action, when, data, ctx) => {
+ export const mutationHook: MutationHook = ({ model, action, trigger, when, data, ctx }) => {
    // Your implementation
}
```

The new signature includes a `trigger` parameter that indicates how the mutation was initiated:

- `'mutation'`: Direct GraphQL mutation
- `'cascade'`: Triggered by cascading delete
- `'set-null'`: Triggered by setting foreign key to null

## Upgrading to v18.0.0

This was a dummy release, nothing to do here.

## Upgrading to v17.2.0

From now on, foreign keys will be indexed by default. For existing projects, you'll need to add indices manually to your existing foreign keys.

Here's a sample script to generate the migration:

```ts
import { execSync } from 'child_process';
import { writeFileSync } from 'fs';
import { models } from '../../../src/config/models';

const start = async () => {
  const instructions: string[] = [];

  instructions.push(`import { Knex } from 'knex';

export const up = async (knex: Knex) => {`);

  for (const model of models.entities) {
    if (model.fields.some((field) => field.kind === 'relation')) {
      instructions.push(`await knex.schema.alterTable('${model.name}', (table) => {`);
      for (const field of model.fields) {
        if (field.kind === 'relation') {
          instructions.push(`table.index('${field.foreignKey || field.name + 'Id'}');`);
        }
      }
      instructions.push(`});`);
    }
  }

  instructions.push(`};`);

  instructions.push(`export const down = async (knex: Knex) => {`);

  for (const model of models.entities) {
    if (model.fields.some((field) => field.kind === 'relation')) {
      instructions.push(`await knex.schema.alterTable('${model.name}', (table) => {`);
      for (const field of model.fields) {
        if (field.kind === 'relation') {
          instructions.push(`table.dropIndex('${field.foreignKey || field.name + 'Id'}');`);
        }
      }
      instructions.push(`});`);
    }
  }

  instructions.push(`};`);

  writeFileSync('migrations/20250305130109_create-foreign-key-indices.ts', instructions.join('\n'));
  execSync('npx eslint --fix migrations/20250305130109_create-foreign-key-indices.ts');
};

void start();
```
