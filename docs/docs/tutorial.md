---
sidebar_position: 1
---

# Tutorial

Let's create a blog with `graphql-magic`!

## Setup

### Code base

First create a next.js website:

```
npx create-next-app@latest magic-blog --ts --app --tailwind --eslint --src
cd magic-blog
```

For some styling install `preline` and dependencies:

```
npm i preline @tailwindcss/forms
```

Add `@tailwindcss/forms` to `tailwind.config.ts`:

```
  plugins: [
    require('@tailwindcss/forms'),
  ],
```

Replace `app/globals.css`:

```
TODO
```

Replace `app/layout.tsx`:

```
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html>
        <body>{children}</body>
    </html>
  );
}
```

Replace `app/page.tsx`:

```
export default function Page() {
    return <div>
        <h1>Magic Blog</h1>
    </div>
}
```

Add this setting to `next.config.mjs`:

```
const nextConfig = {
    experimental: {
        serverComponentsExternalPackages: ['knex'],
    }
};
```

Install `@smartive/graphql-magic`:

```
npm install @smartive/graphql-magic
```

Temporary:

```
npm i @graphql-codegen/typescript-compatibility
```

Run the gqm cli:

```
npx gqm generate
```

Start the website:

```
npm run dev
```

### Database setup

Adapt the database `.env` variables to connect to a postgresql instance, or create a new one.
For example, to create a local instance with docker and docker-compose, create the following `docker-compose.yml`:

```
version: '3.4'
services:
  postgres:
    image: postgres:13-alpine
    shm_size: 1gb
    environment:
      POSTGRES_DB: postgres
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: password
      POSTGRES_HOST_AUTH_METHOD: trust
      TZ: 'Europe/Zurich'
    ports:
      - '5432:5432'
```

Then start it with `docker-compose up`.

Generate the first migration:

```
npx gqm generate-migration
```

Enter "setup" as migration name. Or you could first create a `feat/setup` git branch, then it would use that name automatically.


Run the migration

```
npx env-cmd knex migrate:up
```

### Auth setup

