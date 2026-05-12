import { Link } from "@tanstack/react-router";

export function DashboardPage() {
	return (
		<div className="p-8 space-y-6">
			<div>
				<h1 className="text-3xl font-bold">Dashboard</h1>
				<p className="text-muted-foreground">
					Bienvenido a tu panel de control
				</p>
			</div>

			<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
				<div className="rounded-lg border p-6 space-y-2">
					<h2 className="text-lg font-semibold">Tareas</h2>
					<p className="text-muted-foreground text-sm">
						Gestioná tus tareas pendientes y completadas.
					</p>
					<Link
						to="/todos"
						className="inline-flex items-center text-sm font-medium text-primary hover:underline"
					>
						Ver tareas →
					</Link>
				</div>
			</div>
		</div>
	);
}
