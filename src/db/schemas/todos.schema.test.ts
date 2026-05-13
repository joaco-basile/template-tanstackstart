import { faker } from "@faker-js/faker";
import { eq } from "drizzle-orm";
import { expect, test } from "../../tests/fixture.server";
import { todos } from "./schemas";

test("creates a todo within an isolated transaction", async ({ db }) => {
	const fakeTitle = faker.lorem.sentence();

	// Act: Insert the data
	const [newTodo] = await db
		.insert(todos)
		.values({ title: fakeTitle })
		.returning();

	// Assert: Verify it was created
	expect(newTodo.id).toBeDefined();
	expect(newTodo.title).toBe(fakeTitle);

	// Assert: Verify it can be retrieved from within the same transaction
	const results = await db
		.select()
		.from(todos)
		.where(eq(todos.title, fakeTitle));

	// Use presence assertions (arrayContaining) as per Golden Rules
	expect(results).toEqual(
		expect.arrayContaining([
			expect.objectContaining({
				title: fakeTitle,
			}),
		]),
	);
});
