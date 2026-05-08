import { useForm } from "@tanstack/react-form";
import { useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSignUp } from "@/features/auth/auth.mutations";
import type { SignupInput } from "@/features/auth/auth.schema";
import { signupSchema } from "@/features/auth/auth.schema";

export function SignupForm() {
	const signUp = useSignUp();
	const router = useRouter();
	const [rootError, setRootError] = useState<string | null>(null);

	const form = useForm({
		defaultValues: {
			name: "",
			email: "",
			password: "",
		},
		validators: {
			onChange: signupSchema,
		},
		onSubmit: async ({ value }) => {
			setRootError(null);
			console.log("Apunto de hacer singup con datos: ", value);
			const result = await signUp.mutateAsync(value as SignupInput);
			console.log(result);
			if (result.error) {
				setRootError(result.error.message ?? "Error al crear la cuenta");
				return;
			}
			await router.navigate({ to: "/dashboard" });
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
			<form.Field name="name">
				{(field) => (
					<div className="space-y-2">
						<Label htmlFor={field.name}>Nombre</Label>
						<Input
							id={field.name}
							name={field.name}
							value={field.state.value}
							onBlur={field.handleBlur}
							onChange={(e) => field.handleChange(e.target.value)}
							placeholder="Tu nombre"
						/>
						{field.state.meta.errors.length > 0 && (
							<p className="text-destructive text-sm">
								{field.state.meta.errors[0]?.message}
							</p>
						)}
					</div>
				)}
			</form.Field>

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

			<Button type="submit" className="w-full" disabled={signUp.isPending}>
				{signUp.isPending ? "Creando cuenta..." : "Crear cuenta"}
			</Button>
		</form>
	);
}
