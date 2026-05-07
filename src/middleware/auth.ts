import { createMiddleware } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { auth } from "#/lib/auth";

export const authMiddleware = createMiddleware().server(async ({ next }) => {
	const request = getRequest();

	const session = await auth.api.getSession({
		headers: request.headers,
	});

	return next({
		context: {
			user: session?.user || null,
			session: session?.session || null,
		},
	});
});
