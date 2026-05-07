---
name: project-tanstack
description: >
  Patrones de TanStack Query y TanStack Router para este proyecto. Cubre queryOptions,
  useMutation con invalidación de cache, estrategias de loading (critical vs deferred),
  URL como fuente de verdad para estado de filtros, y prefetching en loaders.
  Leer cuando implementes fetching de datos, navegación, filtros en URL, o cache.
license: Apache-2.0
metadata:
  author: proyecto
  version: "2.0"
---

## Árbol de decisión — empezá acá

```
¿Qué necesitás hacer?
│
├── ¿Leer datos en un componente?
│   └── → useSuspenseQuery(feature.queries.detail(id))  (ver sección "Queries")
│
├── ¿Mutar datos (crear, actualizar, eliminar)?
│   └── → useMutation en <feature>.mutations.ts con invalidación  (ver sección "Mutations")
│
├── ¿Prefetchear datos antes de que el componente monte?
│   │
│   ├── ¿Los datos son CRÍTICOS para renderizar la página?
│   │   └── → await queryClient.ensureQueryData() en el loader
│   │
│   └── ¿Los datos son secundarios o pueden aparecer después?
│       └── → queryClient.prefetchQuery() sin await en el loader
│
├── ¿Estado de filtros, búsqueda, paginación?
│   └── → validateSearch + URL search params (ver sección "URL como fuente de verdad")
│
└── ¿Optimistic updates para UX más fluida?
    └── → onMutate + onError + onSettled en useMutation  (ver sección "Optimistic Updates")
```

---

## TanStack Query: conceptos clave

### queryOptions — la unidad base

Siempre definir queries con `queryOptions()` en el archivo `.queries.ts` del feature. Esto permite compartir la misma configuración entre componentes, loaders, y prefetching sin duplicar la queryKey.

```ts
// src/features/posts/posts.queries.ts
import { queryOptions } from "@tanstack/react-query";
import { getPostsFn, getPostByIdFn } from "./posts.functions";
import type { PostFiltersInput } from "./posts.schema";

export const postsQueries = {
  // Lista con filtros — la queryKey incluye los filtros para cache granular
  list: (filters: PostFiltersInput = {}) =>
    queryOptions({
      queryKey: ["posts", "list", filters],
      queryFn: () => getPostsFn({ data: filters }),
      staleTime: 60_000, // datos frescos por 1 minuto
      placeholderData: (prev) => prev, // mantener datos anteriores mientras recarga (paginación)
    }),

  // Detalle de un item
  detail: (id: string) =>
    queryOptions({
      queryKey: ["posts", "detail", id],
      queryFn: () => getPostByIdFn({ data: id }),
      staleTime: 5 * 60_000, // detalle puede ser más estable
      enabled: !!id, // no ejecutar si no hay id
    }),

  // Queries derivadas o relacionadas
  byAuthor: (authorId: string) =>
    queryOptions({
      queryKey: ["posts", "list", { authorId }],
      queryFn: () => getPostsFn({ data: { authorId } }),
      staleTime: 60_000,
    }),
};
```

### Usar queries en componentes

```tsx
// Con Suspense (recomendado para data crítica)
import { useSuspenseQuery } from "@tanstack/react-query";

function PostDetail({ id }: { id: string }) {
  // Lanza Suspense mientras carga, ErrorBoundary si falla
  const { data: post } = useSuspenseQuery(postsQueries.detail(id));

  return <article>{post.title}</article>;
}

// Sin Suspense (para data secundaria o con loading inline)
import { useQuery } from "@tanstack/react-query";

function PostStats({ authorId }: { authorId: string }) {
  const { data, isLoading, isError } = useQuery(
    postsQueries.byAuthor(authorId),
  );

  if (isLoading) return <StatsSkeletons />;
  if (isError) return <div>Error cargando estadísticas</div>;

  return <StatsGrid data={data} />;
}
```

---

## Mutations

Siempre encapsular mutations en hooks custom en el archivo `.mutations.ts`:

