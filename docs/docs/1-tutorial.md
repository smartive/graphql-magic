# Tutorial

Let's create a blog with `graphql-magic`!

## Setup

### Code base

First create a `next.js` website:

```
npx create-next-app@latest magic-blog --ts --app --tailwind --eslint --src-dir
cd magic-blog
```

Replace `src/app/globals.css`:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

main {
    @apply w-96 mx-auto
}

nav {
    @apply flex items-center
}

h1, h2, h3, h4 {
    @apply font-bold
}

h1 {
    @apply text-4xl mb-4 flex-grow
}

h2 {
    @apply text-3xl mb-3
}

h3 {
    @apply text-2xl mb-2
}

h4 {
    @apply text-xl mb-1
}

a {
    @apply text-blue-500
}

article, form {
    @apply mb-4 p-3 rounded-lg shadow-md border border-gray-100
}

input, textarea {
    @apply border border-gray-300 w-full rounded-md p-1
}

label span {
    @apply font-bold
}
```

Replace `src/app/page.tsx`:

```tsx
export default async function Home() {
    return <main>
      <nav>
        <h1>Magic Blog</h1>
      </nav>
    </main>
}
```

Start the website:

```bash
npm run dev
```

### Install graphql-magic

Add this setting to `next.config.mjs`:

```ts
const nextConfig = {
    experimental: {
        serverComponentsExternalPackages: ['knex'],
    }
};
```

Install `@smartive/graphql-magic` and needed dependencies:

```bash
npm install @smartive/graphql-magic
```

Run the gqm cli:

```bash
npx gqm generate
```

### Database setup

Let's boot a local database instance.
Create the following `docker-compose.yml`:

```yml
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
    ports:
      - '5432:5432'
```

Then start it with `docker-compose up`.

Generate the first migration:

```bash
npx gqm generate-migration
```

Enter a migration name, e.g. "setup".


Run the migration

```bash
npx env-cmd knex migrate:latest
```

### Auth setup

Set up a way for users to authenticate with your app.
For example, follow [this tutorial](https://auth0.com/docs/quickstart/webapp/nextjs/01-login) to set up auth0.

Assuming you used auth0, here's a bare-bones version of what `src/app/page.tsx` could look like:

```tsx
import { getSession } from '@auth0/nextjs-auth0';

export default async function Page() {
  const session = await getSession();

  return <main>
    <nav>
      <h1>Welcome to my Blog</h1>
      {session ? <a href="/api/auth/logout">Logout</a> : <a href="/api/auth/login">Login</a>}
    </nav>
  </main>
}
```

It should now be possible for you to log in and out again.

### Account setup 

Now, we need to ensure that the user is stored in the database.

First extend the user model in `src/config/models.ts` with the following fields:

```tsx
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

```bash
npx gqm generate
```

Generate the new migration:

```bash
npx gqm generate-migration
```

Edit the generated migration, then run it

```bash
npx env-cmd knex migrate:latest
```

Now let's implement the `// TODO: get user` part in the `src/graphql/execute.ts` file

```ts
  const session = await getSession();
  if (session) {
    let dbUser = await db('User').where({ authId: session.user.sub }).first();
    if (!user) {
      await db('User').insert({
        id: randomUUID(),
        authId: session.user.sub,
        username: session.user.nickname
      })
      dbUser = await db('User').where({ authId: session.user.sub }).first();
    }
    user = {
      ...dbUser!,
      role: 'ADMIN'
    }
  }
```

Extend `src/graphql/client/queries/get-me.ts` to also fetch the user's username:

```ts
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

```bash
npx gqm generate
```

Now, let's modify `src/app/page.tsx` so that it fetches the user from the database:

```tsx
import { GetMeQuery } from "@/generated/client";
import { GET_ME } from "@/graphql/client/queries/get-me";
import { executeGraphql } from "@/graphql/execute";

export default async function Home() {
  const { data: { me } } = await executeGraphql<GetMeQuery>({ query: GET_ME });

  return (
    <main>
      <nav>
        <h1>Blog</h1>
        {me ? <span>Hello, {me.username}! <a href="/api/auth/logout"> Logout</a></span> : <a href="/api/auth/login">Login</a>}
      </nav>
    </main>
  );
}
```

### Content!

Let's make a blog out of this app by adding new models in `src/config/models.ts`:

```ts
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
  }
```

Generate and run the new migrations and generate the new models:

```bash
npx gqm generate-migration
npx env-cmd knex migrate:latest
```

Create a new query `src/graphql/client/queries/get-posts.ts`:

```ts
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

Generate the new types:

```bash
npx gqm generate
```

Now add all the logic to create and display posts and comments to `src/app/page.tsx`


```tsx
import { CreateCommentMutationMutation, CreateCommentMutationMutationVariables, CreatePostMutationMutation, CreatePostMutationMutationVariables, GetMeQuery, GetPostsQuery } from "@/generated/client";
import { CREATE_COMMENT, CREATE_POST } from "@/generated/client/mutations";
import { GET_ME } from "@/graphql/client/queries/get-me";
import { GET_POSTS } from "@/graphql/client/queries/get-posts";
import { executeGraphql } from "@/graphql/execute";
import { revalidatePath } from "next/cache";

export default async function Home() {
  const { data: { me } } = await executeGraphql<GetMeQuery>({ query: GET_ME });

  return (
    <main>
      <nav>
        <h1>Blog</h1>
        {me ? <span>Hello, {me.username}! <a href="/api/auth/logout"> Logout</a></span> : <a href="/api/auth/login">Login</a>}
      </nav>
      {me && <CreatePost />}
      <Posts me={me} />
    </main>
  );
}

async function Posts({ me }: { me: GetMeQuery['me'] }) {
  const { data: { posts } } = await executeGraphql<GetPostsQuery>({ query: GET_POSTS })

  return <div>
    {posts.map(post => <div key={post.id}>
      <article>
        <h2>{post.title}</h2>
        <div>by {post.createdBy.username}</div>
        <p>{post.content}</p>
        <h4>Comments</h4>
        {post.comments.map(comment => (<div key={comment.id}>
          <div>{comment.createdBy.username}</div>
          <p>{comment.content}</p> by {comment.createdBy.username}
        </div>)
        )}
        {me && <CreateComment postId={post.id} />}
      </article>
    </div>)}
  </div>
}

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
    <label>
      <span>Title</span>
      <input name="title" />
    </label>
    <label>
      <span>Content</span>
      <textarea rows={5} name="content" />
    </label>
    <div>
      <button type="submit">Create</button>
    </div>
  </form>
}

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

Now you should have a working minimal blog example!
