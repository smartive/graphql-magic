# graphql-magic

Welcome to `graphql-magic`, a revolutionary library that transforms the way of working with GraphQL and databases in TypeScript projects. This library aims to streamline the development process, enhancing speed, efficiency, and type safety.

## Key Features

- **Model First**: Define your models and their relations directly in TypeScript. `graphql-magic` seamlessly integrates with your TypeScript projects, ensuring type safety and reducing the need for redundant code.
- **Automatic GraphQL Schema Generation**: Forget about manually writing your GraphQL schemas. With `graphql-magic`, your TypeScript model definitions are automatically transformed into fully functional GraphQL schemas.

- **Database Management Made Easy**: Leveraging the power of Knex for migrations, `graphql-magic` not only generates the necessary database schemas based on your models but also handles all database migrations for you. This means your database is always in sync with your application's models without any extra effort.
- **Speed and Efficiency**: Designed with performance in mind, `graphql-magic` ensures that your applications run swiftly and efficiently, handling complex queries and mutations with ease.

## Why graphql-magic?

`graphql-magic` was developed by smartive, representing the culmination of years of experience in creating robust, scalable, and efficient web applications. Suitable for both small projects and large-scale enterprise applications, `graphql-magic` offers the necessary tools for success.

The magic of `graphql-magic` takes TypeScript projects to the next level. To get started, visit the [Documentation](https://smartive.github.io/graphql-magic/).

## Development

Start the required dependencies such as a Postgres database:

```
npm run deps
```

```
npm bootstrap
```

Bootstrap the application by generating all the models, migrations and graphql schema:

```
npm run bootstrap
```

Run the tests to see if everything works properly:

```
npm test
```
