import { getRequest } from "@tanstack/react-start/server";
import { auth } from "@/lib/auth";
import { authClient } from "@/lib/auth-client";
import type { AuthSession, AuthUser } from "./auth";

export async function getCurrentSession(): Promise<{
	user: AuthUser;
	session: AuthSession;
} | null> {
	if (typeof document !== "undefined") {
		const result = await authClient.getSession();
		return result as unknown as {
			user: AuthUser;
			session: AuthSession;
		} | null;
	}

	const request = getRequest();
	const result = await auth.api.getSession({ headers: request.headers });
	return result as unknown as {
		user: AuthUser;
		session: AuthSession;
	} | null;
}
