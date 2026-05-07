import {
	flexRender,
	getCoreRowModel,
	getSortedRowModel,
	type SortingState,
	useReactTable,
} from "@tanstack/react-table";
import { Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import { Skeleton } from "#/components/ui/skeleton";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "#/components/ui/table";
import type { Todo } from "#/features/todos/todos";

interface TodosTableProps {
	todos: Todo[];
	isLoading: boolean;
	onEdit: (todo: Todo) => void;
	onDelete: (todo: Todo) => void;
}

export function TodosTable({
	todos,
	isLoading,
	onEdit,
	onDelete,
}: TodosTableProps) {
	const [sorting, setSorting] = useState<SortingState>([
		{ id: "createdAt", desc: true },
	]);

	const columns = [
		{
			accessorKey: "title",
			header: "Título",
			cell: ({ row }: { row: { getValue: (key: string) => unknown } }) => (
				<div className="font-medium">{row.getValue("title") as string}</div>
			),
		},
		{
			accessorKey: "status",
			header: "Estado",
			cell: ({ row }: { row: { getValue: (key: string) => unknown } }) => {
				const status = row.getValue("status") as Todo["status"];
				return (
					<Badge variant={status === "completed" ? "default" : "secondary"}>
						{status === "completed" ? "Completado" : "Pendiente"}
					</Badge>
				);
			},
		},
		{
			accessorKey: "createdAt",
			header: "Creado",
			cell: ({ row }: { row: { getValue: (key: string) => unknown } }) => {
				const date = row.getValue("createdAt") as Date;
				return (
					<div className="text-muted-foreground text-sm">
						{new Date(date).toLocaleDateString("es-ES")}
					</div>
				);
			},
		},
		{
			id: "actions",
			header: "",
			cell: ({ row }: { row: { original: Todo } }) => (
				<div className="flex items-center justify-end gap-2">
					<Button
						variant="ghost"
						size="icon-sm"
						onClick={() => onEdit(row.original)}
					>
						<Pencil className="size-4" />
					</Button>
					<Button
						variant="ghost"
						size="icon-sm"
						onClick={() => onDelete(row.original)}
					>
						<Trash2 className="size-4" />
					</Button>
				</div>
			),
		},
	];

	const table = useReactTable({
		data: todos,
		columns,
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
		onSortingChange: setSorting,
		state: {
			sorting,
		},
	});

	if (isLoading) {
		return (
			<div className="space-y-2">
				{Array.from({ length: 5 }).map((_, i) => (
					// biome-ignore lint/suspicious/noArrayIndexKey: static skeleton placeholders
					<Skeleton key={`skeleton-${i}`} className="h-12 w-full" />
				))}
			</div>
		);
	}

	return (
		<Table>
			<TableHeader>
				{table.getHeaderGroups().map((headerGroup) => (
					<TableRow key={headerGroup.id}>
						{headerGroup.headers.map((header) => (
							<TableHead key={header.id}>
								{header.isPlaceholder
									? null
									: flexRender(
											header.column.columnDef.header,
											header.getContext(),
										)}
							</TableHead>
						))}
					</TableRow>
				))}
			</TableHeader>
			<TableBody>
				{table.getRowModel().rows.length === 0 ? (
					<TableRow>
						<TableCell colSpan={columns.length} className="h-24 text-center">
							No hay tareas.
						</TableCell>
					</TableRow>
				) : (
					table.getRowModel().rows.map((row) => (
						<TableRow key={row.id}>
							{row.getVisibleCells().map((cell) => (
								<TableCell key={cell.id}>
									{flexRender(cell.column.columnDef.cell, cell.getContext())}
								</TableCell>
							))}
						</TableRow>
					))
				)}
			</TableBody>
		</Table>
	);
}
