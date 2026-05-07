---
name: project-database
description: >
  Project-specific database patterns using Drizzle ORM and PostgreSQL. Covers schema management,
  migrations, query patterns, test database fixtures, and shared isolated transactions.
  Trigger when defining tables, writing queries, managing migrations, or testing DB logic.
license: Apache-2.0
metadata:
  author: gentleman-programming
  version: "1.0"
---

## When to Use

- Defining a new database table or modifying an existing schema.
- Writing Drizzle queries in a `<feature>.server.ts` file.
- Running or creating migrations.
- Setting up test fixtures that need a real database.
- Deciding whether a query belongs in `src/db/schemas/` or `src/features/<feature>/`.

## Core Principle: Schema Definition vs Data Fetching

To avoid circular dependencies between relational tables (Foreign Keys) and to keep feature folders focused on logic, we split **Schema Definition** from **Data Fetching**.

| Responsibility | Location | What goes there |
|----------------|----------|-----------------|
| **Schema Definition** | `src/db/schemas/<schema>.ts` | `pgTable`, columns, relations, indexes |
| **Data Fetching** | `src/features/<feature>/<feature>.server.ts` | Queries, inserts, updates, business logic |

**Why this pattern?** If we defined the `users` table inside `src/features/users/users.schema.server.ts`, defining relations to `posts` would require importing from `src/features/posts/`, creating massive circular dependency graphs. Centralizing schemas in `db/schemas/` solves this permanently while allowing features to retain full ownership of the *behavior*.

---

## Schema Definitions (`src/db/schemas/`)

All database tables are defined here.
- **DO NOT** put query logic (inserts, selects, updates) in these files.
- **DO** define the table structure (`pgTable`), relations, and export types like `typeof table.$inferSelect`.

**Example (`src/db/schemas/users.ts`):**
```ts
import { pgTable, serial, varchar } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { posts } from "./posts";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
});

export const usersRelations = relations(users, ({ many }) => ({
  posts: many(posts),
}));
```

There should be an `index.ts` in `src/db/schemas/` that exports all tables so the Drizzle connection instance can read them.

---

## Database Connection

The connection lives in `src/db/index.ts` and is NEVER imported by client-side code.

```ts
import { drizzle } from 'drizzle-orm/node-postgres'
import * as schema from './schema'

export const db = drizzle(process.env.DATABASE_URL!, { schema })
```

---

## Data Fetching in Features

All queries, inserts, and database manipulations belong to the specific feature that owns that domain logic.

**Example (`src/features/users/users.server.ts`):**
```ts
import { db } from "@/db/index.server";
import { users } from "@/db/schemas/users";
import { eq } from "drizzle-orm";

export async function getUserById(id: number) {
  return await db.query.users.findFirst({
    where: eq(users.id, id),
  });
}
```

---

## Migrations

Use Drizzle Kit for schema migrations. Never write raw SQL migrations unless strictly necessary.

```bash
# Generate migration files from schema changes
npm run db:generate

# Apply pending migrations
npm run db:migrate

# Push schema directly (development only — NOT for production)
npm run db:push

# Open Drizzle Studio
npm run db:studio
```

---

## Integration Testing with Drizzle & Postgres (Golden Rules)

To achieve extreme TDD speed (milliseconds) without losing the power of a real database, use the **Shared Isolated Transactions** pattern.

### 1. Fixture Architecture

Tests run against a single shared real Postgres database. The Vitest fixture (`db`) starts an SQL transaction before the test and performs an **automatic ROLLBACK** at the end. Never truncate or manually delete data.

**Example (`src/tests/fixture.server.ts`):**
```ts
import { config } from 'dotenv';
config({ path: '.env.test' });

import { test as base } from 'vitest';
import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as schema from '../db/schema';
import { env } from '#/env';

const pool = new pg.Pool({
  connectionString: env.DATABASE_URL,
});

const globalDb = drizzle(pool, { schema });

export const test = base.extend<{ db: typeof globalDb }>({
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
      if (testError) throw testError;
      if (err instanceof Error && err.message === 'ROLLBACK_AFTER_TEST') return;
      throw err;
    });
  },
});

export { expect, describe, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
```

### 2. Zero "Empty DB" Assumptions

The database is shared. Multiple tests may run in parallel or leave residual data. Never assume the table is empty.

### 3. Never Hardcode IDs

NEVER use `id: 1` or fixed strings for fields with unique constraints. Use auto-generated UUIDs or `@faker-js/faker` to prevent test collisions.

### 4. Presence Assertions

When testing queries that return collections (e.g. `getAll`), **NEVER assert the exact array size**. Always verify the presence of your created object within the collection:

```typescript
// GOOD
expect(results).toEqual(
  expect.arrayContaining([
    expect.objectContaining({ id: myData.id })
  ])
)
// BAD
expect(results).toHaveLength(1)
```

### 5. Reproducible Data

If a test MUST perform a real `commit` (outside the automatic rollback), the inserted data must have zero risk of collision with future test runs.

---

## Commands

```bash
# Generate migrations
npm run db:generate

# Apply migrations
npm run db:migrate

# Push schema (dev only)
npm run db:push

# Run server/DB tests
npm run test:server
```

## Resources

- **Testing**: See [project-testing](../project-testing/SKILL.md) for Vitest workspace setup, MSW, and UI testing.
- **Error Handling**: See [project-error-handling](../project-error-handling/SKILL.md) for how to handle DB errors in server functions.
