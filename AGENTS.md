# Agent Instructions

This repository uses **TanStack Start** (React Router + React Query + Vite) for full-stack development, **Drizzle ORM** for database, **Better Auth** for authentication, and **Tailwind CSS v4**.

## Tooling & Commands

- **Linting & Formatting**: This project uses **Biome**, not Prettier/ESLint.
  - `npm run format` (applies formatting)
  - `npm run lint` (runs lint rules)
  - `npm run check` (runs both)

- **Testing**: Tests are split into two Vitest workspaces:
  - **Client**: `npm run test:client` (uses `happy-dom`, runs `*.test.tsx`)
  - **Server**: `npm run test:server` (uses `node`, runs `*.server.test.ts`, `*.schema.test.ts`, `src/lib/**/*.test.ts`)
- **Database**: Drizzle ORM configured for PostgreSQL.
  - `npm run db:generate` / `npm run db:migrate` / `npm run db:push`
- **Shadcn UI**: Use `pnpm` to install components via the CLI:
  - `pnpm dlx shadcn@latest add <component>`

## Architecture & Conventions

- **Environment Variables**: Managed via **T3Env** in `src/env.ts`. Do not use `process.env` directly; import `env` from `#/env` (or `@/env`). Client-side variables must be prefixed with `VITE_`.
- **Imports**: The project supports path aliases `#/*` and `@/*` mapping to `./src/*`.
- **Deployment**: Powered by **Nitro** as a generic server adapter (`npm run build` outputs a standalone node server at `dist/server/index.mjs`).

## Skills

| Skill                    | Description                                                                                                                      | Location                                                     |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| `project-architecture`   | Feature-Sliced Design (FSD), global infrastructure layout, component design, routing/data loading                                | [SKILL.md](.opencode/skills/project-architecture/SKILL.md)   |
| `project-auth`           | Better Auth patterns: session management, route protection, server function auth, middleware                                     | [SKILL.md](.opencode/skills/project-auth/SKILL.md)           |
| `project-database`       | Drizzle ORM + PostgreSQL: schema management, migrations, query patterns, test fixtures, isolated transactions                    | [SKILL.md](.opencode/skills/project-database/SKILL.md)       |
| `project-error-handling` | Error handling patterns: AppError hierarchy, ZodError vs AppError hybrid model, route error boundaries, QueryClient retry config | [SKILL.md](.opencode/skills/project-error-handling/SKILL.md) |
| `project-testing`        | Vitest workspaces, TDD, React Testing Library, MSW, fixtures, co-location                                                        | [SKILL.md](.opencode/skills/project-testing/SKILL.md)        |
