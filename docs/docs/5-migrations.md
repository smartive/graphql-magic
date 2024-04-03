# Migrations

After changing the models, if you have an existing database running to compare the models with, you can generate a migration like this:

```
npx gqm generate-migration
```

We recommend creating a `package.json` script for this:

```
"generate-migration": "gqm generate-migration"
```

Note: if you are in a `feat/<feature-name>` branch, the script will use that as name for the migration.

This will generate a migration in the `migrations` folder. Check whether it needs to be adapted.

You can then run it with `knex` migration commands (using `env-cmd` to add db connection variables in `.env`):

```
npx env-cmd knex migrate:latest
```

We recommend creating a `package.json` script and always running it before starting the development server.

```
"migrate: "env-cmd knex migrate:latest"
"predev: "npm run migrate"
"dev": "next dev"
```
