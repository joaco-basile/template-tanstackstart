import { useForm } from "@tanstack/react-form";
import { useRouter, useSearch } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSignIn } from "@/features/auth/auth.mutations";
import type { LoginInput } from "@/features/auth/auth.schema";
import { loginSchema } from "@/features/auth/auth.schema";

export function LoginForm() {
	const signIn = useSignIn();
	const router = useRouter();
	const search = useSearch({ from: "/login" });
	const [rootError, setRootError] = useState<string | null>(null);

	const form = useForm({
		defaultValues: {
			email: "",
			password: "",
		},
		validators: {
			onChange: loginSchema,
		},
		onSubmit: async ({ value }) => {
			setRootError(null);
			const result = await signIn.mutateAsync(value as LoginInput);
			if (result.error) {
				setRootError(result.error.message ?? "Error al iniciar sesión");
				return;
			}
			await router.navigate({
				to: search.redirect ?? "/dashboard",
			});
		},
	});

	return (
		<form
			onSubmit={(e) => {
				e.preventDefault();
				e.stopPropagation();
				form.handleSubmit();
			}}
			className="space-y-4"
		>
			<form.Field name="email">
				{(field) => (
					<div className="space-y-2">
						<Label htmlFor={field.name}>Email</Label>
						<Input
							id={field.name}
							name={field.name}
							type="email"
							value={field.state.value}
							onBlur={field.handleBlur}
							onChange={(e) => field.handleChange(e.target.value)}
							placeholder="tu@email.com"
						/>
						{field.state.meta.errors.length > 0 && (
							<p className="text-destructive text-sm">
								{field.state.meta.errors[0]?.message}
							</p>
						)}
					</div>
				)}
			</form.Field>

			<form.Field name="password">
				{(field) => (
					<div className="space-y-2">
						<Label htmlFor={field.name}>Contraseña</Label>
						<Input
							id={field.name}
							name={field.name}
							type="password"
							value={field.state.value}
							onBlur={field.handleBlur}
							onChange={(e) => field.handleChange(e.target.value)}
							placeholder="••••••••"
						/>
						{field.state.meta.errors.length > 0 && (
							<p className="text-destructive text-sm">
								{field.state.meta.errors[0]?.message}
							</p>
						)}
					</div>
				)}
			</form.Field>

			{rootError && <p className="text-destructive text-sm">{rootError}</p>}

			<Button type="submit" className="w-full" disabled={signIn.isPending}>
				{signIn.isPending ? "Iniciando sesión..." : "Iniciar sesión"}
			</Button>
		</form>
	);
}