```ts
// src/features/posts/posts.mutations.ts
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createPostFn, updatePostFn, deletePostFn } from "./posts.functions";
import type { CreatePostInput, UpdatePostInput } from "./posts.schema";

export function useCreatePost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreatePostInput) => createPostFn({ data }),

    onSuccess: (newPost) => {
      // Invalidar la lista para que recargue
      queryClient.invalidateQueries({ queryKey: ["posts", "list"] });

      // Opcionalmente seedear el cache del detalle para evitar un fetch extra
      queryClient.setQueryData(["posts", "detail", newPost.id], newPost);
    },
  });
}

export function useUpdatePost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdatePostInput }) =>
      updatePostFn({ data: { id, ...data } }),

    onSuccess: (updatedPost) => {
      // Actualizar el detalle en cache inmediatamente
      queryClient.setQueryData(
        ["posts", "detail", updatedPost.id],
        updatedPost,
      );
      // Invalidar la lista porque el título pudo cambiar
      queryClient.invalidateQueries({ queryKey: ["posts", "list"] });
    },
  });
}

export function useDeletePost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deletePostFn({ data: id }),

    onSuccess: (_, deletedId) => {
      // Remover del cache de detalle
      queryClient.removeQueries({ queryKey: ["posts", "detail", deletedId] });
      // Invalidar todas las listas (puede haber múltiples filtros en cache)
      queryClient.invalidateQueries({ queryKey: ["posts", "list"] });
    },
  });
}
```

### Usar mutations en componentes

```tsx
function DeletePostButton({ postId }: { postId: string }) {
  const deletePost = useDeletePost();

  return (
    <Button
      variant="destructive"
      disabled={deletePost.isPending}
      onClick={() => deletePost.mutate(postId)}
    >
      {deletePost.isPending ? "Eliminando..." : "Eliminar"}
    </Button>
  );
}
```

---

## Optimistic Updates

Para mutations frecuentes donde la UX debe ser instantánea:

```ts
export function useTogglePublished() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, published }: { id: string; published: boolean }) =>
      updatePostFn({ data: { id, published } }),

    // 1. Actualizar optimistamente antes de la request
    onMutate: async ({ id, published }) => {
      // Cancelar refetches en vuelo para evitar sobreescritura
      await queryClient.cancelQueries({ queryKey: ["posts", "detail", id] });

      // Guardar snapshot del estado anterior
      const previousPost = queryClient.getQueryData(["posts", "detail", id]);

      // Aplicar update optimista
      queryClient.setQueryData(["posts", "detail", id], (old: Post) => ({
        ...old,
        published,
      }));

      return { previousPost }; // context para onError
    },

    // 2. Revertir si falla
    onError: (_, { id }, context) => {
      queryClient.setQueryData(["posts", "detail", id], context?.previousPost);
    },

    // 3. Siempre sincronizar con el servidor al final
    onSettled: (_, __, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["posts", "detail", id] });
    },
  });
}
```

---

## TanStack Router: loading strategies

### Critical data — bloquea la navegación

Usar cuando la página NO puede renderizarse sin esos datos:

```ts
// src/routes/posts/$postId.tsx
export const Route = createFileRoute("/posts/$postId")({
  loader: async ({ context: { queryClient }, params }) => {
    // await bloquea: el usuario permanece en la página anterior hasta que resuelve
    await queryClient.ensureQueryData(postsQueries.detail(params.postId));
  },
  component: PostPage,
});

// En el componente, usar useSuspenseQuery con la misma queryKey
function PostPage() {
  const { postId } = Route.useParams();
  const { data: post } = useSuspenseQuery(postsQueries.detail(postId));
  // data siempre está disponible — el loader garantizó que cargó
}
```

### Deferred data — navegación instantánea

Usar para datos secundarios o que pueden aparecer después:

