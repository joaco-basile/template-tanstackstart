import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { env } from "@/lib/env/server";
import * as schema from "./schemas";

const pool = new Pool({
	connectionString: env.DATABASE_URL,
	max: 10,
	idleTimeoutMillis: 30_000,
});

export const db = drizzle(pool, {
	schema,
	// logger: env.NODE_ENV === "development",
	logger: false,
});

type Tx = Parameters<Parameters<(typeof db)["transaction"]>[0]>[0];
export type DB = typeof db | Tx;
