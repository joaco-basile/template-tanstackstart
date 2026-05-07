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
        // Capture the actual test failure error
        testError = err;
      }
      
      // ALWAYS throw to force postgres transaction rollback
      throw new Error('ROLLBACK_AFTER_TEST');
      
    }).catch((err) => {
      // If there was a test failure, throw that instead of the rollback error
      if (testError) {
        throw testError;
      }
      
      // If it's just our intentional rollback, we suppress it
      if (err instanceof Error && err.message === 'ROLLBACK_AFTER_TEST') {
        return;
      }
      
      // Some other unexpected error during transaction setup
      throw err;
    });
  },
});

export { expect, describe, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
