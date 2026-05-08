import { QueryClient } from "@tanstack/react-query";
import { AppError } from "@/lib/errors";

export function createQueryClient() {
	return new QueryClient({
		defaultOptions: {
			queries: {
				// No reintentar errores 4xx — son definitivos
				retry: (failureCount, error) => {
					if (error instanceof AppError) {
						if (error.status >= 400 && error.status < 500) return false;
					}
					return failureCount < 2; // hasta 2 reintentos para errores de red/5xx
				},
				staleTime: 60_000, // 1 minuto por defecto
				gcTime: 5 * 60_000, // 5 minutos en caché
				refetchOnWindowFocus: false, // opcional según UX deseada
			},
			mutations: {
				retry: false, // las mutations nunca se reintentan automáticamente
			},
		},
	});
}
