import { RootDocument } from "./RootDocument";

export function ErrorPage({ error }: { error: unknown }) {
	return (
		<RootDocument>
			<div className="flex min-h-screen items-center justify-center">
				<div className="text-center">
					<h1 className="text-3xl font-bold">Algo salió mal</h1>
					<button
						type="button"
						onClick={() => window.location.reload()}
						className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-md"
					>
						Recargar página
					</button>
					{process.env.NODE_ENV === "development" && (
						<pre className="mt-4 text-left p-4 bg-muted rounded-md overflow-auto max-w-2xl text-sm">
							{error instanceof Error ? error.message : "Error desconocido"}
						</pre>
					)}
				</div>
			</div>
		</RootDocument>
	);
}
