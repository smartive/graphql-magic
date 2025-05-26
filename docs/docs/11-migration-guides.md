# Migration Guides

## Upgrading to v18.0.0

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

These fields help track cascading deletions and enable more sophisticated restore operations.

#### Migration requirements

For existing projects, you'll need to add the new deletion tracking fields to your deletable entities. Generate a migration to add these fields:

```sql
ALTER TABLE your_table_name ADD COLUMN deleteRootType VARCHAR(255);
ALTER TABLE your_table_name ADD COLUMN deleteRootId UUID;
```

#### Restore behavior changes

The restore functionality has been enhanced:

- Entities can only be restored from their root deletion point
- If you try to restore a child entity that was deleted as part of a cascade, you'll get an error directing you to restore the root entity instead
- This ensures consistency in the deletion/restoration process

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
