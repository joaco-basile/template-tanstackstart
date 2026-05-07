# Vitest Test Fixtures (`test.extend`)

Vitest allows you to define custom test context fixtures. This entirely replaces the need to call repetitive `beforeEach` and manual boilerplate at the start of every integration test.

## How it works

Instead of importing a `test` function from `vitest`, you create your own `test` instance using `test.extend()`. This allows you to define objects, databases, users, or mocks that will be seamlessly injected into the test context and properly torn down afterward.

## Setting up DB and User Fixtures

```typescript
import { test as baseTest } from 'vitest';
import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as schema from '@/db/schema';
import { env } from '#/env'; // Use T3Env, NOT process.env directly

const pool = new pg.Pool({
  connectionString: env.DATABASE_URL,
});

const globalDb = drizzle(pool, { schema });

export const test = baseTest.extend<{ db: typeof globalDb }>({
  // Uses a shared real database with isolated transactions
  db: async ({}, use) => {
    let testError: unknown;

    await globalDb.transaction(async (tx) => {
      try {
        await use(tx as any);
      } catch (err) {
        testError = err;
      }

      // ALWAYS throw to force postgres transaction rollback
      throw new Error('ROLLBACK_AFTER_TEST');

    }).catch((err) => {
      // If there was a test failure, throw that instead of the rollback error
      if (testError) throw testError;

      // If it's just our intentional rollback, suppress it
      if (err instanceof Error && err.message === 'ROLLBACK_AFTER_TEST') return;

      // Some other unexpected error during transaction setup
      throw err;
    });
  },
});
```

## Using Fixtures in your Feature Tests

In your feature tests (e.g. `src/features/users/users.server.test.ts`), simply import this extended `test` function instead of the default one from `vitest`.

```typescript
import { expect } from 'vitest';
import { test } from '@/tests/fixtures'; // Use the extended test!
import { updateUserProfile } from './users.server';

test('updates the test user correctly', async ({ db, testUser }) => {
  // 'db' is ready to use and completely isolated.
  // 'testUser' is already stored in the 'db'.

  await updateUserProfile(db, testUser.id, { name: 'John' });
  
  const fetchedUser = await db.query.users.findFirst({ where: ... });
  expect(fetchedUser.name).toBe('John');
});
```

## Important: ESM & Environment Loading

**Do NOT** load `.env` files inside the fixture or a `setupFile`. In ESM, `import` declarations are hoisted and evaluated before any code in the module runs. If `env.ts` is imported at the top of the fixture, it will validate `process.env` before `dotenv/config` has had a chance to populate it.

**Correct approach:** Load `.env.test` at the top of `vitest.config.ts` (before `defineConfig`) or use the `envFile` option inside the project configuration.

```typescript
import { config } from 'dotenv';
config({ path: '.env.test' });

import { defineConfig } from 'vitest/config';
// ...
```
