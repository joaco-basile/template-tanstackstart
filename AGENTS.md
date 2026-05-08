# Agent Instructions

Este repositorio usa **TanStack Start** (file-based routing + SSR) con **React**, **Drizzle ORM** para base de datos, **Better Auth** para autenticación, y **Tailwind CSS v4**.

---

## Tooling & Commands

Project use **pnpm** as package manager

| Tarea                   | Comando                                       |
| ----------------------- | --------------------------------------------- |
| Linting + Formatting    | `pnpm run check` (Biome — NO Prettier/ESLint) |
| Solo formato            | `pnpm run format`                             |
| Solo lint               | `pnpm run lint`                               |
| Tests cliente (DOM)     | `pnpm run test:client`                        |
| Tests servidor (Node)   | `pnpm run test:server`                        |
| Todos los tests         | `pnpm run test`                               |
| Generar migración       | `pnpm run db:generate`                        |
| Aplicar migraciones     | `pnpm run db:migrate`                         |
| Push directo (dev only) | `pnpm run db:push`                            |
| Build producción        | `pnpm run build`                              |

**Reglas de tooling:**

- Usar **Biome** siempre. Nunca configurar Prettier o ESLint.
- Path aliases: `@/*` → `./src/*`. usar siempre `@/` por convención interna.
- Variables de entorno: importar siempre desde `@/env`, nunca `process.env` directo.
- Instalar componentes Shadcn con `pnpm dlx shadcn@latest add <component>`.

---

## Cómo elegir qué skill leer

Antes de escribir cualquier código, determiná la naturaleza de tu tarea y leé **todas** las skills marcadas:

| Si tu tarea involucra...                      | Leer estas skills                                     |
| --------------------------------------------- | ----------------------------------------------------- |
| Crear o reorganizar archivos/carpetas         | `project-architecture`                                |
| Login, logout, sesión, rutas protegidas       | `project-architecture` + `project-auth`               |
| Tablas de DB, queries, migraciones            | `project-database`                                    |
| `createServerFn`, RPCs, validación de inputs  | `project-architecture` + `project-error-handling`     |
| Errores en mutations, formularios, boundaries | `project-error-handling`                              |
| `useQuery`, `useMutation`, cache, prefetch    | `project-tanstack`                                    |
| Componentes UI, formularios, tablas, modales  | `project-ui`                                          |
| Escribir o planificar tests                   | `project-testing` + skill del área testeada           |
| Cualquier cosa nueva desde cero               | `project-architecture` primero, luego las específicas |

> **Regla de oro:** cuando dudes, empezá con `project-architecture`. Define dónde vive cada cosa.

---

## Skills disponibles

| Skill                    | Descripción                                                           | Archivo                                            |
| ------------------------ | --------------------------------------------------------------------- | -------------------------------------------------- |
| `project-architecture`   | FSD, estructura global, rutas de importación, escalado de features    | `.opencode/skills/project-architecture/SKILL.md`   |
| `project-auth`           | Better Auth, sesiones, rutas protegidas, middleware, server functions | `.opencode/skills/project-auth/SKILL.md`           |
| `project-database`       | Drizzle ORM, schemas, migraciones, queries, fixtures de test          | `.opencode/skills/project-database/SKILL.md`       |
| `project-error-handling` | AppError, ZodError, boundaries, retry config, decision tree           | `.opencode/skills/project-error-handling/SKILL.md` |
| `project-tanstack`       | TanStack Query + Router: queryOptions, mutations, loaders, prefetch   | `.opencode/skills/project-tanstack/SKILL.md`       |
| `project-testing`        | Vitest workspaces, TDD, RTL, MSW, fixtures, contratos de test         | `.opencode/skills/project-testing/SKILL.md`        |
| `project-ui`             | Shadcn/ui, Tailwind v4, formularios, tablas, convenciones visuales    | `.opencode/skills/project-ui/SKILL.md`             |

---

## Convenciones rápidas (siempre aplican)

```
src/features/<feature>/
  <feature>.ts           → tipos compartidos (client-safe)
  <feature>.schema.ts    → validación Zod (client-safe)
  <feature>.server.ts    → queries Drizzle (server-only)
  <feature>.functions.ts → createServerFn RPCs
  <feature>.queries.ts   → queryOptions factories
  <feature>.mutations.ts → useMutation hooks
  components/            → UI del feature
```

- **Nunca** importar `.server.ts` desde componentes o archivos client.
- **Nunca** poner lógica de negocio en `src/routes/` — solo glue code.
- **Nunca** usar `process.env` directo — siempre `env` desde `@/lib/env/client` para variables del cliente y `@/lib/env/server` para variables del servidor.
- **Siempre** tirar errores con `throw`, nunca retornar `{ success: false }`.
- **Idiomas**: Todo el código (variables, funciones, schemas, tablas, nombres de archivos) DEBE estar en **inglés**. Solo la interfaz de usuario (textos visibles, copys, mensajes de error visibles para el usuario) DEBE estar en **español**.
