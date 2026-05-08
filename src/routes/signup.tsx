import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { getSessionFn } from "@/features/auth/auth.functions";
import { SignupForm } from "@/features/auth/components/SignupForm";

export const Route = createFileRoute("/signup")({
	beforeLoad: async () => {
		const session = await getSessionFn();
		if (session?.user) {
			throw redirect({ to: "/dashboard" });
		}
	},
	component: SignupPage,
});

function SignupPage() {
	return (
		<div className="flex min-h-[80vh] items-center justify-center px-4">
			<div className="w-full max-w-sm space-y-6">
				<div className="space-y-2 text-center">
					<h1 className="text-2xl font-bold">Crear cuenta</h1>
					<p className="text-muted-foreground text-sm">
						Registrate para empezar a usar la app
					</p>
				</div>
				<SignupForm />
				<p className="text-center text-sm text-muted-foreground">
					¿Ya tenés cuenta?{" "}
					<Link to="/login" className="text-primary hover:underline">
						Iniciá sesión
					</Link>
				</p>
			</div>
		</div>
	);
}
