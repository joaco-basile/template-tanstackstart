---
name: project-error-handling
description: >
  Project-specific error handling patterns for the full-stack TanStack Start stack.
  Covers server function errors, Zod validation, TanStack Query error boundaries,
  and form error mapping. Trigger when writing createServerFn handlers, handling
  mutation/query errors, or deciding how to structure AppError vs ZodError.
license: Apache-2.0
metadata:
  author: gentleman-programming
  version: "1.0"
---

## When to Use

- Writing a `createServerFn` and you need to decide how to throw errors
- Mapping server errors to a TanStack Form
- Configuring error boundaries on TanStack Router routes
- Defining a new business error type (not found, unauthorized, conflict)
- Deciding whether to use `.validator(zodSchema)` directly or parse manually

## Core Principle: Hybrid Model

We use **two error systems in layers**, not a single one:

| Layer | Error Type | When | Why |
|-------|-----------|------|-----|
| **Input validation** | `ZodError` | `.validator(zodSchema)` fails | TanStack Form understands `ZodError` natively (nested paths, `zodValidator`) |
| **Business / DB / Auth** | `AppError` | Inside `.handler()` | Unifies everything Zod cannot know: duplicates, permissions, not found |

> **Never manually transform `ZodError` into `ValidationError`.** Use `.validator()` directly and let TanStack Start serialize the `ZodError`. On the client, if the error is form-related, use `error.issues`. If it is a mutation error, use `AppError`.

## Error Hierarchy

```ts
// src/lib/errors.ts
export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public status: number = 400
  ) {
    super(message)
    this.name = 'AppError'
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(`${resource} not found`, 'NOT_FOUND', 404)
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super(message, 'UNAUTHORIZED', 401)
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 'CONFLICT', 409)
  }
}

export class InternalError extends AppError {
  constructor(message = 'Internal server error') {
    super(message, 'INTERNAL_ERROR', 500)
  }
}
```

## Server Function Pattern

```ts
import { createServerFn, notFound } from '@tanstack/react-start'
import { z } from 'zod'
import { db } from '@/lib/db.server'
import { AppError, ConflictError, NotFoundError } from '@/lib/errors'

const createPostSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  content: z.string().min(1, 'Content is required'),
})

export const createPost = createServerFn({ method: 'POST' })
  .validator(createPostSchema) // ← Raw ZodError. Do not touch it.
  .handler(async ({ data }) => {
    try {
      return await db.posts.create({ data })
    } catch (error) {
      if (error.code === 'P2002') {
        throw new ConflictError('A post with that title already exists')
      }
      console.error('DB error:', error)
      throw new InternalError()
    }
  })

export const getPost = createServerFn()
  .validator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    const post = await db.posts.findUnique({ where: { id: data.id } })
    if (!post) throw notFound() // ← TanStack Start 404
    return post
  })
```

## Client-Side: Mutation Error Handling

```tsx
import { useMutation } from '@tanstack/react-query'
import { ZodError } from 'zod'
import { AppError } from '@/lib/errors'
import { createPost } from '@/lib/posts.functions'

function CreatePostForm() {
  const form = useForm({
    // ... tanstack form config
  })

  const mutation = useMutation({
    mutationFn: createPost,
    onError: (error) => {
      // 1. If it is a ZodError → field errors (came from .validator())
      if (error instanceof ZodError) {
        error.issues.forEach((issue) => {
          form.setFieldMeta(issue.path, (prev) => ({
            ...prev,
            errorMap: { onServer: issue.message },
          }))
        })
        return
      }

      // 2. If it is an AppError → global mutation error
      if (error instanceof AppError) {
        form.setFieldMeta('root', (prev) => ({
          ...prev,
          errorMap: { onServer: error.message },
        }))
        return
      }

      // 3. Fallback
      form.setFieldMeta('root', (prev) => ({
        ...prev,
        errorMap: { onServer: 'An unexpected error occurred' },
      }))
    },
  })
}
```

## Route-Level Error Boundaries

```tsx
import { createFileRoute } from '@tanstack/react-router'
import { useQueryErrorResetBoundary } from '@tanstack/react-query'
import { ErrorBoundary } from 'react-error-boundary'

export const Route = createFileRoute('/posts/$postId')({
  loader: ({ context: { queryClient }, params }) =>
    queryClient.ensureQueryData(postQueries.detail(params.postId)),

  errorComponent: ({ error, reset }) => {
    const { reset: resetQuery } = useQueryErrorResetBoundary()

    return (
      <div>
        <h2>Error loading post</h2>
        <p>{error instanceof Error ? error.message : 'Unknown error'}</p>
        <button onClick={() => { resetQuery(); reset(); }}>
          Retry
        </button>
      </div>
    )
  },

  component: PostPage,
})
```

## QueryClient Default Error Config

```ts
// src/integrations/tanstack-query/root-provider.tsx
import { QueryClient } from '@tanstack/react-query'

export function getContext() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: (failureCount, error) => {
          // Do not retry 4xx errors (they are definitive)
          if (error instanceof AppError && error.status >= 400 && error.status < 500) {
            return false
          }
          return failureCount < 3
        },
        staleTime: 60 * 1000,
      },
      mutations: {
        retry: false, // Mutations never retry by default
      },
    },
  })
  return { queryClient }
}
```

## Decision Tree

```
Is the error an input validation error?
├── Yes → Use .validator(zodSchema). The client receives ZodError.
│          Map error.issues to the form fields.
└── No → Is it a business/DB/auth error?
    ├── Yes → Throw AppError (or subclass) from the handler.
    │          The client receives AppError with .code and .status.
    └── No → Unexpected error. Log on the server, throw InternalError.
              Client shows a generic message.
```

## What NOT to Do

- ❌ Do not manually wrap `ZodError` in `ValidationError`. You lose integration with TanStack Form.
- ❌ Do not return `{ success: false, error: string }` from `createServerFn`. TanStack Start and Query expect `throw`.
- ❌ Do not use generic `Error` on the server. Always throw `AppError` so the client can distinguish 4xx from 5xx.
- ❌ Do not use `instanceof ZodError` for business errors. `ZodError` is for input validation only.

## Commands

No specific commands. Verify consistency with:
- `npm run check` — linting and formatting
- `npm run test:server` — server function tests
- `npm run test:client` — component and hook tests

## Resources

- **TanStack Start errors**: See [tanstack-start-best-practices](../tanstack-start-best-practices/SKILL.md)
- **TanStack Query errors**: See [tanstack-query-best-practices](../tanstack-query-best-practices/SKILL.md)
