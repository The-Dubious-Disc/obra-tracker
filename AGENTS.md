# Obra Tracker

Construction-project tracker (obra). Next.js App Router app on Vercel. The production branch is `master`; a merge to `master` deploys. Do not merge unless asked, and do not change product behavior, API responses, UI, or deploy config unless that is the task.

## Stack

- Next.js 15 (App Router) and React 19, TypeScript, Tailwind
- Drizzle ORM on Neon Postgres (`@neondatabase/serverless`, HTTP driver)
- Session auth: bcrypt passwords, HS256 JWT in the `session` cookie (`jose`)
- Zod request schemas, Resend email, Cloudflare R2 for files
- Package manager: npm (`package-lock.json`)

## Commands

```bash
npm run dev        # http://localhost:3000
npm test           # Vitest, no database required
npm run test:watch
npm run lint
npm run build
```

Tests live in `tests/` and mock `@/lib/db`. They do not need `DATABASE_URL`. `tsconfig.json` excludes `tests/` so `next build` does not typecheck the suite. Vitest is pinned to 3.2.4 because Vitest 5 peer-depends on `@types/node` 22 or newer, and `npm ci` (CI and Vercel) fails that conflict against this repo's `@types/node` 20. Leave the app tsconfig on `jsx: preserve`; the Vitest config compiles test JSX itself.

CI is `.github/workflows/ci.yml` (`npm ci`, `npm test`, `npm run lint`) on pull requests and pushes to `master`.

## Environment

Copy nothing into git. `.env*` is ignored. Runtime reads:

| Variable | Required | Notes |
| --- | --- | --- |
| `DATABASE_URL` | yes, at runtime | Neon connection string. If it is missing during `next build`, the db client uses a dummy URL and logs a warning. `drizzle.config.ts` throws without it. |
| `JWT_SECRET` | yes, in production | If unset, tokens are signed with a hardcoded development fallback. Set a long random secret before deploying. |
| `NEXT_PUBLIC_APP_URL` | for real emails | Base URL for invitation and password-reset links. Do not add a trailing slash. |
| `RESEND_API_KEY` | no | Without it, email is logged and reported as `{ success: true, mock: true }`. Sender is `Obra Tracker <obratracking@cheto.club>`. |
| `R2_ACCESS_KEY_ID`, `R2_ACCESS_KEY_SECRET`, `R2_ACCOUNT_ID`, `R2_BUCKET`, `R2_ENDPOINT` | for uploads | `R2_REGION` defaults to `auto`. |

`next.config.mjs` fails the build on TypeScript errors and ignores ESLint during the Vercel build. `npm run lint` is still the check that catches lint.

## Auth and access

- Middleware (`src/middleware.ts`) verifies the `session` cookie and sets `x-user-id` and `x-user-role`. Route handlers read those headers. They do not re-read the cookie.
- Public pages: `/login`, `/register`, `/recover-password`, `/reset-password`. Public APIs: `/api/auth/login`, `register`, `logout`, `recover-password`, `reset-password`. Prefixes `/invitations` and `/api/invitations` are public. A new route under those prefixes is unauthenticated.
- `/_next`, `/favicon`, and `/images` skip the auth check inside middleware.
- `/admin` redirects non-admins to `/`.
- Account roles and project roles are both `admin` \| `editor` \| `viewer`. The JWT type also allows legacy `cliente` and `constructor` values. Project permissions use `proyecto_miembros`, not the account role. `checkProjectRole` defaults to admin and editor.
- `POST /api/auth/register` always creates a `viewer`. A `rol` in the body is ignored.
- Login lowercases the email only after Zod accepts it. Leading or trailing spaces fail validation and are not trimmed first. Invitation acceptance compares the account email to the invited email with exact string equality, so case differs.
- Unknown emails on password recovery return success and send nothing. Reset tokens last 1 hour. Invitation tokens last 7 days.
- Login is limited to 5 requests per 15 minutes per IP in process memory. On Vercel that limit is per instance and resets when the instance does.
- The session cookie lasts 7 days, `httpOnly`, `sameSite: lax`, and `secure` only when `NODE_ENV === 'production'`.

## Domain rules worth preserving

- Creating a project requires at least one etapa, a task description on every etapa, and percentages that sum to exactly `100`. The owner membership is `admin`. Stage amounts are `presupuesto * porcentaje / 100`, stored with two decimal places. Default currency inside `createProject` is `UYU` when the caller omits it; the Zod schema default is `USD`.
- `PUT /api/projects/[id]/budget` is admin-only. `newAmount` of `0` is rejected (`!newAmount`), even though `updateBudgetSchema` allows `0`. `distributeProportionally` is passed through `Boolean(...)`, so the string `"false"` is true. Omitted notes become `Updated via API`.
- Progress in `getProjectSummary` weights each etapa by `duracionEstimadaJornales` (null counts as 0) and each adicional as 5 jornales. A completed stage with null jornales does not move the percentage. `presupuestoTotalCalculado` is the sum of stage amounts and adicional amounts, separate from `montoTotalActivo`.
- `addEtapa` sets `orden` to the current stage count plus one, not max(orden) + 1.
- Payments cannot reference an etapa and an adicional together. Only admin and editor can create them. Stored R2 keys are presigned on read; `http...` URLs and `/uploads...` paths are not. Download keys must contain `projects/<projectId>/...` and the caller must be a member of that project.
- Pendientes keep `titulo`, `descripcion` (shown as detalle), and `estado` (`pendiente` | `completado`). There is no due date: `db/migrations/0008_drop_pendiente_vencimiento.sql` drops `fecha_vencimiento`. Photos are rows in `pendiente_fotos` (`db/migrations/0007_add_pendiente_fotos.sql`): up to 10 images, 10 MB each, stored at `obratracker/projects/<projectId>/pendientes/...` with upload kind `pendientes`. A photo key from another project is rejected. Create, edit, delete, and photo changes use `checkProjectAccess`, the same membership check as the original pendiente routes. `GET /api/projects/[id]/pendientes?estado=pendiente` is the sidebar count and does not sign photo URLs. `GET /api/projects/[id]/pendientes/pdf` returns one PDF of open pendientes only (`estado = pendiente`), with title, detail, status, and embedded photos. Completed items stay on the list and are excluded from the PDF.
- The Neon HTTP driver does not support interactive transactions. `seedProject` writes sequentially on purpose.

## Data and scripts

- Schema: `src/lib/db/schema.ts`. SQL migrations: `db/migrations/`. Drizzle config: `drizzle.config.ts`.
- `scripts/seed-punta-colorada.ts` and `punta-colorada.json` seed a sample project. They write to whatever `DATABASE_URL` points at.
- `npm run prepare` runs Husky. There is no `.husky/` directory in the repo; do not add hooks unless asked.

## Tests

Cover auth, invitations, budget and progress math, project and payment authorization, download keys, and the project/role UI state. Add a regression next to the behavior you change. Prefer mocking `@/lib/db` or the service module over a live database. Do not weaken a test to match an accidental behavior change.
