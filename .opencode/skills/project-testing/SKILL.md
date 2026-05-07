---
name: project-testing
description: >
  Estrategia de testing con Vitest, React Testing Library, y MSW. Cubre configuración
  de workspaces para entornos Node y DOM, TDD, fixtures de test, mocking de red con MSW,
  y contratos de calidad. Leer cuando escribas, planifiques, o configures cualquier test.
license: Apache-2.0
metadata:
  author: proyecto
  version: "2.0"
---

## Árbol de decisión — empezá acá

```
¿Qué necesitás testear?
│
├── ¿Función en .server.ts o .functions.ts (lógica de DB, server function)?
│   └── → test de servidor (.server.test.ts)
│       → Entorno Node, usa fixture `db` de src/tests/fixture.server.ts
│       → Ver sección "Tests de servidor"
│
├── ¿Componente React, hook, o lógica de UI?
│   └── → test de cliente (.test.tsx)
│       → Entorno DOM (happy-dom), usa RTL + MSW
│       → Ver sección "Tests de cliente"
│
├── ¿Flujo completo de usuario a través de múltiples páginas?
│   └── → test E2E con Playwright en /e2e/
│       → Ver sección "Tests E2E"
│
└── ¿Schema Zod o tipo TypeScript?
    └── → test de esquema (.schema.test.ts) en entorno servidor
        → Ver sección "Tests de schemas"
```

---

## Configuración de workspaces

### Regla crítica sobre T3Env y ESM

En ESM, los `import` son hoisted y evaluados **antes** de cualquier código del módulo. Si `env.ts` se importa antes de que dotenv cargue el `.env.test`, Zod lanzará un error de validación. La solución: cargar el `.env.test` **en el archivo de config de Vitest**, no en el setup file.

```ts
// vitest.server.config.ts
import { config } from "dotenv";
config({ path: ".env.test" }); // ← ANTES del defineConfig

import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    name: "server",
    environment: "node",
    include: [
      "src/**/*.server.test.ts",
      "src/**/*.schema.test.ts",
      "src/lib/**/*.test.ts",
    ],
    // NO incluir setupFiles que importen env — ya está cargado
  },
});
```

```ts
// vitest.client.config.ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  test: {
    name: "client",
    environment: "happy-dom",
    include: ["src/**/*.test.tsx", "src/**/*.test.ts"],
    exclude: ["src/**/*.server.test.ts", "src/**/*.schema.test.ts"],
    setupFiles: ["src/tests/setup.client.ts"],
    globals: true,
  },
});
```

```ts
// vitest.config.ts — para correr todos juntos con `npm run test`
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    projects: ["vitest.server.config.ts", "vitest.client.config.ts"],
  },
});
```

**Por qué configs separadas en vez de `test.projects` inline:** Vitest 4+ con `--project` flag no funciona con `test.projects` inline. Configs separadas permiten correr `npm run test:server` y `npm run test:client` de forma independiente con la misma configuración usada en CI.

---

## Tests de servidor

### Reglas absolutas

1. **Nunca mockear Drizzle o la DB.** Usar la DB real con transacciones aisladas.
2. **Testear la interfaz pública** del `.server.ts`, no las queries SQL internas.
3. **Usar el fixture `db`** de `src/tests/fixture.server.ts` — ver `project-database` para la implementación completa.
4. **Nunca asumir tabla vacía.** Siempre verificar presencia, no longitud exacta.

### Ejemplo: test de CRUD completo

