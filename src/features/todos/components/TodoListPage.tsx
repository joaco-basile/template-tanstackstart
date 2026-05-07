"use client";

import { useQuery } from "@tanstack/react-query";
import { useSearch } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { useState } from "react";
import { Button } from "#/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "#/components/ui/dialog";
import type { Todo } from "#/features/todos/todos";
import { todosQueries } from "#/features/todos/todos.queries";
import type { TodoFiltersInput } from "#/features/todos/todos.schema";
import { CreateTodoForm } from "./CreateTodoForm";
import { DeleteTodoDialog } from "./DeleteTodoDialog";
import { EditTodoSheet } from "./EditTodoSheet";
import { TodoFilters } from "./TodoFilters";
import { TodosTable } from "./TodosTable";

export function TodoListPage() {
	const search = useSearch({ from: "/todos/" }) as TodoFiltersInput;
	const [createOpen, setCreateOpen] = useState(false);
	const [editTodo, setEditTodo] = useState<Todo | null>(null);
	const [deleteTodo, setDeleteTodo] = useState<Todo | null>(null);

	const { data: todos = [], isLoading } = useQuery(todosQueries.list(search));

	return (
		<div className="container mx-auto py-8">
			<div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<h1 className="text-2xl font-bold">Tareas</h1>
				<Dialog open={createOpen} onOpenChange={setCreateOpen}>
					<DialogTrigger asChild>
						<Button>
							<Plus className="mr-2 size-4" />
							Nueva tarea
						</Button>
					</DialogTrigger>
					<DialogContent>
						<DialogHeader>
							<DialogTitle>Crear nueva tarea</DialogTitle>
						</DialogHeader>
						<CreateTodoForm onSuccess={() => setCreateOpen(false)} />
					</DialogContent>
				</Dialog>
			</div>

			<div className="mb-6">
				<TodoFilters />
			</div>

			<div className="rounded-md border">
				<TodosTable
					todos={todos}
					isLoading={isLoading}
					onEdit={setEditTodo}
					onDelete={setDeleteTodo}
				/>
			</div>

			<EditTodoSheet
				todo={editTodo}
				open={!!editTodo}
				onOpenChange={(open) => {
					if (!open) setEditTodo(null);
				}}
			/>

			<DeleteTodoDialog
				todo={deleteTodo}
				open={!!deleteTodo}
				onOpenChange={(open) => {
					if (!open) setDeleteTodo(null);
				}}
			/>
		</div>
	);
}
