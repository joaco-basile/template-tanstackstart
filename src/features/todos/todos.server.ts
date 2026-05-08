import { and, count, desc, eq, ilike } from "drizzle-orm";
import type { DB } from "@/db/index.server";
import { db } from "@/db/index.server";
import { todos } from "@/db/schemas";
import type { TodoFilters } from "./todos";
import type { CreateTodoInput, UpdateTodoInput } from "./todos.schema";

export async function getTodos(filters: TodoFilters = {}, database: DB = db) {
	const conditions = [];

	if (filters.status) {
		conditions.push(eq(todos.status, filters.status));
	}

	if (filters.search) {
		conditions.push(ilike(todos.title, `%${filters.search}%`));
	}

	const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

	const page = filters.page ?? 1;
	const limit = filters.limit ?? 20;
	const offset = (page - 1) * limit;

	const rows = await database
		.select()
		.from(todos)
		.where(whereClause)
		.orderBy(desc(todos.createdAt))
		.limit(limit)
		.offset(offset);

	return rows;
}

export async function getTodoById(id: string, database: DB = db) {
	const rows = await database
		.select()
		.from(todos)
		.where(eq(todos.id, id))
		.limit(1);
	return rows[0] ?? null;
}

export async function createTodo(data: CreateTodoInput, database: DB = db) {
	const rows = await database.insert(todos).values(data).returning();
	return rows[0];
}

export async function updateTodo(
	id: string,
	data: UpdateTodoInput,
	database: DB = db,
) {
	const rows = await database
		.update(todos)
		.set({ ...data, updatedAt: new Date() })
		.where(eq(todos.id, id))
		.returning();
	return rows[0] ?? null;
}

export async function deleteTodo(id: string, database: DB = db) {
	await database.delete(todos).where(eq(todos.id, id));
}

export async function getTodosCount(
	filters: TodoFilters = {},
	database: DB = db,
) {
	const conditions = [];

	if (filters.status) {
		conditions.push(eq(todos.status, filters.status));
	}

	if (filters.search) {
		conditions.push(ilike(todos.title, `%${filters.search}%`));
	}

	const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

	const result = await database
		.select({ count: count() })
		.from(todos)
		.where(whereClause);

	return result[0]?.count ?? 0;
}