```ts
// src/features/posts/posts.server.test.ts
import { describe } from "vitest";
import { test, expect } from "@/tests/fixture.server";
import { faker } from "@faker-js/faker";
import { getPosts, createPost, updatePost, deletePost } from "./posts.server";

describe("posts.server", () => {
  describe("createPost", () => {
    test("crea un post y lo retorna", async ({ db, testUser }) => {
      const input = {
        title: faker.lorem.sentence(),
        content: faker.lorem.paragraphs(2),
        authorId: testUser.id,
      };

      const post = await createPost(input, db);

      expect(post).toMatchObject({
        id: expect.any(String),
        title: input.title,
        authorId: testUser.id,
        published: false, // default
      });
    });
  });

  describe("getPosts", () => {
    test("retorna posts del autor", async ({ db, testUser, testPost }) => {
      const result = await getPosts({ authorId: testUser.id }, db);

      expect(result).toEqual(
        expect.arrayContaining([expect.objectContaining({ id: testPost.id })]),
      );
    });

    test("filtra por búsqueda en título", async ({ db, testUser }) => {
      const uniqueTitle = `post-${faker.string.uuid()}`;
      const [created] = await db
        .insert(posts)
        .values({
          title: uniqueTitle,
          authorId: testUser.id,
        })
        .returning();

      const result = await getPosts({ search: uniqueTitle }, db);

      expect(result).toEqual(
        expect.arrayContaining([expect.objectContaining({ id: created.id })]),
      );
    });
  });

  describe("deletePost", () => {
    test("elimina el post", async ({ db, testPost }) => {
      await deletePost(testPost.id, db);

      const result = await getPosts({ authorId: testPost.authorId }, db);
      expect(result).not.toEqual(
        expect.arrayContaining([expect.objectContaining({ id: testPost.id })]),
      );
    });
  });
});
```

### Ejemplo: test de server function con auth

```ts
// src/features/posts/posts.functions.server.test.ts
import { describe, vi, beforeEach } from "vitest";
import { test, expect } from "@/tests/fixture.server";
import {
  mockAuthenticatedUser,
  mockUnauthenticated,
} from "@/tests/helpers/auth";
import { createPostFn, deletePostFn } from "./posts.functions";

describe("createPostFn", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  test("lanza UnauthorizedError sin sesión", async () => {
    mockUnauthenticated();

    await expect(
      createPostFn({ data: { title: "Test", content: "Content" } }),
    ).rejects.toMatchObject({ code: "UNAUTHORIZED", status: 401 });
  });

  test("crea el post con usuario autenticado", async ({ testUser }) => {
    mockAuthenticatedUser({ id: testUser.id });

    const post = await createPostFn({
      data: { title: "Mi post", content: "Contenido del post" },
    });

    expect(post).toMatchObject({
      title: "Mi post",
      authorId: testUser.id,
    });
  });
});
```

---

## Tests de cliente

### Setup (`src/tests/setup.client.ts`)

```ts
import "@testing-library/jest-dom";
import { cleanup } from "@testing-library/react";
import { afterEach, beforeAll, afterAll } from "vitest";
import { server } from "./mocks/server";

// MSW: intercepta requests HTTP a nivel de red
beforeAll(() => server.listen({ onUnhandledRequest: "warn" }));
afterEach(() => {
  cleanup(); // limpiar componentes montados
  server.resetHandlers(); // resetear handlers custom por test
});
afterAll(() => server.close());
```

### MSW: mocking de red

```ts
// src/tests/mocks/server.ts
import { setupServer } from "msw/node";
import { handlers } from "./handlers";

export const server = setupServer(...handlers);
```

```ts
// src/features/posts/mocks/handlers.ts
// Co-locar los handlers con el feature que mockean
import { http, HttpResponse } from "msw";

export const postHandlers = [
  http.get("/api/posts", () => {
    return HttpResponse.json([
      { id: "1", title: "Post de prueba", published: true },
    ]);
  }),
  http.post("/api/posts", async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({ id: "2", ...body }, { status: 201 });
  }),
];
```

```ts
// src/tests/mocks/handlers.ts — agregar todos los feature handlers acá
import { postHandlers } from "@/features/posts/mocks/handlers";
import { userHandlers } from "@/features/users/mocks/handlers";

export const handlers = [...postHandlers, ...userHandlers];
```

### Ejemplo: test de componente

