---
name: project-architecture
description: >
  Project-specific architecture patterns for Feature-Sliced Design (FSD), global infrastructure layout,
  component design, and routing/data loading. Trigger when scaffolding features, organizing code,
  deciding where a file belongs, or designing component hierarchies.
license: Apache-2.0
metadata:
  author: gentleman-programming
  version: "1.0"
---

## When to Use

- Scaffolding a new feature or business domain.
- Deciding where a new file belongs (feature vs global).
- Designing component hierarchies (dumb vs smart).
- Setting up routing, loaders, and data loading strategies.
- Scaling a feature that has grown too large.

---

## Core Philosophy

### 1. Feature-Sliced Design (FSD)
Group code by **business domain** (features) rather than by technical concern (components, hooks, services). If a developer needs to fix a bug in the "Users" logic, they should only need to open the `src/features/users/` folder.

The golden rule is: **"Things that change together, live together."**

### 2. Infrastructure Decoupling
The `src/features/` folder is the heart of the application (Domain). Everything else (`src/lib/`, `src/db/`, `src/components/ui/`, `src/routes/`) exists ONLY to support the features.

**Golden rule:** Infrastructure must be completely decoupled from Business Logic.

---

## Global Architecture

The project strictly follows this root structure. Do not invent new root folders without architectural consensus.

```text
src/
├── components/          # Global, domain-agnostic UI
│   ├── ui/              # Pure "dumb" atoms (Buttons, Inputs, Shadcn)
│   ├── layouts/         # Page structures (Sidebar, Navbar)
│   └── providers/       # Global contexts (QueryClient, Theme)
│
├── db/                  # Database Infrastructure (Drizzle)
│   ├── schemas/         # Table definitions (NO query logic here)
│   ├── index.server.ts  # DB connection instance
│   └── migrations/      # SQL migration files
│
├── features/            # 👑 BUSINESS LOGIC (See Feature Structure below)
│
├── lib/                 # Pure Infrastructure & Utilities
│   ├── utils.ts         # Pure functions (date formatting, cn for tailwind)
│   ├── query-client.ts  # TanStack Query configuration
│   └── constants.ts     # Global system constants
│
├── middleware/          # TanStack Start server interceptors
│   ├── auth.ts          # Session checking middleware
│   └── logging.ts       # Request logging
│
├── routes/              # TanStack Router (Glue Code)
│   ├── __root.tsx       # Master layout
│   └── ...              # File-based routes
│
└── env.ts               # Strict Zod environment variable validation
```

### The 3 Golden Rules of Infrastructure

1. **`src/lib/` is NOT for business logic.** Never put business-specific functions (e.g., `calculateUserTaxes()`) in `lib`. `lib` is strictly for code that you could copy-paste into a completely different project without modifications.

2. **Routes are just "Glue Code."** Files inside `src/routes/` MUST NOT contain complex UI or deep business logic. Their sole responsibility is to:
   - Define the URL state (`validateSearch`).
   - Define the loader (calling `ensureQueryData` or `defer`).
   - Import and render the main Smart Component from `src/features/<feature>/components/`.

3. **Strict Environment Validation.** Always define and validate environment variables in `env.ts` using Zod. Do not use `process.env.XYZ` directly in application code without it passing through the typed `env` object.

---

## Feature Structure Contract

Every business domain or use case MUST live under `src/features/<feature-name>/`. A complete feature consists of 7 distinct parts, enforcing a clear boundary between Client, Server, and Validation.

### The Anatomy of a Feature

#### 1. `components/` — Domain-specific UI
Contains all views, modals, and components that know about this specific feature.
- Can import from `src/components/ui/` (dumb components).
- Can import `queries`, `mutations`, and `schemas` from its own feature.
- **NEVER** imports components from other features to avoid circular dependencies.

#### 2. `<feature>.ts` — Client-Safe Types
- Type definitions shared across client and server.
- Types for API responses, flat rows, or basic domain structures.
```ts
export type UserRow = {
  id: number;
  email: string;
  role: 'admin' | 'user';
};
```

#### 3. `<feature>.schema.ts` — Validation (Zod)
- Schemas for inputs (Create, Update, Filters).
- Must be client-safe (no node/DB imports) so they can be used in React Hook Form and Server Functions simultaneously.

#### 4. `<feature>.server.ts` — Database Logic (Server-Only)
- Contains all Drizzle queries and DB interactions.
- Returns plain objects or arrays (`Promise<UserRow>`).
- **NEVER** imported by components or client files.

#### 5. `<feature>.function.ts` — TanStack Start RPCs
- Wraps the `.server.ts` logic in `createServerFn`.
- Injects middlewares (e.g., authentication, permissions).
- Uses `.validator()` pointing to the schemas in `<feature>.schema.ts`.

#### 6. `<feature>.queries.ts` — Query Options
- Contains all `queryOptions` factories for TanStack Query.
- Imports the RPCs from `<feature>.function.ts`.
- Defines Query Keys and Stale Times.

#### 7. `<feature>.mutations.ts` — Custom Hooks
- Wraps mutations in `useMutation` hooks.
- Handles cache invalidation for the feature's query keys automatically upon success.

### Strict Import Rules

