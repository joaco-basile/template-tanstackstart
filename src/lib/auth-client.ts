import { createAuthClient } from "better-auth/react";
import { env } from "@/lib/env/client";

export const authClient = createAuthClient({
	baseURL: env.VITE_APP_URL,
});

export const { signIn, signUp, signOut, useSession, getSession } = authClient;
