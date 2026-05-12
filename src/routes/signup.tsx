import { createFileRoute, redirect } from "@tanstack/react-router";
import { getSessionFn } from "@/features/auth/auth.functions";
import { SignupPage } from "@/features/auth/components/SignupPage";

export const Route = createFileRoute("/signup")({
	beforeLoad: async () => {
		const session = await getSessionFn();
		if (session?.user) {
			throw redirect({ to: "/dashboard" });
		}
	},
	component: SignupPage,
});