| File | Can import from |
|------|-----------------|
| `components/*` | Own `queries`, `mutations`, `schemas`, `types`. Global `src/components/ui`. |
| `.ts` (types) | Any client-safe type file. |
| `.schema.ts` | `zod`, shared constants. |
| `.server.ts` | `db/`, `drizzle-orm`, server-only utils. |
| `.function.ts` | `.server.ts`, `.schema.ts`, `middleware/`. |
| `.queries.ts` | `.function.ts`, `lib/query-keys`. |
| `.mutations.ts`| `.function.ts`, `lib/query-keys`. |

---

## Component Design: Smart vs Dumb

We DO NOT use strict Atomic Design (Atoms/Molecules/Organisms) as it creates friction and decision paralysis when mixed with Feature-Sliced Design. Instead, we use a pragmatic separation based on **Domain Knowledge**.

### 1. Global UI (`src/components/ui/`)
**"Dumb Components"**
- Purely visual, stateless (or only local UI state), and highly reusable (e.g., shadcn/ui components).
- **Rule:** They know absolutely NOTHING about the business domain, database, or API.
- Examples: `Button.tsx`, `DataTable.tsx`, `Modal.tsx`.

### 2. Feature UI (`src/features/<feature>/components/`)
**"Smart Components"**
- Highly tied to the business logic.
- They fetch data, run mutations, and implement domain rules.
- Examples: `UserListTable.tsx`, `CreateUserForm.tsx`.

### The Escalation Path (How to scale feature components)

When a feature grows, its `components/` folder can become messy. Follow this progression to keep it clean:

#### Phase 1: Flat Files
Start simple. Keep all feature components as flat files.
```text
features/users/components/
  UserList.tsx
  CreateUserModal.tsx
```

#### Phase 2: Container / Presentational
When a component gets too large (>200 lines) because it mixes complex React Hook Form state, useQuery, and JSX:
Split it into logic (Container) and pure UI (Presentational).
```text
features/users/components/
  UserList.tsx       (Container: Fetches data, passes props)
  UserListView.tsx   (Presentational: Only renders JSX)
```

#### Phase 3: Co-location by Component
When a component requires sub-components that are EXCLUSIVE to it, turn the component into a folder. Group by visual affinity, not by "size".
```text
features/users/components/
  UserList/
    index.tsx             (Main container)
    UserListFilters.tsx   (Private sub-component)
    UserListRow.tsx       (Private sub-component)
  CreateUserModal.tsx
```

#### Phase 4: Feature Splitting
If a feature ends up with 20+ components and multiple sub-folders, it's no longer a single feature. It's a monolith.
**Action:** Split the domain.
Change `features/users/` into:
- `features/user-management/`
- `features/user-billing/`
- `features/user-profile/`

---

## Routing & Data Loading Patterns

### 1. URL as Single Source of Truth

All table/list state (page, limit, search queries, active tabs, sorting) MUST live in the URL Search Params.

**Why?**
- Allows Deep-linking (users can share exact views).
- Native back/forward browser navigation works out of the box.
- Allows SSR data fetching because the server knows the state before rendering.

**Implementation:**
Use TanStack Router's `validateSearch` with a Zod schema in your route file, and read from it to feed your `queryOptions`. Never use `useState` for things that affect the main layout's data. Modals or ephemeral toggles CAN use local state.

### 2. Data Loading: Critical vs Deferred

TanStack Router + Query provides zero-waterfall data fetching, but we must choose the right strategy for UX.

#### Strategy A: Critical Data (`await ensureQueryData`)
Use this when the page CANNOT be rendered without this data (e.g., user permissions, the main entity being edited).
- **Impact:** Blocks navigation. The user stays on the previous page until the fetch resolves.
- **Code:**
```ts
loader: async ({ context: { queryClient }, params }) => {
  // Await blocks navigation
  await queryClient.ensureQueryData(usersQueries.detail(params.id));
}
```

#### Strategy B: Deferred Data (Non-blocking)
Use this for slow data or secondary information (e.g., dashboard stats, related lists, comments).
- **Impact:** Navigation is instant. The user sees the new page immediately, and a Skeleton/Spinner is shown while the data arrives.
- **Code:**
```ts
loader: async ({ context: { queryClient }, params }) => {
  // DO NOT await. Fire and forget.
  queryClient.prefetchQuery(usersQueries.stats(params.id));
}
```
In the component, use `useQuery` (which might be in `isLoading` state) instead of `useSuspenseQuery`.

### 3. Server Middlewares (`beforeLoad`)

Always use Route-level middlewares for Authentication and Authorization.
- Use `beforeLoad` to check session state.
- Throw `redirect()` to bounce unauthenticated users.
- Return user data from `beforeLoad` so it becomes part of the Route Context, guaranteeing that loaders and components have typed access to the current user without refetching.

---

## Commands

No specific commands. Verify consistency with:
- `npm run check` — linting and formatting
- `npm run test:server` — server function tests
- `npm run test:client` — component and hook tests

## Resources

- **TanStack Start**: See [tanstack-start-best-practices](../tanstack-start-best-practices/SKILL.md)
- **TanStack Router**: See [tanstack-router-best-practices](../tanstack-router-best-practices/SKILL.md)
- **Database**: See [project-database](../project-database/SKILL.md)
