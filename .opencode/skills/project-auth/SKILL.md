---
name: project-auth
description: >
  Project-specific authentication patterns using Better Auth. Covers session management,
  route protection with beforeLoad, server function auth checks, middleware, and error handling.
  Trigger when implementing login, logout, protected routes, session checks, or auth middleware.
license: Apache-2.0
metadata:
  author: gentleman-programming
  version: "1.0"
---

## When to Use

- Implementing login, logout, sign-up, or password reset flows.
- Protecting a route so only authenticated users can access it.
- Checking session state inside a server function or middleware.
- Handling `UnauthorizedError` or auth-related redirects.
- Deciding where to place auth logic (route vs middleware vs server function).

## Core Principle: Auth at the Boundary

Authentication and authorization checks should happen as **early as possible** in the request lifecycle:

1. **Route level** (`beforeLoad`) — cheapest. Prevents rendering entirely.
2. **Middleware level** — for cross-cutting concerns (logging user ID, attaching context).
3. **Server Function level** — final gatekeeper. Always verify inside `.handler()` if the operation is sensitive.

Never rely solely on client-side checks. The client can be bypassed.

---

## Better Auth Setup

This project uses [Better Auth](https://www.better-auth.com/) for session management.

### Server Instance (`src/lib/auth.ts`)

```ts
import { betterAuth } from 'better-auth'
import { tanstackStartCookies } from 'better-auth/tanstack-start'

export const auth = betterAuth({
  emailAndPassword: {
    enabled: true,
  },
  plugins: [tanstackStartCookies()],
})
```

### API Route (`src/routes/api/auth/$.ts`)

Better Auth requires a catch-all route to handle its internal endpoints (login, logout, callback, etc.).

```ts
import { createFileRoute } from '@tanstack/react-router'
import { auth } from '#/lib/auth'

export const Route = createFileRoute('/api/auth/$')({
  server: {
    handlers: {
      GET: ({ request }) => auth.handler(request),
      POST: ({ request }) => auth.handler(request),
    },
  },
})
```

### Client Hook (`src/lib/auth-client.ts`)

```ts
import { createAuthClient } from 'better-auth/react'

export const authClient = createAuthClient()
```

Use `authClient.useSession()` in components to reactively track auth state.

---

## Route Protection (`beforeLoad`)

Always use route-level `beforeLoad` for auth guards. This is the earliest point in the lifecycle.

```ts
import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/dashboard')({
  beforeLoad: async ({ context }) => {
    const session = await context.queryClient.fetchQuery({
      queryKey: ['auth', 'session'],
      queryFn: () => authClient.getSession(),
    })

    if (!session?.user) {
      throw redirect({ to: '/login' })
    }

    // Return user so it becomes typed route context
    return { user: session.user }
  },
})
```

**Why `beforeLoad`?**
- It runs before the loader, so unauthenticated users never trigger data fetches.
- The returned context is typed and available to all child routes.

---

## Server Function Auth

Inside `createServerFn` handlers, always verify the session if the operation is sensitive.

```ts
import { createServerFn } from '@tanstack/react-start'
import { auth } from '#/lib/auth'
import { UnauthorizedError } from '#/lib/errors'

export const deleteAccount = createServerFn({ method: 'POST' })
  .handler(async ({ request }) => {
    const session = await auth.api.getSession({ headers: request.headers })
    if (!session) throw new UnauthorizedError()

    // ... proceed with deletion
  })
```

---

## Auth Middleware (`src/middleware/`)

Use middleware for cross-cutting auth concerns (attaching user to context, logging) rather than gating access. Gating belongs in `beforeLoad`.

```ts
// src/middleware/auth.ts
import { createMiddleware } from '@tanstack/react-start'

export const authMiddleware = createMiddleware().server(async ({ request, next }) => {
  const session = await auth.api.getSession({ headers: request.headers })
  return next({ context: { user: session?.user ?? null } })
})
```

---

## Error Handling

Use the project's `UnauthorizedError` for auth failures. Do not throw generic `Error` or return `{ success: false }`.

```ts
import { UnauthorizedError } from '#/lib/errors'

if (!session) throw new UnauthorizedError()
```

On the client, catch `AppError` instances and handle `UNAUTHORIZED` code appropriately (redirect to login, show toast, etc.).

---

## Cookie Security

Better Auth with `tanstackStartCookies()` handles secure cookie settings automatically. Do not manually configure cookie flags unless you have a specific reason.

Ensure `SERVER_URL` environment variable is set correctly in production so cookie domains work as expected.

---

## Commands

No specific commands. Verify consistency with:
- `npm run check` — linting and formatting
- `npm run test:server` — server function tests

## Resources

- **Error Handling**: See [project-error-handling](../project-error-handling/SKILL.md) for `AppError` hierarchy and server/client error mapping.
- **TanStack Start**: See [tanstack-start-best-practices](../tanstack-start-best-practices/SKILL.md) for middleware and server function patterns.
