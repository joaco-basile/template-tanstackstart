export type Todo = {
	id: string;
	title: string;
	description: string | null;
	status: "pending" | "completed";
	createdAt: Date;
	updatedAt: Date;
};

export type TodoFilters = {
	status?: Todo["status"];
	search?: string;
	page?: number;
	limit?: number;
};
