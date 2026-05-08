import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { getSessionFn } from "@/features/auth/auth.functions";

export const Route = createFileRoute("/_authed")({
	beforeLoad: async ({ location }) => {
		const session = await getSessionFn();
		if (!session?.user) {
			throw redirect({
				to: "/login",
				search: { redirect: location.href },
			});
		}
		return { user: session.user };
	},
	component: AuthedLayout,
});

function AuthedLayout() {
	return <Outlet />;
}
