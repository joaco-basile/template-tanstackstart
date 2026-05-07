---
name: project-auth
description: >
  Autenticación con Better Auth. Cubre setup del servidor y cliente, protección de rutas
  con beforeLoad, verificación en server functions, middleware, manejo de sesiones expiradas,
  y cómo testear auth. Leer cuando implementes login, logout, sign-up, rutas protegidas,
  o cualquier verificación de identidad.
license: Apache-2.0
metadata:
  author: proyecto
  version: "2.0"
---

## Árbol de decisión — empezá acá

```
¿Qué necesitás hacer?
│
├── ¿Proteger una ruta de URL?
│   └── → beforeLoad en el route file (ver sección "Protección de rutas")
│
├── ¿Verificar identidad dentro de una server function?
│   └── → auth.api.getSession() en el handler (ver sección "Server Functions")
│
├── ¿Leer la sesión en un componente React?
│   └── → authClient.useSession() (ver sección "Cliente")
│
├── ¿Adjuntar el usuario a múltiples rutas sin repetir?
│   └── → authMiddleware (ver sección "Middleware")
│
└── ¿Manejar sesión expirada o token inválido?
    └── → UnauthorizedError + redirect (ver sección "Sesiones expiradas")
```

---

## Principio fundamental

**Auth en el boundary, lo más temprano posible:**

1. **Route level** (`beforeLoad`) — bloquea antes de renderizar. Costo mínimo.
2. **Middleware** — para adjuntar contexto cross-cutting, no para gatear acceso.
3. **Server Function** — última línea de defensa. Siempre verificar en operaciones sensibles.

Nunca confiar solo en checks del cliente. El cliente puede ser bypasseado.

---

## Setup

### Servidor (`src/lib/auth.ts`)

```ts
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { tanstackStartCookies } from "better-auth/tanstack-start";
import { db } from "@/db/index.server";
import * as schema from "@/db/schemas";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: schema.users,
      session: schema.sessions,
      account: schema.accounts,
      verification: schema.verifications,
    },
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false, // cambiar a true en producción
  },
  plugins: [tanstackStartCookies()],
  trustedOrigins: [env.VITE_APP_URL],
});

// Tipos derivados del servidor para usar en todo el proyecto
export type Session = typeof auth.$Infer.Session;
export type User = typeof auth.$Infer.Session.user;
```

### Ruta catch-all para Better Auth (`src/routes/api/auth/$.ts`)

```ts
import { createFileRoute } from "@tanstack/react-router";
import { auth } from "@/lib/auth";

export const Route = createFileRoute("/api/auth/$")({
  server: {
    handlers: {
      GET: ({ request }) => auth.handler(request),
      POST: ({ request }) => auth.handler(request),
    },
  },
});
```

### Cliente (`src/lib/auth-client.ts`)

```ts
import { createAuthClient } from "better-auth/react";
import { env } from "@/env";

export const authClient = createAuthClient({
  baseURL: env.VITE_APP_URL,
});

// Re-exportar para facilitar imports
export const { signIn, signUp, signOut, useSession, getSession } = authClient;
```

---

## Middleware (`src/middleware/auth.ts`)

El middleware **adjunta** el usuario al contexto. No redirige ni bloquea — eso es responsabilidad de `beforeLoad`.

```ts
import { createMiddleware } from "@tanstack/react-start";
import { auth } from "@/lib/auth";
import type { User } from "@/lib/auth";

export const authMiddleware = createMiddleware().server(
  async ({ request, next }) => {
    const session = await auth.api.getSession({ headers: request.headers });

    return next({
      context: {
        user: session?.user ?? null,
        session: session?.session ?? null,
      },
    });
  },
);
```

Registrar en `src/middleware/index.ts` y adjuntar al router.

---

## Protección de rutas

### Ruta que requiere autenticación

```ts
// src/routes/dashboard/index.tsx
import { createFileRoute, redirect } from "@tanstack/react-router";
import { getSession } from "@/lib/auth-client";

export const Route = createFileRoute("/dashboard/")({
  beforeLoad: async ({ context }) => {
    // Usar el contexto del middleware si está disponible
    const user = context.user;

    if (!user) {
      throw redirect({ to: "/login", search: { redirect: location.href } });
    }

    // Lo que retornás se vuelve parte del context tipado para loaders y componentes
    return { user };
  },
  loader: async ({ context }) => {
    // context.user está tipado gracias al return de beforeLoad
    console.log("Usuario autenticado:", context.user.email);
  },
  component: DashboardPage,
});
```

### Ruta que requiere un rol específico

```ts
import { UnauthorizedError } from "@/lib/errors";

beforeLoad: async ({ context }) => {
  if (!context.user) throw redirect({ to: "/login" });
  if (context.user.role !== "admin")
    throw new UnauthorizedError("Solo administradores");
  return { user: context.user };
};
```

### Ruta que redirige si YA está autenticado (login, sign-up)

```ts
beforeLoad: async ({ context }) => {
  if (context.user) {
    throw redirect({ to: "/dashboard" });
  }
};
```

---

## Server Functions

Siempre verificar sesión en server functions que mutan datos o retornan datos sensibles:

```ts
// src/features/users/users.functions.ts
import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/middleware/auth";
import { UnauthorizedError } from "@/lib/errors";

export const deleteAccountFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware]) // ← adjunta context.user
  .handler(async ({ context }) => {
    // El middleware garantiza que context.user existe O es null
    if (!context.user) throw new UnauthorizedError();

    await deleteUser(context.user.id);
  });
```