Set up a way for users to authenticate with your app.
For example, follow [this tutorial](https://auth0.com/docs/quickstart/webapp/nextjs/01-login) to set up auth0.

Assuming you used auth0, here's a bare-bones version of what `src/app/page.tsx` could look like:

```
import { getSession } from '@auth0/nextjs-auth0';

export default async function Page() {
  const session = await getSession();

  return <div>
      <h1>Welcome to my Blog</h1>
      {session ? <a href="/api/auth/logout">Logout</a> : <a href="/api/auth/login">Login</a>}
  </div>
}
```

It should now be possible for you to log in and out again.

### Account setup 

Now, we need to ensure that the user is stored in the database.

First extend the user model in `src/config/models.ts` with the following fields:

```
    fields: [
      {
        name: 'authId',
        type: 'String',
        nonNull: true,
      },
      {
        name: 'username',
        type: 'String',
        nonNull: true
      }
    ]
```

The models have changed, generate the new types:

```
npx gqm generate
```

Generate the new migration:

```
npx gqm generate-migration
```

Edit the generated migration, then run it

```
npx env-cmd knex migrate:up
```

Now let's implement the `// TODO: get user` part in the `src/graphql/execute.ts` file

```
  const session = await getSession();
  if (session) {
    let dbUser = await db('User').where({ authId: session.user.sid }).first();
    if (!user) {
      await db('User').insert({
        id: randomUUID(),
        authId: session.user.sid,
        username: session.user.nickname
      })
      dbUser = await db('User').where({ authId: session.user.sid }).first();
    }
    user = {
      ...dbUser!,
      role: 'ADMIN'
    }
  }
```

Extend `src/graphql/client/queries/get-me.ts` to also fetch the user's username:

```
import { gql } from '@smartive/graphql-magic';

export const GET_ME = gql`
  query GetMe {
    me {
      id
      username
    }
  }
`;
```

Generate the new types:

```
npx gqm generate
```

Now, let's modify `src/app/page.tsx` so that it fetches the user from the database:

```
import { GetMeQuery } from "../generated/client";
import { GET_ME } from "../graphql/client/queries/get-me";
import { executeGraphql } from "../graphql/execute";

export default async function Page() {
  const { data: { me }} = await executeGraphql<GetMeQuery>({ query: GET_ME });

  return <div>
      <h1>Welcome to my Blog</h1>
      {me ? <div>Hello {me.username}! <a href="/api/auth/logout">Logout</a></div> : <a href="/api/auth/login">Login</a>}
  </div>
}
```

### Content!

Let's create a blog by adding new models in `src/config/models.ts`:

```
  {
    kind: 'entity',
    name: 'Post',
    listQueriable: true,
    creatable: true,
    updatable: true,
    deletable: true,
    fields: [
      {
        name: 'title',
        type: 'String',
        nonNull: true,
        creatable: true,
        updatable: true,
      },
      {
        name: 'content',
        type: 'String',
        nonNull: true,
        creatable: true,
        updatable: true,
      }
    ]
  },
  {
    kind: 'entity',
    name: 'Comment',
    creatable: true,
    updatable: true,
    deletable: true,
    fields: [
      {
        kind: 'relation',
        name: 'post',
        type: 'Post',
        nonNull: true,
        creatable: true,
      },
      {
        name: 'content',
        type: 'String',
        nonNull: true,
        creatable: true,
        updatable: true,
      }
    ]
```

Generate and run the new migrations and generate the new models:

```
npx gqm generate-migration
npx env-cmd knex migrate:up
npx gqm generate
```

new get-posts

```
import { gql } from '@smartive/graphql-magic';

export const GET_POSTS = gql`
  query GetPosts {
    posts {
        id
        title
        content
        createdBy {
            username
        }
        comments {
            id
            createdBy {
                username
            }
            content
        }
    }
  }
`;
```

```
{me &&       <CreatePost/>  }
      <Posts/>
```

```
async function CreatePost() {
  async function createPost(formData: FormData) {
    'use server'
    await executeGraphql<CreatePostMutationMutation, CreatePostMutationMutationVariables>({
      query: CREATE_POST,
      variables: {
        data: {
          title: formData.get('title') as string,
          content: formData.get('content') as string
        }
      }
    })
    revalidatePath('/')
  }

  return <form action={createPost}>
    <h2>New Post</h2>
    <div>
      <span>Title</span>
      <input name="title" />
    </div>
    <div>
      <span>Content</span>
      <textarea rows={5} name="content" />
    </div>
    <div>
      <button type="submit">Create</button>
    </div>
  </form>
}
```

```
async function Posts() {
  const { data: { posts } } = await executeGraphql<GetPostsQuery>({ query: GET_POSTS })

  return <div>
    {posts.map(post => <div key={post.id}>
      <article>
        <h3>{post.title}</h3>
        <div>{post.createdBy.username}</div>
        <div>{post.content}</div>
        {post.comments.map(comment => (<div key={comment.id}>
          <div>{comment.createdBy.username}</div>
          <p>{comment.content}</p> by {comment.createdBy.username}
        </div>)
        )}
        <CreateComment postId={post.id} />
      </article>
    </div>)}
  </div>
}
```

```
function CreateComment({ postId }: { postId: string }) {
  async function createComment(formData: FormData) {
    'use server'

    const res = await executeGraphql<CreateCommentMutationMutation, CreateCommentMutationMutationVariables>({
      query: CREATE_COMMENT,
      variables: {
        data: {
          postId,
          content: formData.get('content') as string
        }
      }
    })
    console.log(res)
    revalidatePath('/')
  }
  return <form action={createComment}>
    <div>
      <textarea name="content" placeholder="Leave a comment..." />
    </div>
    <div>
      <button type="submit">Send</button>
    </div>
  </form>
}
```
