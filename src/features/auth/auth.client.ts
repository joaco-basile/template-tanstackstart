import { authClient } from "@/lib/auth-client";
import type { AuthSession, AuthUser } from "./auth";

export async function getCurrentSession(): Promise<{
	user: AuthUser;
	session: AuthSession;
} | null> {
	const result = await authClient.getSession();
	return result as unknown as {
		user: AuthUser;
		session: AuthSession;
	} | null;
}
