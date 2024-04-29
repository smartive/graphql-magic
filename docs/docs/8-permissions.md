# Permissions

Permissions are an object provided to the `execute` function.
The root keys of the objects are the user roles (including the special role `UNAUTHENTICATED` for when the user object is undefined).

```ts
execute({
    ...
    user: {
        // ...
        role: 'USER' // this is the role that will apply
    },
    permissions: {
        ADMIN: ... // admin permissions
        USER: ... // user permissions
        UNAUTHENTICATED: ... // permissions for unauthenticated users
    }
})
```

## Grant all permissions

```ts
ADMIN: true
```

## Actions

- READ
- CREATE
- UPDATE
- DELETE
- RESTORE
- LINK

Grant all READ permissions on a specific table:

```ts
User: {} // same as User: { READ: true }
```

Grant actions other than READ on a specific table:

```ts
User: { CREATE: true }
```

## Linking

The LINK permission doesn't give one permission to modify these records,
but to use them as options for foreign keys in _other_ records that one does have the permission to CREATE/UPDATE.

So, for example, if you want a manager to be able to assign a user to a task, you would model it like this:

```ts
MANAGER: {
  User: { LINK: true }
  Task: { UPDATE: true }
}
```

## Narrowing the record set

Use WHERE, which accepts simple table column/value pairs that are then used as sql where filter.

```ts
GUEST: {
  Post: {
    WHERE: { published: true }
  }
}
```

## Derivative permissions

In the following way you can define permissions that follow the relational structure.

"If I can read a board (because it is public), then I can follow all threads and their authors, and their replies, which I can like."

```ts
GUEST: {
  Board: {
    WHERE: { public: true }
    RELATIONS: {
      threads: {
        RELATIONS: {
          LINK: true,
          author: {},
          replies: {
            CREATE: true,
            LINK: true,
            likes: {
              CREATE: true
            }
          }
        }
      }
    }
  }
}
```

## Me

You can use `me` as a special `User` record set containing just yourself.

```ts
EMPLOYEE: {
  me: {
    UPDATE: true,
    LINK: true,
    RELATIONS: {
      tasks: {
        UPDATE: true
      }
    }
  }
}
```

Note: for ownership patterns (I own what I create, I can update what I own),
one must use implicitly generated relationships such as `createdPosts`, `updatedPosts`, `deletedPosts`:

```ts
GUEST: {
  me: {
    LINK: true,
    RELATIONS: {
      createdPosts: {
        // "guests can create a post with the field createdBy === me"
        CREATE: true,
        UPDATE: true
      },
      updatedPosts: {
        // this is necessary or it won't be possible to create a post
        // "guests can create a post with the field updatedBy === me"
        CREATE: true

        // this is *not* necessary because the user can already update posts they created
        // UPDATE: true
      }
    }
  }
}
```
