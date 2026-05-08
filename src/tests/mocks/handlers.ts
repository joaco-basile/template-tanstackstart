import { HttpResponse, http } from "msw";

const authHandlers = [
	http.get("*/api/auth/get-session", () => {
		return HttpResponse.json({
			user: {
				id: "test-user-id",
				name: "Test User",
				email: "test@example.com",
				emailVerified: false,
				image: null,
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
			},
			session: {
				id: "test-session-id",
				expiresAt: new Date(Date.now() + 86400000).toISOString(),
				token: "test-token",
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
				ipAddress: null,
				userAgent: null,
				userId: "test-user-id",
			},
		});
	}),
];

export const handlers = [...authHandlers];
