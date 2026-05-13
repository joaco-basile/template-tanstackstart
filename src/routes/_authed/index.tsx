import { createFileRoute } from "@tanstack/react-router";
import { HomePage } from "@/features/home/components/HomePage";

export const Route = createFileRoute("/_authed/")({
	component: HomePage,
});
