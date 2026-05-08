import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { tanstackStartCookies } from "better-auth/tanstack-start";
import { db } from "@/db/index.server";
import * as schema from "@/db/schemas";
import { env as clientEnv } from "@/lib/env/client";
import { env as serverEnv } from "@/lib/env/server";

export const auth = betterAuth({
	baseURL: serverEnv.BASE_URL,
	database: drizzleAdapter(db, {
		provider: "pg",
		schema: {
			user: schema.user,
			session: schema.session,
			account: schema.account,
			verification: schema.verification,
		},
	}),
	emailAndPassword: {
		enabled: true,
	},
	plugins: [tanstackStartCookies()],
	trustedOrigins: [clientEnv.VITE_APP_URL],
});

export type Session = typeof auth.$Infer.Session;
export type User = typeof auth.$Infer.Session.user;
