import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { authClient } from "#/lib/auth-client";
import type { LoginInput, SignupInput } from "./auth.schema";

export function useSignIn() {
	const queryClient = useQueryClient();
	const router = useRouter();

	return useMutation({
		mutationFn: (data: LoginInput) =>
			authClient.signIn.email({
				email: data.email,
				password: data.password,
			}),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["auth", "session"] });
			router.invalidate();
		},
	});
}

export function useSignUp() {
	const queryClient = useQueryClient();
	const router = useRouter();

	return useMutation({
		mutationFn: (data: SignupInput) =>
			authClient.signUp.email({
				email: data.email,
				password: data.password,
				name: data.name,
			}),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["auth", "session"] });
			router.invalidate();
		},
	});
}

export function useSignOut() {
	const queryClient = useQueryClient();
	const router = useRouter();

	return useMutation({
		mutationFn: () => authClient.signOut(),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["auth", "session"] });
			queryClient.removeQueries({ queryKey: ["auth", "session"] });
			router.invalidate();
		},
	});
}
