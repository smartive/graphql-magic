# Graphql querying

For autocompletion of your queries, you can create the following `apollo.config.js` file:

```ts
module.exports = {
  client: {
    service: {
      name: 'your-project',
      localSchemaFile: './src/generated/schema.graphql',
    },
    includes: ['./src/**/*.ts', './src/**/*.tsx'],
  },
};
```

## Querying mechanisms

### Server side

On the server side, and with `next.js` server actions, a GraphQL API becomes unnecessary, and you can execute queries directly using `executeGraphql`:

```tsx
import { GetMeQuery, GetPostsQuery } from "@/generated/client";
import { GET_POSTS } from "@/graphql/client/queries/get-posts";
import { executeGraphql } from "@/graphql/execute";

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
      </article>
    </div>)}
  </div>
}
```

### Client side

On the client, you'd need to set up a GraphQL endpoint and then query it like any other GraphQL API, such as with [`@apollo/client`](https://www.apollographql.com/docs/react/get-started).

```tsx
import { GetMeQuery, GetPostsQuery } from "@/generated/client";
import { GET_POSTS } from "@/graphql/client/queries/get-posts";
import { executeGraphql } from "@/graphql/execute";
import { gql, useQuery } from '@apollo/client';

function Posts({ me }: { me: GetMeQuery['me'] }) {
  const { loading, error, data } = useQuery<GetPostsQuery>({ query: GET_POSTS })

  if (loading) {
    return 'Loading...';
  }
  if (error) {
    return `Error! ${error.message}`;
  }

  return <div>
    {res?.data?.posts.map(post => <div key={post.id}>
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
      </article>
    </div>)}
  </div>
}
```

## Mutations

Mutation queries are generated by `graphql-magic` directly so you don't need to write them. They have a very simple structure:

```ts
export const CREATE_POST = gql`
  mutation CreatePostMutation($data: CreatePost!) {
    createPost(data: $data) { id }
  }
`;

export const UPDATE_POST = gql`
  mutation UpdatePostMutation($id: ID!, $data: UpdatePost!) {
    updatePost(where: { id: $id }, data: $data) { id }
  }
`;

export const DELETE_POST = gql`
  mutation DeletePostMutation($id: ID!) {
    deletePost(where: { id: $id })
  }
`;
```

Use like this:

```tsx
import { CreatePostMutationMutation, CreatePostMutationMutationVariables } from "@/generated/client";
import { CREATE_POST } from "@/generated/client/mutations";
import { executeGraphql } from "@/graphql/execute";
import { revalidatePath } from "next/cache";

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
```

Just like with queries, if is necessary to perform mutations on the client, use a GraphQL client instead of `executeGraphql`.
