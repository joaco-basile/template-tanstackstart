---
name: project-ui
description: >
  Convenciones de UI para este proyecto: Shadcn/ui, Tailwind v4, formularios con
  TanStack Form + Zod, tablas con TanStack Table, y patrones de componentes.
  Leer cuando construyas cualquier componente de UI, formulario, tabla, modal, o layout.
license: Apache-2.0
metadata:
  author: proyecto
  version: "2.0"
---

## Árbol de decisión — empezá acá

```
¿Qué necesitás construir?
│
├── ¿Componente genérico sin conocimiento del dominio?
│   └── → src/components/ui/  (extender o componer Shadcn)
│
├── ¿Componente que usa datos de un feature?
│   └── → src/features/<feature>/components/  (Smart Component)
│
├── ¿Formulario con validación?
│   └── → TanStack Form + Zod schema del feature  (ver sección "Formularios")
│
├── ¿Tabla con sorting, filtering, paginación?
│   └── → TanStack Table  (ver sección "Tablas")
│
├── ¿Modal, dialog, sheet?
│   └── → Shadcn Dialog/Sheet + estado local (no URL)  (ver sección "Modales")
│
└── ¿Feedback de loading, error, vacío?
    └── → Skeleton para loading, ErrorBoundary para errores  (ver sección "Estados")
```

---

## Principios de diseño del proyecto

1. **Accesibilidad primero.** Usar roles semánticos, labels en todos los inputs, keyboard navigation. Shadcn lo hace bien — no sobrescribir sin razón.
2. **Composición sobre configuración.** Preferir componer componentes pequeños que configurar un mega-componente con 20 props.
3. **Tailwind v4 nativo.** Usar variables CSS de Tailwind v4 (`--color-*`, `--spacing-*`). No CSS-in-JS ni módulos CSS.
4. **Consistencia visual.** Todos los formularios se parecen. Todas las tablas se parecen. Todas las páginas tienen el mismo spacing.

---

## Layout y Composición de Páginas

Para mantener consistencia en cómo se ven las vistas principales, seguimos esta estructura base:

1. **Max-width (Contenedores):** Nunca dejar que el contenido fluya al 100% de la pantalla en monitores ultrawide.
   - Usar `container mx-auto max-w-5xl` (o `7xl` si es una tabla con muchas columnas).
2. **Anatomía del Header de Página:**
   - Izquierda: Título y breadcrumbs o botón de "Volver".
   - Derecha: Acciones principales (Botones de "Crear", "Exportar").
   - Ejemplo: `<div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">`
3. **Mobile-First Estricto:** Diseñar siempre asumiendo una columna (`flex-col`, `space-y-*`). Usar breakpoints (`md:flex-row`, `md:gap-*`) solo cuando hay espacio garantizado.
4. **Tarjetas (Cards):** Agrupar contenido relacionado dentro de `Card`. Nunca dejar datos importantes sueltos sobre el fondo principal.

---

## Jerarquía Visual y Tipografía

Tailwind ofrece demasiados tamaños. Restringimos las opciones para evitar el "Frankenstein tipográfico":

- **Títulos de Página (H1):** `text-2xl font-bold tracking-tight` (A veces `text-3xl` en vistas muy principales).
- **Títulos de Sección (H2/H3):** `text-lg font-semibold`
- **Texto Base (p, spans):** `text-sm text-foreground` (Nuestro default para casi toda la app es `sm`, no `base`).
- **Texto Secundario (labels, ayudas):** `text-sm text-muted-foreground`.
- **Micro-copy (badges, errores muy chicos):** `text-xs text-muted-foreground`.

*Regla:* Si querés que algo llame la atención, primero subile el `font-weight` (ej: `font-medium`), no el tamaño.

---

## Feedback Asíncrono (Toasts)

El usuario siempre tiene que saber qué está pasando, pero no debemos saturarlo de ruido visual.

1. **Mutaciones (Crear/Editar/Borrar):**
   - Siempre bloquear el botón con estado de loading (`<LoadingButton isLoading={...}>`).
   - El botón trabado es superior a un toast de "Guardando...". No usar toasts de loading.
2. **Éxito:**
   - Usar `toast.success("Post creado")` SOLO cuando la acción termina bien.
   - Ser breves. No decir "El post fue creado exitosamente en la base de datos".
