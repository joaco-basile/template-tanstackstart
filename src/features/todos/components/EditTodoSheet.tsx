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
import {
	Sheet,
	SheetContent,
	SheetHeader,
	SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import type { Todo } from "@/features/todos/todos";
import { useUpdateTodo } from "@/features/todos/todos.mutations";
import type { UpdateTodoInput } from "@/features/todos/todos.schema";
import { updateTodoSchema } from "@/features/todos/todos.schema";

interface EditTodoSheetProps {
	todo: Todo | null;
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

export function EditTodoSheet({
	todo,
	open,
	onOpenChange,
}: EditTodoSheetProps) {
	const updateTodo = useUpdateTodo();
	const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

	const form = useForm({
		defaultValues: {
			title: todo?.title ?? "",
			description: todo?.description ?? "",
			status: todo?.status ?? "pending",
		},
		onSubmit: async ({ value }) => {
			if (!todo) return;
			setFieldErrors({});
			const result = updateTodoSchema.safeParse(value);
			if (!result.success) {
				const errors: Record<string, string> = {};
				for (const issue of result.error.issues) {
					const key = issue.path.join(".");
					errors[key] = issue.message;
				}
				setFieldErrors(errors);
				return;
			}
			await updateTodo.mutateAsync({
				id: todo.id,
				data: result.data as UpdateTodoInput,
			});
			onOpenChange(false);
		},
	});

	// Update form values when todo changes
	if (todo && open) {
		const currentTitle = form.getFieldValue("title");
		if (currentTitle !== todo.title) {
			form.setFieldValue("title", todo.title);
			form.setFieldValue("description", todo.description ?? "");
			form.setFieldValue("status", todo.status);
		}
	}

	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent className="sm:max-w-md">
				<SheetHeader>
					<SheetTitle>Editar tarea</SheetTitle>
				</SheetHeader>
				<form
					onSubmit={(e) => {
						e.preventDefault();
						e.stopPropagation();
						form.handleSubmit();
					}}
					className="space-y-4 pt-4"
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
								/>
								{fieldErrors.title && (
									<p className="text-destructive text-sm">
										{fieldErrors.title}
									</p>
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
						<Button type="submit" disabled={updateTodo.isPending}>
							{updateTodo.isPending ? "Guardando..." : "Guardar cambios"}
						</Button>
					</div>
				</form>
			</SheetContent>
		</Sheet>
	);
}
