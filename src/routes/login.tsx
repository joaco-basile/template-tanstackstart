import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { z } from "zod";
import { getSessionFn } from "@/features/auth/auth.functions";
import { LoginForm } from "@/features/auth/components/LoginForm";

const loginSearchSchema = z.object({
	redirect: z.string().optional(),
});

export const Route = createFileRoute("/login")({
	validateSearch: loginSearchSchema,
	beforeLoad: async () => {
		const session = await getSessionFn();
		if (session?.user) {
			throw redirect({ to: "/dashboard" });
		}
	},
	component: LoginPage,
});

function LoginPage() {
	return (
		<div className="flex min-h-[80vh] items-center justify-center px-4">
			<div className="w-full max-w-sm space-y-6">
				<div className="space-y-2 text-center">
					<h1 className="text-2xl font-bold">Iniciar sesión</h1>
					<p className="text-muted-foreground text-sm">
						Ingresá tus credenciales para continuar
					</p>
				</div>
				<LoginForm />
				<p className="text-center text-sm text-muted-foreground">
					¿No tenés cuenta?{" "}
					<Link to="/signup" className="text-primary hover:underline">
						Creá una
					</Link>
				</p>
			</div>
		</div>
	);
}