3. **Errores Inesperados:**
   - Usar `toast.error("No se pudo crear el post", { description: error.message })`.
   - Siempre intentar darle una descripción al error si viene del backend.
4. **Validaciones de Formulario:**
   - NUNCA usar toasts para errores de validación de inputs (ej: "El email es inválido").
   - Esos errores van directamente debajo del input usando `<FormMessage />`.

---

## Shadcn: instalación y uso

```bash
# Instalar un componente
pnpm dlx shadcn@latest add button
pnpm dlx shadcn@latest add form input select table dialog sheet

# Los componentes van a src/components/ui/ automáticamente
```

### Extender un componente de Shadcn

No modificar los archivos de `src/components/ui/` directamente. En cambio, componer sobre ellos:

```tsx
// src/components/ui/loading-button.tsx
import { Button, type ButtonProps } from "./button";
import { Loader2 } from "lucide-react";

interface LoadingButtonProps extends ButtonProps {
  isLoading?: boolean;
  loadingText?: string;
}

export function LoadingButton({
  isLoading,
  loadingText,
  children,
  disabled,
  ...props
}: LoadingButtonProps) {
  return (
    <Button disabled={isLoading || disabled} {...props}>
      {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      {isLoading ? (loadingText ?? "Cargando...") : children}
    </Button>
  );
}
```

---

## Formularios

### Stack: TanStack Form + Zod + Shadcn

```tsx
// src/features/posts/components/CreatePostForm.tsx
import { useForm } from "@tanstack/react-form";
import { zodValidator } from "@tanstack/zod-form-adapter";
import { useCreatePost } from "../posts.mutations";
import { createPostSchema } from "../posts.schema";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { LoadingButton } from "@/components/ui/loading-button";
import { toast } from "sonner";

export function CreatePostForm({ onSuccess }: { onSuccess?: () => void }) {
  const createPost = useCreatePost();

  const form = useForm({
    defaultValues: {
      title: "",
      content: "",
    },
    validatorAdapter: zodValidator(),
    validators: {
      // Validación en submit — usa el schema del feature
      onSubmit: createPostSchema,
    },
    onSubmit: async ({ value }) => {
      try {
        await createPost.mutateAsync(value);
        toast.success("Post creado correctamente");
        onSuccess?.();
      } catch (error) {
        // El manejo de errores de mutation se hace en useCreatePost
        // Si llegan acá son errores inesperados
        toast.error("Error inesperado al crear el post");
      }
    },
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        form.handleSubmit();
      }}
      className="space-y-4"
    >
      <form.Field
        name="title"
        children={(field) => (
          <FormItem>
            <FormLabel>Título</FormLabel>
            <FormControl>
              <Input
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
                placeholder="Título del post"
              />
            </FormControl>
            <FormMessage>{field.state.meta.errors?.[0]}</FormMessage>
          </FormItem>
        )}
      />

      <form.Field
        name="content"
        children={(field) => (
          <FormItem>
            <FormLabel>Contenido</FormLabel>
            <FormControl>
              <Textarea
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
                placeholder="Escribí el contenido..."
                rows={6}
              />
            </FormControl>
            <FormMessage>{field.state.meta.errors?.[0]}</FormMessage>
          </FormItem>
        )}
      />

      <LoadingButton
        type="submit"
        isLoading={form.state.isSubmitting}
        loadingText="Creando post..."
      >
        Crear post
      </LoadingButton>
    </form>
  );
}
```

### Select con datos remotos

```tsx
<form.Field
  name="categoryId"
  children={(field) => (
    <FormItem>
      <FormLabel>Categoría</FormLabel>
      <Select value={field.state.value} onValueChange={field.handleChange}>
        <FormControl>
          <SelectTrigger>
            <SelectValue placeholder="Seleccioná una categoría" />
          </SelectTrigger>
        </FormControl>
        <SelectContent>
          {categories.map((cat) => (
            <SelectItem key={cat.id} value={cat.id}>
              {cat.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <FormMessage>{field.state.meta.errors?.[0]}</FormMessage>
    </FormItem>
  )}
/>
```

---

## Tablas

### TanStack Table + Shadcn DataTable

