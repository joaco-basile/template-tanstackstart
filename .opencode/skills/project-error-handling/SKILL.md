---
name: project-error-handling
description: >
  Manejo de errores en todo el stack. Jerarquía AppError, integración con ZodError,
  error boundaries en rutas, configuración de retry en QueryClient, y mapeo de errores
  a formularios. Leer cuando escribas createServerFn, manejes errores en mutations,
  configures boundaries, o definas un nuevo tipo de error de negocio.
license: Apache-2.0
metadata:
  author: proyecto
  version: "2.0"
---

## Árbol de decisión — empezá acá

```
¿Qué tipo de error necesitás manejar?
│
├── ¿Error de validación de INPUT del usuario? (campo requerido, formato inválido)
│   └── → .validator(zodSchema) en createServerFn
│       → El cliente recibe ZodError. Mapearlo a campos del formulario.
│       → NUNCA transformar ZodError en AppError manualmente.
│
├── ¿Error de negocio? (recurso no encontrado, permiso denegado, conflicto de datos)
│   └── → throw new NotFoundError() / UnauthorizedError() / ConflictError()
│       → El cliente los distingue por .code y .status
│
├── ¿Error inesperado de DB o sistema?
│   └── → loguear en servidor, throw new InternalError()
│       → El cliente muestra mensaje genérico
│
├── ¿Error de red o timeout en una query de React Query?
│   └── → configurar retry en QueryClient (ver sección "QueryClient")
│       → mostrar error boundary con botón "Reintentar"
│
└── ¿Error dentro de un loader de ruta?
    └── → configurar errorComponent en el route (ver sección "Route Boundaries")
```

---

## Jerarquía de errores (`src/lib/errors.ts`)

```ts
export class AppError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly status: number = 400,
    public readonly meta?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "AppError";
    // Preservar stack trace en V8
    if (Error.captureStackTrace)
      Error.captureStackTrace(this, this.constructor);
  }
}

export class NotFoundError extends AppError {
  constructor(resource = "Recurso") {
    super(`${resource} no encontrado`, "NOT_FOUND", 404);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "No autorizado") {
    super(message, "UNAUTHORIZED", 401);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "Sin permisos suficientes") {
    super(message, "FORBIDDEN", 403);
  }
}

export class ConflictError extends AppError {
  constructor(message: string, meta?: Record<string, unknown>) {
    super(message, "CONFLICT", 409, meta);
  }
}

export class ValidationError extends AppError {
  constructor(
    message: string,
    public readonly fields?: Record<string, string>,
  ) {
    super(message, "VALIDATION_ERROR", 422);
  }
}

export class InternalError extends AppError {
  constructor(message = "Error interno del servidor") {
    super(message, "INTERNAL_ERROR", 500);
  }
}
```

---

## Server Functions: el patrón correcto

```ts
// src/features/posts/posts.functions.ts
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authMiddleware } from "@/middleware/auth";
import {
  NotFoundError,
  ConflictError,
  InternalError,
  ForbiddenError,
} from "@/lib/errors";
import { createPost, getPostById } from "./posts.server";
import { createPostSchema } from "./posts.schema";

export const createPostFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(createPostSchema) // ← ZodError automático. No tocar.
  .handler(async ({ data, context }) => {
    if (!context.user) throw new UnauthorizedError();

    try {
      return await createPost({ ...data, authorId: context.user.id });
    } catch (error) {
      // Error de constraint único de Postgres
      if (error instanceof Error && "code" in error && error.code === "23505") {
        throw new ConflictError("Ya existe un post con ese título");
      }
      // Cualquier otro error de DB → no exponer detalles
      console.error("[createPostFn] DB error:", error);
      throw new InternalError();
    }
  });

export const getPostFn = createServerFn({ method: "GET" })
  .validator(z.string().min(1))
  .handler(async ({ data: id }) => {
    const post = await getPostById(id);
    if (!post) throw new NotFoundError("Post");
    return post;
  });
```

**Lo que NUNCA hacer:**

```ts
// ❌ Retornar objeto de error en vez de tirar
return { success: false, error: 'No encontrado' }

// ❌ Tirar Error genérico
throw new Error('Something went wrong')

// ❌ Re-envolver ZodError en ValidationError
} catch (e) {
  if (e instanceof ZodError) throw new ValidationError('Campos inválidos')
}
```

---

## Cliente: manejo en mutations

```tsx
// src/features/posts/components/CreatePostForm.tsx
import { useForm } from "@tanstack/react-form";
import { zodValidator } from "@tanstack/zod-form-adapter";
import { ZodError } from "zod";
import { AppError } from "@/lib/errors";
import { useCreatePost } from "../posts.mutations";

export function CreatePostForm() {
  const createPost = useCreatePost();

  const form = useForm({
    defaultValues: { title: "", content: "" },
    validatorAdapter: zodValidator(),
  });

  async function handleSubmit() {
    try {
      await createPost.mutateAsync(form.state.values);
      // éxito
    } catch (error) {
      if (error instanceof ZodError) {
        // Errores de validación → mapear a campos
        for (const issue of error.issues) {
          const field = issue.path.join(".");
          form.setFieldMeta(field as any, (prev) => ({
            ...prev,
            errorMap: { onSubmit: issue.message },
          }));
        }
        return;
      }

      if (error instanceof AppError) {
        // Error de negocio → mostrar en root del formulario o toast
        if (error.status === 409) {
          form.setFieldMeta("title", (prev) => ({
            ...prev,
            errorMap: { onSubmit: error.message },
          }));
        } else {
          toast.error(error.message);
        }
        return;
      }

      // Fallback para errores inesperados
      toast.error("Ocurrió un error inesperado. Intentá de nuevo.");
      console.error("[CreatePostForm] unexpected error:", error);
    }
  }
}
```

