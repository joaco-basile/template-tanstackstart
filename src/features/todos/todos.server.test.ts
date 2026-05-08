import { faker } from "@faker-js/faker";
import { describe, expect } from "vitest";
import { test as fixtureTest } from "@/tests/fixture.server";
import {
	createTodo,
	deleteTodo,
	getTodoById,
	getTodos,
	getTodosCount,
	updateTodo,
} from "./todos.server";

describe("todos.server", () => {
	fixtureTest("createTodo creates a todo", async ({ db }) => {
		const todo = await createTodo(
			{ title: faker.lorem.sentence(), status: "pending" },
			db,
		);
		expect(todo).toMatchObject({
			id: expect.any(String),
			title: expect.any(String),
			status: "pending",
		});
	});

	fixtureTest("getTodos returns todos", async ({ db }) => {
		await createTodo({ title: "First todo", status: "pending" }, db);
		await createTodo({ title: "Second todo", status: "pending" }, db);

		const todos = await getTodos({}, db);
		expect(todos.length).toBeGreaterThanOrEqual(2);
	});

	fixtureTest("getTodoById returns a todo", async ({ db }) => {
		const created = await createTodo(
			{ title: faker.lorem.sentence(), status: "pending" },
			db,
		);
		const todo = await getTodoById(created.id, db);
		expect(todo).toMatchObject({ id: created.id, title: created.title });
	});

	fixtureTest("getTodoById returns null for unknown id", async ({ db }) => {
		const todo = await getTodoById("non-existent-id", db);
		expect(todo).toBeNull();
	});

	fixtureTest("updateTodo updates a todo", async ({ db }) => {
		const created = await createTodo(
			{ title: "Original title", status: "pending" },
			db,
		);
		const updated = await updateTodo(
			created.id,
			{ title: "Updated title", status: "completed" },
			db,
		);
		expect(updated).toMatchObject({
			id: created.id,
			title: "Updated title",
			status: "completed",
		});
	});

	fixtureTest("deleteTodo removes a todo", async ({ db }) => {
		const created = await createTodo(
			{ title: "To be deleted", status: "pending" },
			db,
		);
		await deleteTodo(created.id, db);
		const todo = await getTodoById(created.id, db);
		expect(todo).toBeNull();
	});

	fixtureTest("getTodosCount returns correct count", async ({ db }) => {
		await createTodo({ title: "Todo 1", status: "pending" }, db);
		await createTodo({ title: "Todo 2", status: "completed" }, db);

		const totalCount = await getTodosCount({}, db);
		expect(totalCount).toBeGreaterThanOrEqual(2);

		const pendingCount = await getTodosCount({ status: "pending" }, db);
		expect(pendingCount).toBeGreaterThanOrEqual(1);
	});

	fixtureTest("getTodos filters by search", async ({ db }) => {
		const uniqueTitle = `search-test-${faker.string.uuid()}`;
		await createTodo({ title: uniqueTitle, status: "pending" }, db);
		await createTodo({ title: " unrelated ", status: "pending" }, db);

		const results = await getTodos({ search: uniqueTitle }, db);
		expect(results).toHaveLength(1);
		expect(results[0].title).toBe(uniqueTitle);
	});
});
