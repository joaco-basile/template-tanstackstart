import { config } from "dotenv";

config({ path: ".env.test" });

import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { test as base } from "vitest";
import type { DB } from "@/db/index.server";
import { env } from "@/lib/env/server";
import * as schema from "../db/schemas";

const pool = new pg.Pool({
	connectionString: env.DATABASE_URL,
});

const globalDb = drizzle(pool, { schema });

export const test = base.extend<{ db: DB }>({
	// biome-ignore lint/correctness/noEmptyPattern: vitest requires destructuring
	db: async ({}, use) => {
		let testError: unknown;

		await globalDb
			.transaction(async (tx) => {
				try {
					await use(tx);
				} catch (err) {
					testError = err;
				}

				throw new Error("ROLLBACK_AFTER_TEST");
			})
			.catch((err) => {
				if (testError) {
					throw testError;
				}

				if (err instanceof Error && err.message === "ROLLBACK_AFTER_TEST") {
					return;
				}

				throw err;
			});
	},
});

export {
	afterAll,
	afterEach,
	beforeAll,
	beforeEach,
	describe,
	expect,
} from "vitest";
