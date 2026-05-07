import { useNavigate, useSearch } from "@tanstack/react-router";
import type { z } from "zod";
import { Input } from "#/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "#/components/ui/select";
import type { todoFiltersSchema } from "#/features/todos/todos.schema";

type Filters = z.infer<typeof todoFiltersSchema>;

export function TodoFilters() {
	const search = useSearch({ from: "/todos/" }) as Filters;
	const navigate = useNavigate({ from: "/todos/" });

	const updateFilter = <K extends keyof Filters>(
		key: K,
		value: Filters[K] | undefined,
	) => {
		navigate({
			search: (prev) => ({
				...prev,
				[key]: value,
				page: 1,
			}),
		});
	};

	return (
		<div className="flex flex-col gap-4 sm:flex-row sm:items-center">
			<Input
				placeholder="Buscar tareas..."
				value={search.search ?? ""}
				onChange={(e) => updateFilter("search", e.target.value || undefined)}
				className="sm:w-64"
			/>
			<Select
				value={search.status ?? "all"}
				onValueChange={(value) =>
					updateFilter(
						"status",
						value === "all" ? undefined : (value as Filters["status"]),
					)
				}
			>
				<SelectTrigger className="sm:w-40">
					<SelectValue placeholder="Estado" />
				</SelectTrigger>
				<SelectContent>
					<SelectItem value="all">Todos</SelectItem>
					<SelectItem value="pending">Pendiente</SelectItem>
					<SelectItem value="completed">Completado</SelectItem>
				</SelectContent>
			</Select>
		</div>
	);
}
