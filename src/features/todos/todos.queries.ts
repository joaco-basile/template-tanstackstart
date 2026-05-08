import { queryOptions } from "@tanstack/react-query";
import type { TodoFilters } from "./todos";
import { getTodoByIdFn, getTodosCountFn, getTodosFn } from "./todos.functions";

export const todosQueries = {
	list: (filters: TodoFilters = {}) =>
		queryOptions({
			queryKey: ["todos", "list", filters],
			queryFn: () => getTodosFn({ data: filters }),
			staleTime: 60_000,
			placeholderData: (prev) => prev,
		}),
	detail: (id: string) =>
		queryOptions({
			queryKey: ["todos", "detail", id],
			queryFn: () => getTodoByIdFn({ data: id }),
			staleTime: 5 * 60_000,
			enabled: !!id,
		}),
	count: (filters: TodoFilters = {}) =>
		queryOptions({
			queryKey: ["todos", "count", filters],
			queryFn: () => getTodosCountFn({ data: filters }),
			staleTime: 60_000,
		}),
};
