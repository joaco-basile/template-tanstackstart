---
name: project-testing
description: >
  Project-specific testing patterns and contracts using Vitest, TDD, and React Testing Library.
  Trigger: When writing, updating, or planning tests for components, server functions, or database queries.
license: Apache-2.0
metadata:
  author: gentleman-programming
  version: "1.0"
---

## When to Use

- When starting a new feature and planning the testing strategy.
- When writing integration tests for Drizzle/DB logic (`.server.test.ts`) — see [project-database](../project-database/SKILL.md) for DB-specific golden rules.
- When writing UI component tests with React Testing Library (`.test.tsx`).
- When configuring test setup, mocks, or Vitest workspaces.

## Critical Patterns

1. **Strict Co-location**: Tests MUST live exactly next to the file they test. No global `src/tests/` folder. (`users.server.ts` -> `users.server.test.ts`).
2. **Vertical Slicing (Tracer Bullets)**: Do NOT write tests horizontally (all tests first, then all code). Follow strict TDD: One failing test -> minimal code to pass -> refactor -> repeat.
3. **Zero Internal Mocks**: 
   - **DB/Server**: NEVER mock Drizzle or the database. Use a real test database instance. Test the public interface of the `.server.ts` file, not its SQL implementation.
   - **UI**: Do not mock internal React Query caching logic. Mock ONLY the network boundaries (using MSW or specific external API mocks).
4. **Vitest Projects (Vitest 4+)**: Never mix DOM and Node environments. 
   - Use a root `vitest.config.ts` with `test.projects` to run **all tests** (`pnpm test`).
   - Create **dedicated configs** (`vitest.server.config.ts`, `vitest.client.config.ts`) for individual scripts (`pnpm test:server`, `pnpm test:client`). Vitest 4's `--project` flag does NOT work with inline `test.projects` — it only works with workspace files (deprecated) or separate configs.
5. **Fixtures over Boilerplate**: Do not use massive `beforeEach` or manual setup functions in every test. Use Vitest Test Context (`test.extend`) to inject ready-to-use databases, users, or MSW servers.
6. **T3Env in Vitest (Node)**: `runtimeEnv` must be conditional:
   ```ts
   runtimeEnv: typeof process !== 'undefined' ? process.env : import.meta.env
   ```
   Do NOT use `import.meta.env ?? process.env`. In Vitest's Node environment, `import.meta.env` is `{}` (truthy), so the fallback to `process.env` never executes, causing validation errors for server variables like `DATABASE_URL`.
7. **Environment Variables Loading in ESM**: In ESM, `import` declarations are hoisted and evaluated before any module code. Loading `.env` via `import 'dotenv/config'` inside a `setupFile` or fixture arrives too late — `env.ts` may have already thrown. Load `.env.test` at the top of `vitest.config.ts` (before `defineConfig`) or use the `envFile` project option.
8. **Isolate `vitest.config.ts` from Vite plugins**: If `vite.config.ts` loads React/TanStack plugins, Vitest may inherit them and break Node tests with `ReferenceError: module is not defined`. Always provide a dedicated `vitest.config.ts`.

## Tooling & Data Contracts

1. **Test Data Builders (Factories)**: 
   - Use `@faker-js/faker` to generate all mock data.
   - Do NOT use massive hardcoded object literals in tests.
   - Factories should be consumed within Vitest Fixtures (`test.extend`), hiding the complexity from the actual test implementation.
2. **Network Mocking (MSW)**: 
   - NEVER use `vi.spyOn(global, 'fetch')` or mock TanStack Query hooks directly.
   - Use **MSW (Mock Service Worker)** to intercept network requests at the HTTP level. 
   - Co-locate MSW handlers within their respective features (e.g., `src/features/users/mocks/handlers.ts`).
3. **End-to-End (E2E) Testing**: 
   - **Playwright** is the official E2E tool for critical cross-cutting user flows.
   - E2E tests do NOT belong in `src/features/`. They must live in a root-level `/e2e/` directory since they test the application from the outside in.

## Code Examples

### 1. Test Context (Fixtures) vs Manual Setup
**Bad (Manual Boilerplate):**
```typescript
test('creates user', async () => {
  const db = await setupTestDB();
  const testUser = await insertMockUser(db);
  // ... act and assert
});
```

**Good (Vitest Fixtures):**
```typescript
// The db and testUser are automatically prepared and cleaned up by test.extend
test('creates user', async ({ db, testUser }) => {
  const result = await createUser(db, testUser.email);
  expect(result.id).toBeDefined();
});
```

### 2. UI Component Testing (RTL)
**Good (Testing Behavior/Accessibility):**
```tsx
test('submits user form', async ({ user }) => {
  render(<UserForm />);
  await user.type(screen.getByRole('textbox', { name: /email/i }), 'test@test.com');
  await user.click(screen.getByRole('button', { name: /save/i }));
  
  expect(screen.getByText(/success/i)).toBeInTheDocument();
});
```

## Commands

```bash
# Run all tests (server + client)
pnpm test

# Run server tests only (Node environment, DB)
pnpm test:server

# Run client tests only (DOM environment, UI)
pnpm test:client

# Run all tests in watch mode
pnpm test -- --watch
```

## Scripts (package.json)

```json
{
  "scripts": {
    "test": "vitest",
    "test:server": "vitest run --config vitest.server.config.ts",
    "test:client": "vitest run --config vitest.client.config.ts"
  }
}
```

## Resources

- **Templates**: 
  - [assets/vitest.config.template.ts](assets/vitest.config.template.ts) — Root config for running all tests.
  - [assets/vitest.server.config.template.ts](assets/vitest.server.config.template.ts) — Dedicated config for `pnpm test:server`.
  - [assets/vitest.client.config.template.ts](assets/vitest.client.config.template.ts) — Dedicated config for `pnpm test:client`.
- **Documentation**: See [references/vitest-fixtures.md](references/vitest-fixtures.md) for how to set up `test.extend`.

## Integration Testing with Drizzle & Postgres

For DB-specific testing patterns — shared isolated transactions, fixtures, presence assertions, and golden rules — see [project-database](../project-database/SKILL.md).
