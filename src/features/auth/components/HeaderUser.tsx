import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { useSignOut } from "@/features/auth/auth.mutations";
import { authClient } from "@/lib/auth-client";

export function HeaderUser() {
	const { data: session, isPending } = authClient.useSession();
	const signOut = useSignOut();

	if (isPending) {
		return <div className="h-8 w-8 rounded-full bg-muted animate-pulse" />;
	}

	if (session?.user) {
		return (
			<div className="flex items-center gap-3">
				{session.user.image ? (
					<img
						src={session.user.image}
						alt=""
						className="h-8 w-8 rounded-full object-cover"
					/>
				) : (
					<div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
						<span className="text-xs font-medium text-muted-foreground">
							{session.user.name?.charAt(0).toUpperCase() || "U"}
						</span>
					</div>
				)}
				<span className="text-sm font-medium hidden sm:inline">
					{session.user.name}
				</span>
				<Button
					variant="outline"
					size="sm"
					onClick={() => signOut.mutate()}
					disabled={signOut.isPending}
				>
					{signOut.isPending ? "Saliendo..." : "Cerrar sesión"}
				</Button>
			</div>
		);
	}

	return (
		<div className="flex items-center gap-2">
			<Button variant="ghost" size="sm" asChild>
				<Link to="/login">Iniciar sesión</Link>
			</Button>
			<Button size="sm" asChild>
				<Link to="/signup">Crear cuenta</Link>
			</Button>
		</div>
	);
}
