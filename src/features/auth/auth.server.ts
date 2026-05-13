import { getRequest } from "@tanstack/react-start/server";
import { auth } from "@/lib/auth";
import type { AuthSession, AuthUser } from "./auth";

export async function getCurrentSession(): Promise<{
	user: AuthUser;
	session: AuthSession;
} | null> {
	const request = getRequest();
	const result = await auth.api.getSession({ headers: request.headers });
	return result as unknown as {
		user: AuthUser;
		session: AuthSession;
	} | null;
}
