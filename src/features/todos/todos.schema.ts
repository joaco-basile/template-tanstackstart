import { z } from "zod";

export const createTodoSchema = z.object({
	title: z.string().min(1, "El título es obligatorio").max(200),
	description: z.string().max(2000).optional(),
	status: z.enum(["pending", "completed"]).default("pending"),
});

export const updateTodoSchema = createTodoSchema.partial();

export const todoFiltersSchema = z.object({
	status: z.enum(["pending", "completed"]).optional(),
	search: z.string().optional(),
	page: z.coerce.number().default(1),
	limit: z.coerce.number().default(20),
});

export type CreateTodoInput = z.infer<typeof createTodoSchema>;
export type UpdateTodoInput = z.infer<typeof updateTodoSchema>;
export type TodoFiltersInput = z.infer<typeof todoFiltersSchema>;
