import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { NotFoundError, UnauthorizedError } from "#/lib/errors";
import { authMiddleware } from "#/middleware/auth";
import {
	createTodoSchema,
	todoFiltersSchema,
	updateTodoSchema,
} from "./todos.schema";
import {
	createTodo,
	deleteTodo,
	getTodoById,
	getTodos,
	getTodosCount,
	updateTodo,
} from "./todos.server";

export const getTodosFn = createServerFn({ method: "GET" })
	.inputValidator(todoFiltersSchema)
	.handler(async ({ data }) => getTodos(data));

export const getTodoByIdFn = createServerFn({ method: "GET" })
	.inputValidator(z.string().min(1))
	.handler(async ({ data: id }) => {
		const todo = await getTodoById(id);
		if (!todo) throw new NotFoundError("Todo");
		return todo;
	});

export const createTodoFn = createServerFn({ method: "POST" })
	.middleware([authMiddleware])
	.inputValidator(createTodoSchema)
	.handler(async ({ data, context }) => {
		if (!context.user) throw new UnauthorizedError();
		return createTodo(data);
	});

export const updateTodoFn = createServerFn({ method: "POST" })
	.middleware([authMiddleware])
	.inputValidator(z.object({ id: z.string().min(1), data: updateTodoSchema }))
	.handler(async ({ data, context }) => {
		if (!context.user) throw new UnauthorizedError();
		const todo = await updateTodo(data.id, data.data);
		if (!todo) throw new NotFoundError("Todo");
		return todo;
	});

export const deleteTodoFn = createServerFn({ method: "POST" })
	.middleware([authMiddleware])
	.inputValidator(z.string().min(1))
	.handler(async ({ data: id, context }) => {
		if (!context.user) throw new UnauthorizedError();
		await deleteTodo(id);
		return { success: true };
	});

export const getTodosCountFn = createServerFn({ method: "GET" })
	.inputValidator(todoFiltersSchema)
	.handler(async ({ data }) => getTodosCount(data));
