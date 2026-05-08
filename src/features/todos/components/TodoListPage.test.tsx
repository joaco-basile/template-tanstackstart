import { render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";
import { createTestWrapper } from "@/tests/utils";

vi.mock("@tanstack/react-router", () => ({
	useSearch: () => ({}),
	useNavigate: () => () => {},
}));

vi.mock("@/features/todos/todos.queries", () => ({
	todosQueries: {
		list: () => ({
			queryKey: ["todos", "list"],
			queryFn: () => Promise.resolve([]),
		}),
	},
}));

vi.mock("@/features/todos/todos.mutations", () => ({
	useCreateTodo: () => ({
		mutateAsync: vi.fn(),
		isPending: false,
	}),
	useUpdateTodo: () => ({
		mutateAsync: vi.fn(),
		isPending: false,
	}),
	useDeleteTodo: () => ({
		mutateAsync: vi.fn(),
		isPending: false,
	}),
}));

import { TodoListPage } from "./TodoListPage";

describe("TodoListPage", () => {
	test("renders todos page heading", () => {
		render(<TodoListPage />, { wrapper: createTestWrapper() });
		expect(screen.getByText("Tareas")).toBeInTheDocument();
	});

	test("renders create todo button", () => {
		render(<TodoListPage />, { wrapper: createTestWrapper() });
		expect(screen.getAllByText("Nueva tarea").length).toBeGreaterThanOrEqual(1);
	});
});
