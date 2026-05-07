"use client";

import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "#/components/ui/alert-dialog";
import type { Todo } from "#/features/todos/todos";
import { useDeleteTodo } from "#/features/todos/todos.mutations";

interface DeleteTodoDialogProps {
	todo: Todo | null;
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

export function DeleteTodoDialog({
	todo,
	open,
	onOpenChange,
}: DeleteTodoDialogProps) {
	const deleteTodo = useDeleteTodo();

	const handleConfirm = async () => {
		if (!todo) return;
		await deleteTodo.mutateAsync(todo.id);
		onOpenChange(false);
	};

	return (
		<AlertDialog open={open} onOpenChange={onOpenChange}>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>¿Eliminar tarea?</AlertDialogTitle>
					<AlertDialogDescription>
						Esta acción no se puede deshacer. Se eliminará permanentemente la
						tarea
						<strong> {todo?.title}</strong>.
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel>Cancelar</AlertDialogCancel>
					<AlertDialogAction
						onClick={handleConfirm}
						disabled={deleteTodo.isPending}
						className="bg-destructive text-white hover:bg-destructive/90"
					>
						{deleteTodo.isPending ? "Eliminando..." : "Eliminar"}
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
