import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/_authed/")({
	component: Home,
});

function Home() {
	return (
		<div className="container mx-auto px-4 py-16 max-w-2xl">
			<div className="space-y-6 text-center">
				<h1 className="text-4xl font-bold tracking-tight">
					TanStack Start Starter
				</h1>
				<p className="text-lg text-muted-foreground">
					Template full-stack con React, TanStack Query, TanStack Router,
					Drizzle ORM, Better Auth y Tailwind CSS.
				</p>
				<div className="flex flex-wrap justify-center gap-3">
					<Link
						to="/todos"
						className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90"
					>
						Ver tareas
					</Link>
					<Link
						to="/dashboard"
						className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground"
					>
						Dashboard
					</Link>
				</div>
			</div>
		</div>
	);
}
