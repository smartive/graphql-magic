# Models

The source of truth for `graphql-magic` is the `models` object, usually defined in `src/config/models.ts`. This is the minimal models:

```ts
const modelDefinitions: ModelDefinitions = [
  {
    kind: 'entity',
    name: 'User',
    fields: [
    ]
  },
]

export const models = new Models(modelDefinitions)
```

Models can have the following kinds:

## Entities

The most powerful model kind. Entities are models that are stored in database tables, and are defined with `kind: 'entity'`:

```ts
{
    kind: 'entity',
    name: 'Post',
    fields: [
        // ...
    ]
}
```

These are the entity options

### description

Will appear as graphql description

### plural

`graphql-magic` detects natural language plurals of model names with the `inflection` npm package. You can override this here.

### creatable

When `creatable` is `true`, the entity can be created using a dedicated graphql `create<ModelName>` mutation.

For this to work, at least one entity field needs to be marked as `creatable`.

`creatable` also accepts an object to override properties of the implicitly generated `createdBy` and `createdAt` fields.

### updatable

When `updatable` is `true`, the entity can be created using a dedicated graphql `delete<ModelName>` mutation.

For this to work, at least one entity field needs to be marked as `updatable`.

`updatable` also accepts an object to override properties of the implicitly generated `updatedBy` and `updatedAt` fields.

If a field is updatable, a `<ModelName>Revisions` table is created (containing only the updatable fields) and extended with each update.

### deletable

When `deletable` is `true`, the entity can be created using a dedicated graphql `delete<ModelName>` mutation.

This is a soft delete (the `deleted` field is set to `true`), and the entity can be restored with the graphql `restore<ModelName>` mutation.

`deletable` also accepts an object to override properties of the implicitly generated `deleted`, `deletedBy` and `deletedAt` fields.

### queriable

When `queriable` is `true` a graphql `Query` becomes available to fetch exactly one element by id.

For example, with

```ts
{
    kind: 'entity',
    name: 'Post',
    queriable: true
    ...
}
```

the following graphql query becomes possible

```graphql
query {
    post(where: { id: "bf9496bb-9302-4528-aebc-c97ae49c52fa"}) {
        title
    }
}
```

### listQueriable

When `listQueriable` is `true` a graphql `Query` becomes available to fetch a list of elements of this model.

For example, with

```ts
{
    kind: 'entity',
    name: 'Post',
    listQueriable: true
    ...
}
```

the following graphql query becomes possible

```graphql
query {
    posts {
        title
    }
}
```

### displayField

The name of the field that ought to be used as display value, e.g. a `Post`'s `title`.

### defaultOrderBy

An array of orders with the same structure as the `orderBy` parameters in graphql queries. The implicit default order by is `[{ createdAt: 'DESC }]`.

### fields

An array of fields. See [fields](./fields.md)


## Scalar

Used for graphql scalars, e.g.

```ts
{
    kind: 'Scalar',
    name: 'DateTime'
}
```

## Enum

An enum that is available as type in the database:

```ts
{
    kind: 'enum',
    name: 'Role',
    values: ['ADMIN', 'MODERATOR', 'USER']
}
```

## Raw enum

An enum that is *not* available as type in the database:

```ts
{
    kind: 'raw-enum',
    name: 'Role',
    values: ['ADMIN', 'MODERATOR', 'USER']
}
```

## Interface

Types that can be inherited from, e.g.

```ts
{
    kind: 'interface',
    name: 'WithContent',
    fields: [
        {
            type: 'String',
            name: 'content'
        }
    ]
},
{
    kind: 'entity',
    name: 'Post',
    interfaces: ['WithContent']
    fields: [
        {
            type: 'String',
            name: 'content'
        }
    ]
}
```

## Object

Custom types that *don't* correspond to database tables. To be used e.g. as return types for custom resolvers or JSON fields. These can also be used to extend `Query` or `Mutation` which are themselves of that type. E.g.

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

will make this query possible:

```graphql
query {
    stats {
        usersCount
        postsCount
    }
}
```

## Input

A custom input type. To be combined with custom mutations, e.g.

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

will make this mutation possible:

```graphql
mutation {
    bulkDelete(where: { ids: [...]})
}
```