```tsx
// src/features/posts/components/PostsTable.tsx
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ArrowUpDown } from "lucide-react";
import type { Post } from "../posts";

// Definir columnas fuera del componente para evitar re-renders
const columns: ColumnDef<Post>[] = [
  {
    accessorKey: "title",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Título
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
  },
  {
    accessorKey: "published",
    header: "Estado",
    cell: ({ row }) => (
      <Badge variant={row.original.published ? "default" : "secondary"}>
        {row.original.published ? "Publicado" : "Borrador"}
      </Badge>
    ),
  },
  {
    accessorKey: "createdAt",
    header: "Fecha",
    cell: ({ row }) => format(row.original.createdAt, "dd/MM/yyyy"),
  },
  {
    id: "actions",
    cell: ({ row }) => <PostActions post={row.original} />,
  },
];

export function PostsTable({ data }: { data: Post[] }) {
  const [sorting, setSorting] = useState<SortingState>([]);

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    state: { sorting },
  });

  return (
    <div className="rounded-md border">
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
          {table.getRowModel().rows.length ? (
            table.getRowModel().rows.map((row) => (
              <TableRow key={row.id}>
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={columns.length} className="h-24 text-center">
                No hay resultados.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
```

---

## Modales y Sheets

**Regla:** el estado abierto/cerrado del modal vive en `useState` del componente padre, no en la URL.

```tsx
// src/features/posts/components/PostListPage.tsx
function PostListPage() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<Post | null>(null);

  return (
    <>
      <Button onClick={() => setIsCreateOpen(true)}>Nuevo post</Button>

      <PostsTable onEdit={(post) => setEditingPost(post)} />

      {/* Modal de creación */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Crear post</DialogTitle>
          </DialogHeader>
          <CreatePostForm onSuccess={() => setIsCreateOpen(false)} />
        </DialogContent>
      </Dialog>

      {/* Sheet de edición */}
      <Sheet
        open={!!editingPost}
        onOpenChange={(open) => !open && setEditingPost(null)}
      >
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Editar post</SheetTitle>
          </SheetHeader>
          {editingPost && (
            <EditPostForm
              post={editingPost}
              onSuccess={() => setEditingPost(null)}
            />
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
```

---

## Estados de UI

### Loading: Skeleton

```tsx
// Siempre usar Skeleton con las dimensiones aproximadas del contenido real
function PostListSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 p-4 border rounded-lg">
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-4 w-1/4 ml-auto" />
        </div>
      ))}
    </div>
  );
}
```

### Vacío: Empty State

```tsx
function EmptyState({
  message,
  action,
}: {
  message: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
      <div className="rounded-full bg-muted p-4">
        <FileX className="h-8 w-8 text-muted-foreground" />
      </div>
      <p className="text-muted-foreground">{message}</p>
      {action}
    </div>
  );
}

// Uso:
{
  posts.length === 0 && (
    <EmptyState
      message="No hay posts todavía"
      action={
        <Button onClick={() => setIsCreateOpen(true)}>Crear el primero</Button>
      }
    />
  );
}
```

### Confirmación de acciones destructivas

```tsx
// Siempre pedir confirmación antes de eliminar
function DeletePostButton({ postId }: { postId: string }) {
  const deletePost = useDeletePost();

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" size="sm">
          Eliminar
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Eliminar este post?</AlertDialogTitle>
          <AlertDialogDescription>
            Esta acción no se puede deshacer.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => deletePost.mutate(postId)}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Eliminar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
```

---

## Convenciones de Tailwind v4

```tsx
// ✅ Usar variables semánticas de Tailwind v4
<div className="bg-background text-foreground border-border" />
<p className="text-muted-foreground" />
<div className="bg-primary text-primary-foreground" />

// ✅ Spacing consistente entre secciones
<div className="space-y-6">     // entre secciones principales
  <div className="space-y-4">  // entre campos de formulario
    <div className="space-y-2"> // entre label e input
```

### cn() para clases condicionales

```tsx
import { cn } from "@/lib/utils";

<div
  className={cn(
    "rounded-lg border p-4",
    isActive && "border-primary bg-primary/5",
    hasError && "border-destructive",
    className, // siempre aceptar className override
  )}
/>;
```
