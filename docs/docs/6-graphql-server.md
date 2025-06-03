# Graphql server

## `executeGraphql`

`graphql-magic` generates an `execute.ts` file for you, with this structure:

```ts
import knexConfig from '@/knexfile';
import { Context, User, execute } from '@smartive/graphql-magic';
import { randomUUID } from 'crypto';
import { knex } from 'knex';
import { models } from '../config/models';

export const executeGraphql = async <T, V = undefined>(body: {
  query: string;
  operationName?: string;
  variables?: V;
  options?: { email?: string };
}): Promise<{ data: T }> => {
  const db = knex(knexConfig);
  let user: User | undefined;
  // TODO: get user

  const result = await execute({
    req: null as unknown as Context['req'],
    body,
    knex: db as unknown as Context['knex'],
    locale: 'en',
    locales: ['en'],
    user,
    models: models,
    permissions: { ADMIN: true, UNAUTHENTICATED: true },
  });
  await db.destroy();

  // https://github.com/vercel/next.js/issues/47447#issuecomment-1500371732
  return JSON.parse(JSON.stringify(result)) as { data: T };
};
```

This is where you can set up your GraphQL server with

- user authentication (see the [Tutorial](./tutorial) for an example with auth0)
- custom resolvers (see [Custom resolvers](#custom-resolvers))
- mutation hooks (see [Mutation hooks](#mutation-hooks))

## Graphql API

If you only need to execute GraphQL on the server (e.g. on `next.js` server components or server actions), you don't need a GraphQL endpoint.
If you need client side querying, use `executeGraphql` to create a GraphQL endpoint, e.g. in `src/app/api/graphql/route.ts`:

```ts
export const POST = (req) => {
  return await executeGraphql(req.body);
};
```

## Custom resolvers

Sometimes you'll need a custom resolver, at the level of root queries, mutations or existing models. For that you need to create a `additionalResolvers` object.

```ts
export const additionalResolvers = {
  // custom resolvers go here
};
```

Then feed it to `graphql-magic`'s `execute` function:

```ts
const result = await execute({
  ...additionalResolvers,
});
```

### Custom queries

For that you'll need to extend the `Query` model (and define any needed additional models), e.g.:

```ts
{
    kind: 'object',
    name: 'Stats',
    fields: [
        {
            name: 'usersCount'
            type: 'Int'
        },
        {
            name: 'postsCount',
            type: 'Int'
        }
    ]
},
{
    kind: 'object',
    name: 'Query',
    fields: [
        // You'll need to define a custom resolver for this one
        {
            kind: 'custom',
            name: 'stats',
            type: 'Stats'
        }
    ]
}
```

then implement the custom resolver as usual:

```ts
const additionalResolvers = {
  Query: {
    stats: (parent, args, ctx, schema) => {
      // Implement custom resolver here
    },
  },
};
```

### Custom mutations

For that you'll need to extend the `Mutation` model (and define any needed additional models), e.g.:

```ts
{
    kind: 'input',
    name: 'BulkDeleteWhereInput'
    fields: [
        {
            kind: 'ID',
            name: 'ids',
            list: true
        }
    ]
},
{
    kind: 'object',
    name: 'Mutation',
    fields: [
        // You'll need to define a custom resolver for this one
        {
            kind: 'custom',
            name: 'bulkDelete',
            args: [
                {
                    kind: 'custom',
                    name: 'where',
                    type: 'BulkDeleteWhereInput'
                }
            ]
            type: 'Boolean'
        }
    ]
}
```

then implement the custom resolver as usual:

```ts
const additionalResolvers = {
  Mutation: {
    bulkDelete: (parent, args, ctx, schema) => {
      // Implement custom resolver here
    },
  },
};
```

### Custom model resolvers

Sometimes you need to add a custom field to an existing model. For that, add a field of `kind: 'custom'` to the model.

```ts
{
    kind: 'entity',
    name: 'User',
    fields: [
        // ...
        {
            kind: 'custom',
            name: 'isAdmin',
            type: 'Boolean'
        }
    ]
}
```

then implement the custom resolver as usual:

```ts
const additionalResolvers = {
  User: {
    isAdmin: (parent, args, ctx, schema) => {
      // Implement custom resolver here
    },
  },
};
```

## Mutation hooks

Sometimes you'll need some custom handling of mutations, before or after the change is committed to the database (e.g. for special data validation, or triggering cleanup work).

For this we can implement a global `mutationHook` function that will be called for all mutations with parameters describing the context:

```ts
import { MutationHook } from '@smartive/graphql-magic';

export const mutationHook: MutationHook = ({ model, action, trigger, when, data, ctx }) => {
  switch (
    model.name
    // perform model specific tasks
  ) {
  }

  // perform global tasks
};
```

Then feed it to `graphql-magic`'s `execute` function:

```ts
const result = await execute({
  ...mutationHook,
});
```

The mutation hook function takes the following arguments:

- `model` the model for the entity being mutated
- `action`: can be `'create'`, `'update'`, `'delete'` or `'restore'`
- `trigger`: indicates how the mutation was initiated - `'mutation'` (direct GraphQL mutation), `'cascade'` (cascading delete), or `'set-null'` (foreign key nullification)
- `when`: either `"before"` or `"after"` the mutation is committed to the database
- `data` containing the entity in various states:
  - `prev`: the previous entity (undefined in creation mutations)
  - `input`: input from the user
  - `normalizedInput`: input to feed to the database (e.g. including generated values such as `id`, `createdAt`...)
  - `next`: the full next entity after changes are applied
- `ctx`: the GraphQL context
