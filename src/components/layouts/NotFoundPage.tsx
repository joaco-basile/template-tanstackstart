import { Link } from "@tanstack/react-router";

import { Button } from "@/components/ui/button";
import { RootDocument } from "./RootDocument";

export function NotFoundPage() {
	return (
		<RootDocument>
			<div className="flex min-h-screen flex-col items-center justify-center gap-4 text-center">
				<h1 className="text-6xl font-bold">404</h1>
				<p className="text-xl text-muted-foreground">
					La página que buscás no existe o fue movida.
				</p>
				<Button asChild className="mt-4">
					<Link to="/">Volver al inicio</Link>
				</Button>
			</div>
		</RootDocument>
	);
}
