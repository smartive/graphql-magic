# Models

The source of truth for `graphql-magic` is the `models` object, usually defined in `src/config/models.ts`. This is the minimal models:

```ts
const modelDefinitions: ModelDefinitions = [
  {
    kind: 'entity',
    name: 'User',
    fields: [],
  },
];

export const models = new Models(modelDefinitions);
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

These are the entity options:

### `description`

Will appear as description in the GraphQL schema.

### `plural`

`graphql-magic` detects natural language plurals of model names with the `inflection` npm package. You can override this here.

### `creatable`

When `creatable` is `true`, the entity can be created using a dedicated GraphQL `create<ModelName>` mutation.

For this to work, at least one entity field needs to be marked as `creatable`.

`creatable` also accepts an object to override properties of the implicitly generated `createdBy` and `createdAt` fields.

### `updatable`

When `updatable` is `true`, the entity can be created using a dedicated GraphQL `delete<ModelName>` mutation.

For this to work, at least one entity field needs to be marked as `updatable`.

`updatable` also accepts an object to override properties of the implicitly generated `updatedBy` and `updatedAt` fields.

If a field is updatable, a `<ModelName>Revisions` table is created (containing only the updatable fields) and extended with each update.

### `deletable`

When `deletable` is `true`, the entity can be created using a dedicated GraphQL `delete<ModelName>` mutation.

This is a soft delete (the `deleted` field is set to `true`), and the entity can be restored with the GraphQL `restore<ModelName>` mutation.

`deletable` also accepts an object to override properties of the implicitly generated `deleted`, `deletedBy` and `deletedAt` fields.

### `queriable`

When `queriable` is `true` a GraphQL `Query` becomes available to fetch exactly one element by id.

For example, with

```ts
{
    kind: 'entity',
    name: 'Post',
    queriable: true
    ...
}
```

the following GraphQL query becomes possible

```graphql
query {
  post(where: { id: "bf9496bb-9302-4528-aebc-c97ae49c52fa" }) {
    title
  }
}
```

### `listQueriable`

When `listQueriable` is `true` a GraphQL `Query` becomes available to fetch a list of elements of this model.

For example, with

```ts
{
    kind: 'entity',
    name: 'Post',
    listQueriable: true
    ...
}
```

the following GraphQL query becomes possible

```graphql
query {
  posts {
    title
  }
}
```

### `aggregatable`

When `aggregatable` is enabled, GraphQL query `<pluralField>_AGGREGATE` becomes available and returns aggregate values.

- Aggregate queries are only exposed when `listQueriable` is enabled.
- `COUNT` is always available.
- Field-level aggregate operations can be exposed with the field option `aggregatable`.
- Currently supported field operation is `sum` on numeric primitive fields (`Int`, `Float`).
- Aggregate query arguments are filtering only: `where`, and `search` when the entity has at least one searchable field. Unlike the list query for the same model, aggregate fields do not accept `orderBy`, `limit`, or `offset`; values are computed over every row that matches the filter (and search), not over a paginated or sorted slice.

Example:

```ts
{
    kind: 'entity',
    name: 'Invoice',
    listQueriable: true,
    aggregatable: true,
    fields: [
        { name: 'amount', type: 'Float', aggregatable: ['sum'] },
        { name: 'tax', type: 'Float' },
    ]
}
```

This exposes:

```graphql
query {
  invoices_AGGREGATE(where: { deleted: [false] }) {
    COUNT
    amount_SUM
  }
}
```

### `displayField`

The name of the field that ought to be used as display value, e.g. a `Post`'s `title`.

### `defaultOrderBy`

An array of orders with the same structure as the `orderBy` parameters in GraphQL queries. The implicit default order by is `[{ createdAt: 'DESC }]`.

### `fields`

An array of fields. See [fields](./fields)

### `constraints`

Optional array of database constraints for this entity. Supported kinds: `check`, `exclude`, `constraint_trigger`.

#### Check constraints (`kind: 'check'`)

- **`name`**: A short name for the constraint (used in migration constraint names).
- **`expression`**: A PostgreSQL boolean expression. Column names **must** be double-quoted (e.g. `"score"`) so they are validated against the model’s columns.
- **`message`**: Human-readable message for when the constraint fails. Not used by graphql-magic; available for application-level error mapping.
- **`deferrable`** (optional): `'INITIALLY DEFERRED'` or `'INITIALLY IMMEDIATE'`.
- **`notValid`** (optional): When `true`, adds the constraint with `NOT VALID`, allowing zero-downtime migrations (existing rows are not validated; use `VALIDATE CONSTRAINT` later).

#### EXCLUDE constraints (`kind: 'exclude'`)

Enforce non-overlapping values per group (e.g. no overlapping date ranges per portfolio). Requires the `btree_gist` extension (created automatically when needed).

- **`name`**, **`using`** (typically `'gist'`), **`elements`** (e.g. `{ column: 'portfolioId', operator: '=' }` for grouping, or `{ expression: 'tsrange(...)', operator: '&&' }` for ranges), **`where`** (optional), **`message`** (optional; human-readable message for when the constraint fails; not used by graphql-magic; available for application-level error mapping), **`deferrable`** (optional), **`notValid`** (optional; PostgreSQL 15+).

#### Constraint triggers (`kind: 'constraint_trigger'`)

Deferrable triggers for validation (e.g. contiguous periods). The function must be defined in `functions.ts`.

- **`name`**, **`when`** (`'AFTER'` or `'BEFORE'`), **`events`** (`['INSERT', 'UPDATE', 'DELETE']`; any combination), **`forEach`** (`'ROW'` or `'STATEMENT'`), **`deferrable`** (optional), **`function`** (`{ name: string; args?: string[] }`).

Example: ensure a numeric field is non-negative and a status is one of the allowed values:

```ts
{
    kind: 'entity',
    name: 'Product',
    fields: [
        { name: 'score', type: 'Int' },
        { name: 'status', kind: 'enum', type: 'ProductStatus' },
        // ...
    ],
    constraints: [
        { kind: 'check', name: 'score_non_negative', expression: '"score" >= 0' },
        { kind: 'check', name: 'status_allowed', expression: '"status" IN (\'DRAFT\', \'PUBLISHED\')' },
    ],
}
```

When you generate a migration, constraints are created on new tables and added, changed, or left unchanged on existing tables.

## Scalars

Used for GraphQL scalars, e.g.

```ts
{
    kind: 'Scalar',
    name: 'DateTime'
}
```

## Enums

An enum that is available as type in the database:

```ts
{
    kind: 'enum',
    name: 'Role',
    values: ['ADMIN', 'MODERATOR', 'USER']
}
```

## Raw enums

An enum that is _not_ available as type in the database:

```ts
{
    kind: 'raw-enum',
    name: 'Role',
    values: ['ADMIN', 'MODERATOR', 'USER']
}
```

## Interfaces

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

## Objects

Custom types that _don't_ correspond to database tables. To be used e.g. as return types for custom resolvers or JSON fields. These can also be used to extend `Query` or `Mutation` which are themselves of that type. E.g.

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

## Inputs

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
