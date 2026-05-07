---
name: project-architecture
description: >
  Estructura global del proyecto, Feature-Sliced Design (FSD), reglas de importación,
  diseño de componentes y escalado de features. Leer SIEMPRE antes de crear archivos
  o carpetas nuevas, decidir dónde vive un archivo, o diseñar una feature desde cero.
license: Apache-2.0
metadata:
  author: proyecto
  version: "2.0"
---

## Árbol de decisión — empezá acá

```
¿Dónde va este código?
│
├── ¿Es reutilizable en cualquier proyecto sin modificar?
│   └── → src/lib/  (utils puros, constantes globales)
│
├── ¿Es infraestructura de DB?
│   └── → src/db/schemas/ (definición de tabla)
│       → src/features/<feature>/<feature>.server.ts (queries)
│
├── ¿Es UI sin conocimiento del dominio? (Button, Input, Modal genérico)
│   └── → src/components/ui/
│
├── ¿Es lógica de negocio de un dominio específico?
│   └── → src/features/<feature>/  ← la respuesta casi siempre es esta
│
├── ¿Es una ruta de URL?
│   └── → src/routes/  (solo glue code, sin lógica)
│
└── ¿Es un interceptor de request cross-cutting? (auth, logging)
    └── → src/middleware/
```

---

## Estructura global

```
src/
├── components/
│   ├── ui/              # Átomos dumb (Shadcn + custom genéricos)
│   ├── layouts/         # Shell de páginas (Sidebar, Navbar, etc.)
│   └── providers/       # Contextos globales (QueryClient, Theme)
│
├── db/
│   ├── schemas/         # SOLO definición de tablas. Nunca queries aquí.
│   │   └── index.ts     # Re-exporta todo para que Drizzle lo lea
│   ├── index.server.ts  # Instancia de conexión (nunca importar en cliente)
│   └── migrations/      # Archivos SQL generados por Drizzle Kit
│
├── features/            # 👑 TODO el negocio vive aquí
│
├── lib/
│   ├── utils.ts         # cn(), formatters, helpers puros
│   ├── query-client.ts  # Configuración de TanStack Query
│   └── constants.ts     # Constantes del sistema
│
├── middleware/
│   ├── auth.ts          # Adjunta sesión al contexto de request
│   └── logging.ts       # Request logging
│
├── routes/              # Glue code solamente
│   ├── __root.tsx       # Layout raíz + providers
│   └── ...
│
└── env.ts               # T3Env — validación estricta de variables de entorno
```

**Las 3 reglas de infraestructura que nunca se rompen:**

1. `src/lib/` no tiene lógica de negocio. Si la función usa un concepto del dominio (usuario, producto, orden), no va en `lib/`.
2. `src/routes/` no tiene UI compleja ni lógica. Solo importa el Smart Component del feature y define la URL.
3. Variables de entorno siempre a través del objeto `env` importado de `@/env`.

---

## Anatomía de un feature

Cada feature es un directorio en `src/features/<nombre>/` con estos archivos:

### `<feature>.ts` — tipos client-safe

```ts
// src/features/users/users.ts
export type UserRow = {
  id: string;
  email: string;
  role: "admin" | "member";
  createdAt: Date;
};

export type UserFilters = {
  role?: UserRow["role"];
  search?: string;
};
```

### `<feature>.schema.ts` — validación Zod (client-safe)

```ts
// src/features/users/users.schema.ts
import { z } from "zod";

export const createUserSchema = z.object({
  email: z.string().email("Email inválido"),
  role: z.enum(["admin", "member"]).default("member"),
  password: z.string().min(8, "Mínimo 8 caracteres"),
});

export const updateUserSchema = createUserSchema
  .partial()
  .omit({ password: true });

export const userFiltersSchema = z.object({
  role: z.enum(["admin", "member"]).optional(),
  search: z.string().optional(),
  page: z.coerce.number().default(1),
  limit: z.coerce.number().default(20),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type UserFiltersInput = z.infer<typeof userFiltersSchema>;
```

### `<feature>.server.ts` — queries Drizzle (server-only)

```ts
// src/features/users/users.server.ts
// ⚠️ NUNCA importar este archivo desde componentes o archivos cliente

import { db } from "@/db/index.server";
import { users } from "@/db/schemas/users";
import { eq, ilike, and } from "drizzle-orm";
import type { UserRow, UserFilters } from "./users";

export async function getUsers(filters: UserFilters = {}): Promise<UserRow[]> {
  const conditions = [];

  if (filters.role) conditions.push(eq(users.role, filters.role));
  if (filters.search)
    conditions.push(ilike(users.email, `%${filters.search}%`));

  return db
    .select({
      id: users.id,
      email: users.email,
      role: users.role,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(conditions.length ? and(...conditions) : undefined);
}

export async function getUserById(id: string): Promise<UserRow | undefined> {
  return db.query.users.findFirst({ where: eq(users.id, id) });
}
```

### `<feature>.functions.ts` — RPCs con createServerFn

