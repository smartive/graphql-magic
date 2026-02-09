# Migrations

Migrations are there to keep the database schema in sync with the models.

## Generating migrations

After changing the models with database-relevant changes (and after initial setup), you'll need to have an existing database running to compare the models with, then generate a migration like this:

```
npx gqm generate-migration
```

It is recommended to create a `package.json` script for this:

```
"generate-migration": "gqm generate-migration"
```

Note: if you are in a `feat/<feature-name>` branch, the script will use that as name for the migration.

This will generate a migration file in the `migrations` folder (without running the migration itself yet). Check whether it needs to be adapted.

### Generated columns

Fields with `generateAs` are handled specially in migrations:

- **`type: 'virtual'` or `type: 'stored'`**: These create SQL `GENERATED ALWAYS AS` columns in the database. The migration generator will create these columns automatically.

- **`type: 'expression'`**: These fields do **not** create database columns. They are computed at query time and will not appear in migration files. This means you can add or remove expression fields without needing a migration.

## Running migrations

Migrations themselves are managed with `knex` (see the [knex migration docs](https://knexjs.org/guide/migrations.html)).

For example, to migrate to the latest version (using `env-cmd` to add db connection variables in `.env`):

```
npx env-cmd knex migrate:latest
```

It is recommended to create a `package.json` script and always running it before starting the development server.

```
"migrate: "env-cmd knex migrate:latest"
"predev: "npm run migrate"
"dev": "next dev"
```
