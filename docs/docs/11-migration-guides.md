# Migration Guides

## Upgrading to v17.2.0

From now on, foreign keys will be indexed by default. For existing projects, you'll need to add indices manually to your existing migrations.

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