```tsx
// src/features/posts/components/PostList.test.tsx
import { describe, test, expect } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { server } from "@/tests/mocks/server";
import { http, HttpResponse } from "msw";
import { createTestWrapper } from "@/tests/utils";
import { PostList } from "./PostList";

// Helper que envuelve con QueryClientProvider, RouterProvider, etc.
const wrapper = createTestWrapper();

describe("PostList", () => {
  test("muestra los posts cargados", async () => {
    render(<PostList />, { wrapper });

    // Esperar el loading inicial
    expect(screen.getByRole("status")).toBeInTheDocument(); // skeleton o spinner

    // Esperar los datos
    await waitFor(() => {
      expect(screen.getByText("Post de prueba")).toBeInTheDocument();
    });
  });

  test("muestra error si la API falla", async () => {
    // Override del handler para este test específico
    server.use(http.get("/api/posts", () => HttpResponse.error()));

    render(<PostList />, { wrapper });

    await waitFor(() => {
      expect(screen.getByText(/error/i)).toBeInTheDocument();
    });
  });

  test("llama a la API con filtros al buscar", async () => {
    const user = userEvent.setup();
    let capturedUrl = "";

    server.use(
      http.get("/api/posts", ({ request }) => {
        capturedUrl = request.url;
        return HttpResponse.json([]);
      }),
    );

    render(<PostList />, { wrapper });

    const searchInput = screen.getByRole("textbox", { name: /buscar/i });
    await user.type(searchInput, "typescript");

    await waitFor(() => {
      expect(capturedUrl).toContain("search=typescript");
    });
  });
});
```

### Wrapper de test (`src/tests/utils.tsx`)

```tsx
// src/tests/utils.tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  createMemoryHistory,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router";
import type { ReactNode } from "react";

export function createTestWrapper() {
  return function Wrapper({ children }: { children: ReactNode }) {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: 0 },
        mutations: { retry: false },
      },
    });

    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
}
```

---

## Tests de schemas

```ts
// src/features/posts/posts.schema.test.ts
import { describe, test, expect } from "vitest";
import { createPostSchema } from "./posts.schema";

describe("createPostSchema", () => {
  test("acepta datos válidos", () => {
    const result = createPostSchema.safeParse({
      title: "Mi post",
      content: "Contenido largo suficiente",
    });
    expect(result.success).toBe(true);
  });

  test("rechaza título vacío", () => {
    const result = createPostSchema.safeParse({ title: "", content: "ok" });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].path).toContain("title");
  });
});
```

---

## Tests E2E con Playwright

Los tests E2E viven en `/e2e/` (raíz del proyecto, NO dentro de `src/`). Testean flujos críticos de usuario de punta a punta.

```ts
// e2e/auth.spec.ts
import { test, expect } from "@playwright/test";

test("usuario puede hacer login y ver el dashboard", async ({ page }) => {
  await page.goto("/login");

  await page.getByLabel("Email").fill("test@example.com");
  await page.getByLabel("Contraseña").fill("password123");
  await page.getByRole("button", { name: "Iniciar sesión" }).click();

  await expect(page).toHaveURL("/dashboard");
  await expect(page.getByText("Bienvenido")).toBeVisible();
});
```

---

## Principios de calidad (no negociables)

| Principio                    | Regla                                                                                                                   |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| **Co-location**              | El test vive al lado del archivo que testea. Nunca en una carpeta `__tests__` global.                                   |
| **TDD vertical**             | Un test que falla → código mínimo que lo pasa → refactor → repetir. No escribir todos los tests y luego todo el código. |
| **Zero mocks internos**      | Mockear solo los boundaries de red (MSW) o de terceros. Nunca mockear React Query, Drizzle, o código propio.            |
| **Sin hardcoding de IDs**    | Usar `faker` para cualquier dato único. `id: 1` causa colisiones en DB compartida.                                      |
| **Presencia, no longitud**   | `expect(result).toEqual(expect.arrayContaining([...]))`, nunca `expect(result).toHaveLength(1)`.                        |
| **Tests como documentación** | El nombre del test describe el comportamiento, no la implementación. "crea el post" > "llama a db.insert".              |
