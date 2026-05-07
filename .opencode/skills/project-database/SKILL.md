---
name: project-database
description: >
  Base de datos con Drizzle ORM y PostgreSQL. Cubre definición de schemas, relaciones,
  migraciones, patrones de query, y fixtures de test con transacciones aisladas.
  Leer cuando definas tablas, escribas queries, corras migraciones, o configures tests de DB.
license: Apache-2.0
metadata:
  author: proyecto
  version: "2.0"
---

## Árbol de decisión — empezá acá

```
¿Qué necesitás hacer con la DB?
│
├── ¿Definir una tabla nueva o modificar columnas?
│   └── → src/db/schemas/<nombre>.ts  (ver sección "Schemas")
│       → npm run db:generate && npm run db:migrate
│
├── ¿Escribir una query (select, insert, update, delete)?
│   └── → src/features/<feature>/<feature>.server.ts  (ver sección "Queries")
│
├── ¿Necesitás SQL raw que Drizzle no soporta bien?
│   └── → db.execute(sql`...`) en el .server.ts  (ver sección "SQL Raw")
│
├── ¿Configurar un test que necesita DB real?
│   └── → usar el fixture `test` de src/tests/fixture.server.ts  (ver sección "Testing")
│
└── ¿Relación entre dos tablas de distintos features?
    └── → definir en src/db/schemas/ para evitar circular deps  (ver sección "Relaciones")
```

---

## Principio fundamental

**Schema definition ≠ Data fetching:**

| Responsabilidad      | Ubicación                                    | Qué va ahí                                |
| -------------------- | -------------------------------------------- | ----------------------------------------- |
| Definir la tabla     | `src/db/schemas/<nombre>.ts`                 | `pgTable`, columnas, relaciones, índices  |
| Queries y mutaciones | `src/features/<feature>/<feature>.server.ts` | SELECT, INSERT, UPDATE, lógica de negocio |

**¿Por qué esta separación?** Si `users.server.ts` definiera la tabla `users` y quisiera relacionarla con `posts`, tendría que importar desde `features/posts/`, creando dependencias circulares. Centralizar en `db/schemas/` elimina ese problema para siempre.

---

## Schemas

### Convenciones de columnas

```ts
// src/db/schemas/users.ts
import { pgTable, text, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";

// Enums de Postgres — tipado fuerte, mejor que text con check constraint
export const userRoleEnum = pgEnum("user_role", ["admin", "member"]);

export const users = pgTable("users", {
  // IDs: usar CUID2 (más corto que UUID, URL-safe, collision-resistant)
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),

  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  role: userRoleEnum("role").notNull().default("member"),
  image: text("image"),

  // Timestamps: siempre en UTC, con default de DB
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

// Relaciones declarativas (usadas por Drizzle para query builder relacional)
export const usersRelations = relations(users, ({ many }) => ({
  posts: many(posts),
  sessions: many(sessions),
}));

// Tipos inferidos — usar en lugar de definir tipos manuales
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
```

### Re-exportar todo desde el index

```ts
// src/db/schemas/index.ts
// Drizzle necesita leer todas las tablas desde un punto de entrada único
export * from "./users";
export * from "./posts";
export * from "./sessions";
// Agregar aquí cada nuevo schema
```

### Schemas para Better Auth

Better Auth necesita tablas específicas. Generarlas con su CLI:

```bash
npx better-auth generate --output src/db/schemas/auth.ts
```

Luego re-exportar desde `index.ts`.

---

## Conexión (`src/db/index.server.ts`)

```ts
// ⚠️ NUNCA importar este archivo desde código cliente
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schemas";
import { env } from "@/env";

const pool = new Pool({
  connectionString: env.DATABASE_URL,
  max: 10, // máximo de conexiones
  idleTimeoutMillis: 30_000,
});

export const db = drizzle(pool, {
  schema,
  logger: env.NODE_ENV === "development", // log queries en dev
});

export type DB = typeof db;
```

---

## Queries

### Patrones comunes

