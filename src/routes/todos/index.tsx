import { createFileRoute } from "@tanstack/react-router";
import { TodoListPage } from "#/features/todos/components/TodoListPage";
import { todosQueries } from "#/features/todos/todos.queries";
import { todoFiltersSchema } from "#/features/todos/todos.schema";

export const Route = createFileRoute("/todos/")({
	validateSearch: todoFiltersSchema,
	loaderDeps: ({ search }) => search,
	loader: async ({ context: { queryClient }, deps }) => {
		// Non-blocking prefetch for deferred data
		queryClient.prefetchQuery(todosQueries.list(deps));
	},
	component: TodoListPage,
});
