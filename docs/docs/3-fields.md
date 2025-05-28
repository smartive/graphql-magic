# Fields

Models of kind `'entity'`, `'object'`, `'interface'` (see the docs on [models](./models)) have an option called `fields`.

```ts
const modelDefinitions: ModelDefinitions = [
  {
    kind: 'entity',
    name: 'User',
    fields: [
      // Fields
    ],
  },
];

export const models = new Models(modelDefinitions);
```

## Kinds

Fields can have various kinds, based on the field `kind`:

### Primitive fields

Primitive fields are fields where `kind` is either undefined or set to `'primitive'`. They can have the following `type`:

- `ID`
- `Boolean`
- `String` with optional fields `stringType` and `maxLength`
- `Int` with optional fields `intType`
- `Float` with optional fields `floatType`, `double`, `precision`, `scale`
- `Upload`

Examples:

```ts
{
    name: 'Person',
    fields: [
        {
            type: 'String',
            name: 'name',
        },
        {
            type: 'Int',
            name: 'name',
        }
    ]
}
```

### Enums

When `kind` is `enum`. Requires as `type` the name of a separately defined model of kind `'enum'`. Has optional field `possibleValues` to allow only a subset of available values in mutations.

### Custom

When `kind` is `custom`. Requires as `type` the name of a separately defined model of kind `'object'`.

If this is an entity field, `graphql-magic` will not try to fetch the result from the database and instead assume the presence of a custom resolver for this field and .

### JSON

This kind is only available in entity fields. When `kind` is `json`, `graphql-magic` assumes that this is a `json` column in the database and returns the data as is. The `type` needs be the name of a separately defined model of kind `object` that describes the structure of the `JSON`.

### Relations

This kind is only available in entity fields. When `kind` is `relation`, the field describes a link to an entity table. The `type` therefore needs to be the name of a model of kind `'entity'`.

## Options

Fields generally have the following options:

### `kind`

Fields can have various kinds, which affect other available options. Available kinds:

- `undefined` or `'primitive'`
- `'enum'`
- `'custom'`
- `'json'`
- `'relation'`

For more details, see section on [kinds](#kinds) below.

### `type`

This represents the GraphQL "return type", which can be a primitive or a separate model (depending on the [kind](#kinds)).

### `description`

Will appear as description in the GraphQL schema.

### `list`

If `list` is `true` the result is an array.

### `nonNull`

Will make the field required both in the GraphQL schema and in the database.

### `defaultValue`

Will set this as default value in GraphQL mutations and in the database.

### `args`

An array of fields that can then be used as parameters, e.g. if this field is implemented as a custom resolver.

### `directives`

Graphql directives for this field.

### `primary`

If `true` this will generate a primary key in the database.

### `unique`

If `true` this will generate a unique key in the database.

### `filterable`

If true, this field will be available in the `where` parameter for queries of this entity.

E.g. with

```ts
{
    name: 'Post',
    fields: [
        {
            name: 'name',
            type: 'String',
            filterable: true
        }
    ]
}
```

this becomes possible:

```graphql
query {
  posts(where: { name: "Hello World" }) {
    title
  }
}
```

With relations, this enables sub-filters, e.g. with

```ts
{
    name: 'Comment',
    fields: [
        {
            kind: 'relation',
            name: 'post',
            type: 'Post',
            filterable: true
        }
    ]
}
```

this becomes possible:

```graphql
query {
  comments(where: { post: { name: "Hello World" } }) {
    content
  }
}
```

### `reverseFilterable`

Only relevant on relation fields. On `true` makes the reverse relation filterable.

E.g. with

```ts
{
    name: 'Comment',
    fields: [
        {
            name: 'post',
            type: 'String',
            reverseFilterable: true
        }
    ]
}
```

this becomes possible:

```graphql
query {
  posts(where: { comments_SOME: { name: "Hello World" } }) {
    title
  }
}
```

Available filter postfixes are `_SOME` and `_NONE`.

### `searchable`

On `true` makes the field searchable. Search always happens across all fields marked as searchable (only one has to match). Search is case insensitive.

E.g. with

```ts
{
    name: 'Post',
    fields: [
        {
            name: 'title',
            type: 'String',
            searchable: true
        },
        {
            name: 'content',
            type: 'String',
            searchable: true
        }

    ]
}
```

this becomes possible:

```graphql
query {
  posts(search: "Hello") {
    title
  }
}
```

### `orderable`

On `true` makes the field available to the `orderBy` parameter.

E.g. with

```ts
{
    name: 'Post',
    fields: [
        {
            name: 'title',
            type: 'String',
            orderable: true
        },
    ]
}
```

this becomes possible:

```graphql
query {
  posts(orderBy: [{ title: DESC }]) {
    title
  }
}
```

### `comparable`

On `true` makes the field comparable.

E.g. with

```ts
{
    name: 'Post',
    fields: [
        {
            name: 'rating',
            type: 'Int',
            comparable: true
        },
    ]
}
```

this becomes possible:

```graphql
query {
    posts(where: { rating_GTE 4 }) {
        title
    }
}
```

Available postfixes are:

- `_GT`: greater than
- `_GTE`: greater than or equal
- `_LT`: less than
- `_LTE`: less than or equal

### `queriable`

`true` by default. If explicitly set to `false`, the field won't be queriable via GraphQL.

Also accepts an object that defines a list of `roles` to restrict access to specific roles.

### `creatable`

If `true` this field will be available in the create mutation for the entity.

Also accepts an object that defines a list of `roles` to restrict creation to specific roles.

### `updatable`

If `true` this field will be available in the update mutation for the entity.

Also accepts an object that defines a list of `roles` to restrict creation to specific roles.

### `toOne`

Only available on relation fields. If `toOne` is `true` this marks a one-to-one relation, meaning that the reverse relation will not point to an array as is the default.

### `reverse`

Only available on relation fiels. `graphql-magic` automatically generates a name for the reverse relation, e.g. for a `Comment` pointing to `Post`:

```ts
{
    name: 'Comment',
    fields: [
        {
            kind: 'relation',
            name: 'post',
            type: 'Post'
        }
    ]
}
```

the reverse relation will automatically be `Post.comments`. With `reverse` this name can be overridden.

### `onDelete`

Only available on relation fields. Can be `"cascade"` (default), `"restrict"` or `"set-null"`.