```ts
// src/features/posts/posts.server.ts
import { db } from "@/db/index.server";
import { posts, users } from "@/db/schemas";
import { eq, desc, ilike, and, count, sql } from "drizzle-orm";

// SELECT simple
export async function getPostById(id: string) {
  return db.query.posts.findFirst({
    where: eq(posts.id, id),
    with: { author: true }, // relación declarativa
  });
}

// SELECT con filtros dinámicos
export async function getPosts(filters: PostFilters) {
  const conditions = [];

  if (filters.authorId) conditions.push(eq(posts.authorId, filters.authorId));
  if (filters.search)
    conditions.push(ilike(posts.title, `%${filters.search}%`));
  if (filters.published !== undefined)
    conditions.push(eq(posts.published, filters.published));

  return db.query.posts.findMany({
    where: conditions.length ? and(...conditions) : undefined,
    orderBy: desc(posts.createdAt),
    limit: filters.limit ?? 20,
    offset: ((filters.page ?? 1) - 1) * (filters.limit ?? 20),
    with: { author: { columns: { id: true, name: true, image: true } } },
  });
}

// SELECT con COUNT para paginación
export async function getPostsWithCount(filters: PostFilters) {
  const [items, [{ total }]] = await Promise.all([
    getPosts(filters),
    db.select({ total: count() }).from(posts).where(/* mismo where */),
  ]);
  return { items, total: Number(total) };
}

// INSERT
export async function createPost(data: NewPost) {
  const [post] = await db.insert(posts).values(data).returning();
  return post;
}

// UPDATE parcial
export async function updatePost(id: string, data: Partial<NewPost>) {
  const [post] = await db
    .update(posts)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(posts.id, id))
    .returning();
  return post;
}

// DELETE
export async function deletePost(id: string) {
  await db.delete(posts).where(eq(posts.id, id));
}
```

### SQL Raw (cuando Drizzle no alcanza)

```ts
import { sql } from "drizzle-orm";

// Para queries complejas que el query builder no soporta bien
export async function getPostStats() {
  return db.execute(sql`
    SELECT
      date_trunc('month', created_at) as month,
      count(*) as total,
      count(*) FILTER (WHERE published = true) as published
    FROM posts
    GROUP BY 1
    ORDER BY 1 DESC
    LIMIT 12
  `);
}
```

### Transacciones

```ts
export async function transferData(fromId: string, toId: string) {
  return db.transaction(async (tx) => {
    // Todas las operaciones dentro de tx son atómicas
    const source = await tx.query.items.findFirst({
      where: eq(items.id, fromId),
    });
    if (!source) throw new NotFoundError("Item origen");

    await tx.update(items).set({ ownerId: toId }).where(eq(items.id, fromId));
    await tx.insert(auditLog).values({ action: "transfer", fromId, toId });

    return source;
  });
}
```

---

## Migraciones

```bash
# Workflow estándar de desarrollo:
npm run db:generate   # genera SQL en src/db/migrations/ a partir de cambios en schemas
npm run db:migrate    # aplica las migraciones pendientes

# Solo en desarrollo local cuando querés iterar rápido sin generar archivos:
npm run db:push       # ⚠️ NUNCA en producción — pushea schema directamente

# Inspeccionar la DB:
npm run db:studio     # abre Drizzle Studio en el browser
```

**Regla:** No editar manualmente los archivos en `src/db/migrations/`. Drizzle los gestiona.

---

## Testing con DB real

### Principio: Shared Isolated Transactions

Los tests usan una sola DB compartida. Cada test corre dentro de una transacción que se hace **ROLLBACK automático** al terminar. Resultado: tests en milisegundos sin truncar tablas.

### Fixture (`src/tests/fixture.server.ts`)