---

## Route Error Boundaries

Cada ruta puede definir su propio componente de error. Usarlo para errores específicos del dominio.

```tsx
// src/routes/posts/$postId.tsx
import { createFileRoute } from "@tanstack/react-router";
import { useQueryErrorResetBoundary } from "@tanstack/react-query";
import { AppError } from "@/lib/errors";

export const Route = createFileRoute("/posts/$postId")({
  loader: async ({ context: { queryClient }, params }) => {
    // ensureQueryData lanza el error del loader si falla
    await queryClient.ensureQueryData(postsQueries.detail(params.postId));
  },

  errorComponent: ({ error, reset }) => {
    const { reset: resetQuery } = useQueryErrorResetBoundary();

    // 404 específico
    if (error instanceof AppError && error.status === 404) {
      return (
        <div className="flex flex-col items-center gap-4 py-16">
          <h1 className="text-2xl font-semibold">Post no encontrado</h1>
          <p className="text-muted-foreground">
            El post que buscás no existe o fue eliminado.
          </p>
          <Button asChild>
            <Link to="/posts">Volver al listado</Link>
          </Button>
        </div>
      );
    }

    // Error genérico con retry
    return (
      <div className="flex flex-col items-center gap-4 py-16">
        <h1 className="text-2xl font-semibold">Error al cargar</h1>
        <p className="text-muted-foreground text-sm">
          {error instanceof Error ? error.message : "Error desconocido"}
        </p>
        <Button
          onClick={() => {
            resetQuery();
            reset();
          }}
        >
          Reintentar
        </Button>
      </div>
    );
  },

  component: PostPage,
});
```

### Error boundary global (para errores no capturados por rutas)

```tsx
// src/routes/__root.tsx
import { Outlet, createRootRouteWithContext } from "@tanstack/react-router";

export const Route = createRootRouteWithContext<RouterContext>()({
  errorComponent: ({ error }) => {
    // Aquí llegan solo los errores que ninguna ruta hija capturó
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="text-3xl font-bold">Algo salió mal</h1>
          <Button onClick={() => window.location.reload()} className="mt-4">
            Recargar página
          </Button>
        </div>
      </div>
    );
  },
  component: () => <Outlet />,
});
```

---

## QueryClient: configuración de retry

```ts
// src/lib/query-client.ts
import { QueryClient } from "@tanstack/react-query";
import { AppError } from "@/lib/errors";

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // No reintentar errores 4xx — son definitivos
        retry: (failureCount, error) => {
          if (error instanceof AppError) {
            if (error.status >= 400 && error.status < 500) return false;
          }
          return failureCount < 2; // hasta 2 reintentos para errores de red/5xx
        },
        staleTime: 60_000, // 1 minuto por defecto
        gcTime: 5 * 60_000, // 5 minutos en caché
        refetchOnWindowFocus: false, // opcional según UX deseada
      },
      mutations: {
        retry: false, // las mutations nunca se reintentan automáticamente
      },
    },
  });
}
```

---

## Errores de DB: códigos de Postgres

Referencia rápida para el handler de createServerFn:

| Código PG | Significado           | AppError a usar                                          |
| --------- | --------------------- | -------------------------------------------------------- |
| `23505`   | Unique violation      | `ConflictError`                                          |
| `23503`   | Foreign key violation | `ConflictError` o `NotFoundError`                        |
| `23502`   | Not null violation    | `InternalError` (no debería llegar si validamos con Zod) |
| `42P01`   | Tabla no existe       | `InternalError` (problema de migración)                  |
| `53300`   | Too many connections  | `InternalError`                                          |

```ts
function handleDbError(error: unknown): never {
  if (error && typeof error === "object" && "code" in error) {
    const pgError = error as { code: string; detail?: string };
    if (pgError.code === "23505")
      throw new ConflictError("El recurso ya existe");
    if (pgError.code === "23503")
      throw new NotFoundError("Recurso relacionado");
  }
  console.error("[DB Error]", error);
  throw new InternalError();
}
```

---

## Resumen del modelo híbrido

| Capa                   | Tipo de error          | Cuándo                       |
| ---------------------- | ---------------------- | ---------------------------- |
| `.validator(schema)`   | `ZodError`             | Input del usuario inválido   |
| `.handler()`           | `AppError` (subclase)  | Lógica de negocio, DB, auth  |
| QueryClient            | Configuración de retry | Errores de red, 5xx          |
| Route `errorComponent` | UI de error específica | 404, errores de loader       |
| Root `errorComponent`  | Fallback global        | Todo lo que no fue capturado |
