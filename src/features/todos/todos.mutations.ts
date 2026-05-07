import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createTodoFn, deleteTodoFn, updateTodoFn } from "./todos.functions";
import type { CreateTodoInput, UpdateTodoInput } from "./todos.schema";

export function useCreateTodo() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (data: CreateTodoInput) => createTodoFn({ data }),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["todos", "list"] });
			queryClient.invalidateQueries({ queryKey: ["todos", "count"] });
		},
	});
}

export function useUpdateTodo() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: ({ id, data }: { id: string; data: UpdateTodoInput }) =>
			updateTodoFn({ data: { id, data } }),
		onSuccess: (updated: { id: string }) => {
			queryClient.setQueryData(["todos", "detail", updated.id], updated);
			queryClient.invalidateQueries({ queryKey: ["todos", "list"] });
			queryClient.invalidateQueries({ queryKey: ["todos", "count"] });
		},
	});
}

export function useDeleteTodo() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (id: string) => deleteTodoFn({ data: id }),
		onSuccess: (_, id) => {
			queryClient.removeQueries({ queryKey: ["todos", "detail", id] });
			queryClient.invalidateQueries({ queryKey: ["todos", "list"] });
			queryClient.invalidateQueries({ queryKey: ["todos", "count"] });
		},
	});
}