**Cuándo verificar manualmente vs confiar en el middleware:**

- Si la server function usa `authMiddleware` → el contexto ya tiene `user`. Verificar que no es `null`.
- Si la server function NO usa `authMiddleware` → llamar a `auth.api.getSession()` manualmente.

```ts
// Sin middleware — verificación manual
export const sensitiveFn = createServerFn({ method: "POST" }).handler(
  async ({ request }) => {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) throw new UnauthorizedError();
    // ...
  },
);
```

---

## Flujos de autenticación en el cliente

### Sign-in con email/password

```tsx
// src/features/auth/components/LoginForm.tsx
import { signIn } from "@/lib/auth-client";
import { useRouter } from "@tanstack/react-router";

export function LoginForm() {
  const router = useRouter();

  async function handleSubmit(data: LoginInput) {
    const result = await signIn.email({
      email: data.email,
      password: data.password,
    });

    if (result.error) {
      // Better Auth retorna errores tipados
      form.setError("root", { message: result.error.message });
      return;
    }

    // Invalidar el contexto del router para refrescar la sesión
    await router.invalidate();
    router.navigate({ to: "/dashboard" });
  }
}
```

### Sign-up

```tsx
const result = await signUp.email({
  email: data.email,
  password: data.password,
  name: data.name,
});

if (result.error) {
  // Manejar error (email duplicado, contraseña débil, etc.)
}
```

### Sign-out

```tsx
async function handleLogout() {
  await signOut();
  await router.invalidate();
  router.navigate({ to: "/login" });
}
```

### Leer sesión en un componente

```tsx
import { useSession } from "@/lib/auth-client";

function UserAvatar() {
  const { data: session, isPending } = useSession();

  if (isPending) return <Skeleton />;
  if (!session) return null;

  return <Avatar src={session.user.image} name={session.user.name} />;
}
```

---

## Sesiones expiradas

Cuando la sesión expira mientras el usuario está usando la app, las server functions van a retornar `UnauthorizedError`. Configurar el QueryClient para manejar esto globalmente:

```ts
// src/lib/query-client.ts
import { QueryClient } from "@tanstack/react-query";
import { AppError } from "@/lib/errors";

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: (failureCount, error) => {
          // No reintentar errores 401 — la sesión expiró, redirigir
          if (error instanceof AppError && error.status === 401) return false;
          return failureCount < 2;
        },
      },
    },
  });
}
```

En el error boundary global o en el root provider, interceptar el 401:

```tsx
// src/routes/__root.tsx
const queryClient = createQueryClient();

queryClient.getQueryCache().subscribe((event) => {
  if (event.type === "observerResultsUpdated") {
    const error = event.query.state.error;
    if (error instanceof AppError && error.status === 401) {
      // Redirigir al login preservando la URL actual
      router.navigate({
        to: "/login",
        search: { redirect: location.pathname },
      });
    }
  }
});
```

---

## Testing de auth

### Mock de sesión en tests de servidor

```ts
// src/tests/helpers/auth.ts
import { vi } from "vitest";
import { auth } from "@/lib/auth";

export function mockAuthenticatedUser(overrides: Partial<User> = {}) {
  const mockUser: User = {
    id: "test-user-id",
    email: "test@example.com",
    name: "Test User",
    role: "member",
    emailVerified: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };

  vi.spyOn(auth.api, "getSession").mockResolvedValue({
    user: mockUser,
    session: {
      id: "test-session",
      userId: mockUser.id,
      expiresAt: new Date(Date.now() + 86400000),
    },
  });

  return mockUser;
}

export function mockUnauthenticated() {
  vi.spyOn(auth.api, "getSession").mockResolvedValue(null);
}
```

### Test de server function protegida

```ts
// src/features/users/users.functions.server.test.ts
import { describe, test, expect, beforeEach } from "vitest";
import {
  mockAuthenticatedUser,
  mockUnauthenticated,
} from "@/tests/helpers/auth";
import { deleteAccountFn } from "./users.functions";

describe("deleteAccountFn", () => {
  test("lanza UnauthorizedError si no hay sesión", async () => {
    mockUnauthenticated();
    await expect(deleteAccountFn({ data: undefined })).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });

  test("ejecuta si el usuario está autenticado", async () => {
    mockAuthenticatedUser({ id: "user-123" });
    // ... test de la lógica real
  });
});
```

### Test de componente con sesión

```tsx
// Usar MSW para mockear /api/auth/get-session
import { http, HttpResponse } from "msw";

const handlers = [
  http.get("/api/auth/get-session", () => {
    return HttpResponse.json({
      user: { id: "1", email: "test@example.com", name: "Test" },
      session: { id: "session-1" },
    });
  }),
];
```

---

## Errores comunes

| ❌ Antipatrón                                  | ✅ Corrección                                           |
| ---------------------------------------------- | ------------------------------------------------------- |
| Verificar auth solo en el cliente              | Siempre verificar en `beforeLoad` y en server functions |
| Retornar `{ error: 'Unauthorized' }`           | Tirar `throw new UnauthorizedError()`                   |
| Usar `useState` para la sesión                 | Usar `useSession()` de auth-client                      |
| Guardar el token en localStorage               | Better Auth maneja cookies automáticamente              |
| No invalidar el router después de login/logout | Llamar `router.invalidate()` para refrescar contexto    |
