"use client";

import { useForm } from "@tanstack/react-form";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useCreateTodo } from "@/features/todos/todos.mutations";
import type { CreateTodoInput } from "@/features/todos/todos.schema";
import { createTodoSchema } from "@/features/todos/todos.schema";

interface CreateTodoFormProps {
	onSuccess: () => void;
}

export function CreateTodoForm({ onSuccess }: CreateTodoFormProps) {
	const createTodo = useCreateTodo();
	const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

	const form = useForm({
		defaultValues: {
			title: "",
			description: "",
			status: "pending" as "pending" | "completed",
		},
		onSubmit: async ({ value }) => {
			setFieldErrors({});
			const result = createTodoSchema.safeParse(value);
			if (!result.success) {
				const errors: Record<string, string> = {};
				for (const issue of result.error.issues) {
					const key = issue.path.join(".");
					errors[key] = issue.message;
				}
				setFieldErrors(errors);
				return;
			}
			await createTodo.mutateAsync(result.data as CreateTodoInput);
			onSuccess();
			form.reset();
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
			<form.Field name="title">
				{(field) => (
					<div className="space-y-2">
						<Label htmlFor={field.name}>Título</Label>
						<Input
							id={field.name}
							name={field.name}
							value={field.state.value}
							onBlur={field.handleBlur}
							onChange={(e) => field.handleChange(e.target.value)}
							placeholder="Título de la tarea"
						/>
						{fieldErrors.title && (
							<p className="text-destructive text-sm">{fieldErrors.title}</p>
						)}
					</div>
				)}
			</form.Field>

			<form.Field name="description">
				{(field) => (
					<div className="space-y-2">
						<Label htmlFor={field.name}>Descripción</Label>
						<Textarea
							id={field.name}
							name={field.name}
							value={field.state.value}
							onBlur={field.handleBlur}
							onChange={(e) => field.handleChange(e.target.value)}
							placeholder="Descripción opcional"
							rows={3}
						/>
					</div>
				)}
			</form.Field>

			<form.Field name="status">
				{(field) => (
					<div className="space-y-2">
						<Label htmlFor={field.name}>Estado</Label>
						<Select
							value={field.state.value}
							onValueChange={(value) =>
								field.handleChange(value as "pending" | "completed")
							}
						>
							<SelectTrigger>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="pending">Pendiente</SelectItem>
								<SelectItem value="completed">Completado</SelectItem>
							</SelectContent>
						</Select>
					</div>
				)}
			</form.Field>

			<div className="flex justify-end gap-2 pt-2">
				<Button type="submit" disabled={createTodo.isPending}>
					{createTodo.isPending ? "Creando..." : "Crear tarea"}
				</Button>
			</div>
		</form>
	);
}
