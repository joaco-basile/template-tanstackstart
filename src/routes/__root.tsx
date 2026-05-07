import type { QueryClient } from "@tanstack/react-query";
import {
	createRootRouteWithContext,
	Link,
	Outlet,
} from "@tanstack/react-router";
import { HeaderUser } from "#/features/auth/components/HeaderUser";
import { ErrorPage } from "@/components/layouts/ErrorPage";
import { NotFoundPage } from "@/components/layouts/NotFoundPage";
import { RootDocument } from "@/components/layouts/RootDocument";

import appCss from "../styles.css?url";

export interface MyRouterContext {
	queryClient: QueryClient;
	user?: {
		id: string;
		name: string;
		email: string;
		image: string | null;
	};
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
	notFoundComponent: NotFoundPage,
	errorComponent: ErrorPage,
	head: () => ({
		meta: [
			{
				charSet: "utf-8",
			},
			{
				name: "viewport",
				content: "width=device-width, initial-scale=1",
			},
			{
				title: "TanStack Start Starter",
			},
		],
		links: [
			{
				rel: "stylesheet",
				href: appCss,
			},
		],
	}),
	shellComponent: RootDocument,
	component: RootLayout,
});

function RootLayout() {
	return (
		<div className="flex min-h-screen flex-col">
			<header className="border-b bg-background">
				<div className="container mx-auto flex h-14 items-center justify-between px-4">
					<div className="flex items-center gap-6">
						<Link to="/" className="font-semibold text-lg">
							Starter
						</Link>
						<nav className="hidden md:flex items-center gap-4">
							<Link
								to="/todos"
								className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
								activeProps={{ className: "text-foreground" }}
							>
								Tareas
							</Link>
							<Link
								to="/dashboard"
								className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
								activeProps={{ className: "text-foreground" }}
							>
								Dashboard
							</Link>
						</nav>
					</div>
					<HeaderUser />
				</div>
			</header>
			<main className="flex-1">
				<Outlet />
			</main>
		</div>
	);
}
