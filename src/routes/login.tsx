import { createFileRoute, redirect } from "@tanstack/react-router";
import { z } from "zod";
import { getSessionFn } from "@/features/auth/auth.functions";
import { LoginPage } from "@/features/auth/components/LoginPage";

const loginSearchSchema = z.object({
	redirect: z.string().optional(),
});

export const Route = createFileRoute("/login")({
	validateSearch: loginSearchSchema,
	beforeLoad: async () => {
		const session = await getSessionFn();
		if (session?.user) {
			throw redirect({ to: "/dashboard" });
		}
	},
	component: LoginPage,
});
