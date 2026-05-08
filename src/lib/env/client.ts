import { createEnv } from "@t3-oss/env-core";
import z from "zod";

export const env = createEnv({
	clientPrefix: "VITE_",
	client: {
		VITE_APP_URL: z.url().default("http://localhost:300"),
		VITE_APP_TITLE: z.string().default("Template"),
	},
	extends: [],
	runtimeEnv: import.meta.env,
	emptyStringAsUndefined: true,
});
