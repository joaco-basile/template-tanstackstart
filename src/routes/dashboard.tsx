import { createFileRoute, redirect } from "@tanstack/react-router";
import { HeaderUser } from "#/features/auth/components/HeaderUser";
import { getSessionFn } from "#/features/auth/auth.functions";

export const Route = createFileRoute("/dashboard")({
	beforeLoad: async () => {
		const session = await getSessionFn();
		if (!session?.user) {
			throw redirect({ to: "/login" });
		}
		return { user: session.user };
	},
	component: DashboardPage,
});

function DashboardPage() {
	return (
		<div className="p-8 space-y-6">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-3xl font-bold">Dashboard</h1>
					<p className="text-muted-foreground">
						Bienvenido a tu panel de control
					</p>
				</div>
				<HeaderUser />
			</div>

			<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
				<div className="rounded-lg border p-6 space-y-2">
					<h2 className="text-lg font-semibold">Tareas</h2>
					<p className="text-muted-foreground text-sm">
						Gestioná tus tareas pendientes y completadas.
					</p>
					<a
						href="/todos"
						className="inline-flex items-center text-sm font-medium text-primary hover:underline"
					>
						Ver tareas →
					</a>
				</div>
			</div>
		</div>
	);
}