```ts
export const Route = createFileRoute('/posts/')({
  loader: async ({ context: { queryClient }, deps }) => {
    // Sin await: navega de inmediato, los datos cargan en background
    queryClient.prefetchQuery(postsQueries.list(deps))
  },
  component: PostListPage,
})

// En el componente, manejar el estado de loading
function PostListPage() {
  const filters = Route.useSearch()
  const { data, isLoading } = useQuery(postsQueries.list(filters))

  if (isLoading) return <PostListSkeleton />
  return <PostList posts={data} />
}
```

### Combinar ambas estrategias

```ts
loader: async ({ context: { queryClient }, params, deps: { search } }) => {
  // Crítico: no podemos mostrar nada sin el autor
  await queryClient.ensureQueryData(usersQueries.detail(params.userId));

  // Secundario: los posts pueden aparecer después
  queryClient.prefetchQuery(postsQueries.byAuthor(params.userId));
};
```

---

## URL como fuente de verdad

**Regla:** Todo estado que afecta la data visible (filtros, búsqueda, paginación, ordenamiento, tab activo) debe vivir en la URL. Nunca en `useState`.

**¿Por qué?** Deep-linking gratis, back/forward del browser funciona, SSR puede prefetchear con el estado correcto.

```ts
// src/routes/posts/index.tsx
import { createFileRoute } from "@tanstack/react-router";
import { postFiltersSchema } from "@/features/posts/posts.schema";

export const Route = createFileRoute("/posts/")({
  // Zod parsea y valida los search params automáticamente
  validateSearch: postFiltersSchema,

  // loaderDeps extrae qué parte del search afecta al loader
  loaderDeps: ({ search }) => search,

  loader: async ({ context: { queryClient }, deps }) => {
    queryClient.prefetchQuery(postsQueries.list(deps));
  },

  component: PostListPage,
});
```

```tsx
// Componente que lee y escribe search params
function PostListFilters() {
  const navigate = useNavigate({ from: Route.fullPath });
  const filters = Route.useSearch();

  function handleSearch(value: string) {
    navigate({
      search: (prev) => ({ ...prev, search: value || undefined, page: 1 }),
      replace: true, // no agregar al historial de navegación
    });
  }

  function handleRoleFilter(role: string | undefined) {
    navigate({
      search: (prev) => ({ ...prev, role, page: 1 }),
      replace: true,
    });
  }

  return (
    <div className="flex gap-3">
      <Input
        value={filters.search ?? ""}
        onChange={(e) => handleSearch(e.target.value)}
        placeholder="Buscar..."
      />
      <Select
        value={filters.role ?? "all"}
        onValueChange={(v) => handleRoleFilter(v === "all" ? undefined : v)}
      >
        {/* options */}
      </Select>
    </div>
  );
}
```

**¿Cuándo SÍ usar `useState`?**

- Modales abiertos/cerrados (no afectan datos del servidor)
- Acordeones, tooltips, dropdowns
- Valores de formularios en edición (antes de submit)
- Estado de UI efímero que no necesita ser compartible

---

## Invalidación de cache: guía rápida

```ts
const queryClient = useQueryClient();

// Invalidar una key exacta
queryClient.invalidateQueries({ queryKey: ["posts", "detail", id] });

// Invalidar todo un namespace (todas las listas de posts)
queryClient.invalidateQueries({ queryKey: ["posts", "list"] });

// Invalidar todo de un dominio
queryClient.invalidateQueries({ queryKey: ["posts"] });

// Remover del cache (no refetchea, elimina)
queryClient.removeQueries({ queryKey: ["posts", "detail", id] });

// Setar datos directamente (para optimistic updates o después de mutation)
queryClient.setQueryData(["posts", "detail", id], newData);

// Cancelar fetches en vuelo (antes de optimistic update)
await queryClient.cancelQueries({ queryKey: ["posts", "detail", id] });
```

**Regla de invalidación:** ser lo más específico posible. Invalidar `['posts']` completo cuando solo cambió un detalle es costoso — refetchea todo. Preferir `['posts', 'list']` para afectar listas o `['posts', 'detail', id]` para afectar un item.