```ts
// src/features/users/users.functions.ts
import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/middleware/auth";
import { NotFoundError } from "@/lib/errors";
import { getUsers, getUserById } from "./users.server";
import { userFiltersSchema } from "./users.schema";

export const getUsersFn = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator(userFiltersSchema)
  .handler(async ({ data }) => {
    return getUsers(data);
  });

export const getUserByIdFn = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator((id: string) => id)
  .handler(async ({ data: id }) => {
    const user = await getUserById(id);
    if (!user) throw new NotFoundError("Usuario");
    return user;
  });
```

### `<feature>.queries.ts` — queryOptions factories

```ts
// src/features/users/users.queries.ts
import { queryOptions } from "@tanstack/react-query";
import { getUsersFn, getUserByIdFn } from "./users.functions";
import type { UserFiltersInput } from "./users.schema";

export const usersQueries = {
  all: (filters: UserFiltersInput = {}) =>
    queryOptions({
      queryKey: ["users", "list", filters],
      queryFn: () => getUsersFn({ data: filters }),
      staleTime: 60_000,
    }),

  detail: (id: string) =>
    queryOptions({
      queryKey: ["users", "detail", id],
      queryFn: () => getUserByIdFn({ data: id }),
      staleTime: 60_000,
    }),
};
```

### `<feature>.mutations.ts` — useMutation hooks

```ts
// src/features/users/users.mutations.ts
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createUserFn, deleteUserFn } from "./users.functions";

export function useCreateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateUserInput) => createUserFn({ data }),
    onSuccess: () => {
      // Invalida todas las listas de usuarios
      queryClient.invalidateQueries({ queryKey: ["users", "list"] });
    },
  });
}

export function useDeleteUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteUserFn({ data: id }),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ["users", "list"] });
      queryClient.removeQueries({ queryKey: ["users", "detail", id] });
    },
  });
}
```

### `components/` — UI del feature

Smart components que conocen el dominio. Pueden importar queries, mutations, schemas y tipos del propio feature.

---

## Reglas de importación

| Archivo         | Puede importar desde                                                                              |
| --------------- | ------------------------------------------------------------------------------------------------- |
| `components/*`  | Propio feature (queries, mutations, schemas, tipos). `src/components/ui/`. Nunca de otro feature. |
| `.ts` (tipos)   | Cualquier archivo client-safe.                                                                    |
| `.schema.ts`    | `zod`, constantes. Nunca de DB ni server.                                                         |
| `.server.ts`    | `@/db/`, `drizzle-orm`, utils server-only.                                                        |
| `.functions.ts` | `.server.ts`, `.schema.ts`, `@/middleware/`.                                                      |
| `.queries.ts`   | `.functions.ts`                                                                                   |
| `.mutations.ts` | `.functions.ts`                                                                                   |
| `src/routes/`   | `components/` del feature, `.queries.ts` para loaders.                                            |

**El error más común:** importar `.server.ts` desde un componente o desde `.queries.ts`. Vite lo va a reventar en build porque expone código Node al bundle del cliente.

---

## Escalado de un feature

### Fase 1: archivos planos (default)

```
features/users/
  users.ts
  users.schema.ts
  users.server.ts
  users.functions.ts
  users.queries.ts
  users.mutations.ts
  components/
    UserList.tsx
    CreateUserModal.tsx
```

### Fase 2: componente grande → Container/Presentational

Cuando un componente supera ~200 líneas mezclando lógica y JSX:

```
components/
  UserList.tsx       ← Container: fetching, estado, callbacks
  UserListView.tsx   ← Presentational: solo JSX y props
```

### Fase 3: co-location por componente

Cuando un componente tiene sub-componentes exclusivos suyos:

```
components/
  UserList/
    index.tsx
    UserListRow.tsx
    UserListFilters.tsx
  CreateUserModal.tsx
```

### Fase 4: split del feature

Cuando el feature tiene 20+ componentes o lógicas muy distintas:

```
features/
  user-profile/
  user-billing/
  user-permissions/
```

---

## Routes como glue code

```tsx
// src/routes/users/index.tsx
import { createFileRoute } from "@tanstack/react-router";
import { usersQueries } from "@/features/users/users.queries";
import { UserListPage } from "@/features/users/components/UserListPage";

export const Route = createFileRoute("/users/")({
  validateSearch: userFiltersSchema, // URL como fuente de verdad del estado
  loaderDeps: ({ search }) => search,
  loader: async ({ context: { queryClient }, deps }) => {
    // No await = deferred (no bloquea navegación)
    queryClient.prefetchQuery(usersQueries.all(deps));
  },
  component: UserListPage,
});
```

**Lo que NO va en un route file:**

- JSX complejo o formularios
- Lógica de negocio
- Queries directas a DB
- Estado local de UI

---

## Variables de entorno

```ts
// src/env.ts — definir AQUÍ, importar desde @/env en el resto
import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
  server: {
    DATABASE_URL: z.string().url(),
    BETTER_AUTH_SECRET: z.string().min(32),
  },
  client: {
    VITE_APP_URL: z.string().url(),
  },
  runtimeEnv: typeof process !== "undefined" ? process.env : import.meta.env,
});
```