```ts
import { config } from "dotenv";
config({ path: ".env.test" }); // cargar ANTES de cualquier import de env.ts

import { test as base, expect } from "vitest";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "@/db/schemas";
import { env } from "@/env";

const pool = new Pool({ connectionString: env.DATABASE_URL });
const globalDb = drizzle(pool, { schema });

// Tipo de la transacción para usarlo en los tests
type TxDB = Parameters<Parameters<typeof globalDb.transaction>[0]>[0];

export const test = base.extend<{ db: TxDB }>({
  db: async ({}, use) => {
    let testError: unknown;

    await globalDb
      .transaction(async (tx) => {
        try {
          await use(tx as any);
        } catch (err) {
          testError = err;
        }
        // Siempre tirar para forzar ROLLBACK de Postgres
        throw new Error("ROLLBACK_AFTER_TEST");
      })
      .catch((err) => {
        if (testError) throw testError;
        if (err instanceof Error && err.message === "ROLLBACK_AFTER_TEST")
          return;
        throw err;
      });
  },
});

export { expect, describe, beforeAll, afterAll, vi } from "vitest";
```

### Fixture con datos relacionales

```ts
// src/tests/fixture.server.ts (extendido)
import { faker } from '@faker-js/faker'
import { users, posts } from '@/db/schemas'

type Fixtures = {
  db: TxDB
  testUser: typeof users.$inferSelect
  testPost: typeof posts.$inferSelect
}

export const test = base.extend<Fixtures>({
  db: /* igual que arriba */,

  testUser: async ({ db }, use) => {
    const [user] = await db
      .insert(users)
      .values({
        email: faker.internet.email(),  // ✅ Nunca hardcodear datos únicos
        name: faker.person.fullName(),
        role: 'member',
      })
      .returning()
    await use(user)
    // No hace falta limpiar — el ROLLBACK de `db` borra todo
  },

  testPost: async ({ db, testUser }, use) => {
    const [post] = await db
      .insert(posts)
      .values({
        title: faker.lorem.sentence(),
        content: faker.lorem.paragraphs(2),
        authorId: testUser.id,  // FK correcta
        published: false,
      })
      .returning()
    await use(post)
  },
})
```

### Ejemplo de test completo

```ts
// src/features/posts/posts.server.test.ts
import { describe } from "vitest";
import { test, expect } from "@/tests/fixture.server";
import { getPosts, createPost, deletePost } from "./posts.server";

describe("posts.server", () => {
  test("getPost retorna el post creado", async ({ db, testUser }) => {
    // Crear dato directamente en la tx aislada
    const [created] = await db
      .insert(posts)
      .values({
        title: "Test post",
        authorId: testUser.id,
      })
      .returning();

    const result = await getPosts({ authorId: testUser.id });

    // ✅ Verificar presencia, nunca longitud exacta (DB compartida)
    expect(result).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: created.id, title: "Test post" }),
      ]),
    );
  });

  test("deletePost elimina el post", async ({ db, testPost }) => {
    await deletePost(testPost.id);

    const result = await getPosts({ authorId: testPost.authorId });
    expect(result).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ id: testPost.id })]),
    );
  });
});
```

---

## Reglas de oro (nunca violar)

1. **Nunca asumir tabla vacía.** La DB es compartida entre tests paralelos.
2. **Nunca hardcodear IDs.** Usar `createId()` o `faker` para evitar colisiones.
3. **Nunca assertar longitud exacta de arrays.** Usar `arrayContaining` + `objectContaining`.
4. **Nunca editar migraciones manualmente.** Solo Drizzle Kit las genera.
5. **Nunca importar `db/index.server.ts` desde código cliente.** Vite explotará en build.
6. **El fixture `db` es una transacción.** Pasarla a las funciones que testeas en lugar de usar `db` global.

### ¿Cómo paso la TX a mi función de producción?

Las funciones en `.server.ts` deben aceptar un parámetro de DB opcional:

```ts
// ✅ Correcto — testeable con la TX del fixture
export async function createPost(data: NewPost, database: DB | TxDB = db) {
  const [post] = await database.insert(posts).values(data).returning();
  return post;
}

// En producción: createPost(data)           → usa db global
// En tests:      createPost(data, txFromFixture) → usa la TX aislada
```
