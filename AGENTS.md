# AGENTS.md — Control de Invitados

## Stack

- **Framework:** Next.js 14 (App Router) + TypeScript (`strict: true`)
- **Styling:** Tailwind CSS 3.4 with custom Material 3-like design tokens (colors: primary/secondary/tertiary/surface, font: Inter, custom spacing/border-radius, custom text sizes like `display-lg`, `headline-md`, `body-lg`, etc.)
- **Icons:** `lucide-react` only
- **Auth:** Supabase Auth (email/password) for staff; DNI+apellidos lookup against `egresados` table for graduates (no Supabase Auth, no password)
- **DB:** Supabase PostgreSQL via `@supabase/ssr@0.5` + `@supabase/supabase-js`
- **PWA:** `public/manifest.json` + `public/sw.js` (cache-first); offline-first operario panel uses localStorage queue
- **Dark mode:** `next-themes` with `attribute="class"`, `defaultTheme="light"`, `enableSystem={false}`
- **Images:** `next.config.mjs` sets `images: { unoptimized: true }` (static export compatible)

## Commands

| Action | Command |
|---|---|
| Dev | `npm run dev` |
| Build | `npm run build` |
| Start | `npm run start` |
| Lint | `npm run lint` |

No test scripts or formatter configured.

## Key dependencies

| Package | Used for |
|---|---|
| `xlsx` | Excel import/export (encargado panel) |
| `html5-qrcode` | Camera QR scanner (operario panel) |
| `qrcode.react` | QR rendering on invitation |
| `html-to-image` | Download invitation as PNG |
| `recharts` | Charts in analytics dashboard (`app/panel/analytics/`) |
| `date-fns` | Date formatting |
| `next-themes` | Class-based dark mode toggle |

## Path alias

`@/*` maps to `control-invitados/` (the Next.js project root, since `tsconfig.json` has `"paths": {"@/*": ["./*"]}`).

## Env vars

- `NEXT_PUBLIC_SUPABASE_URL` — Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — anon/publishable key
- `SUPABASE_SERVICE_ROLE_KEY` — used in server actions (`getAdminClient()`)

## Middleware

`middleware.ts` only protects `/panel/:path*` (matcher: `["/panel/:path*"]`). Unauthenticated users hitting `/panel/*` are redirected to `/staff/ingreso`. Graduate routes (`/egresado/*`) are unprotected — they use cookie-based session.

## Auth flows

- **Staff login** (`/staff/ingreso`): Supabase `signInWithPassword` → fetch `usuarios` row → extract `rol` → redirect to `/panel/{admin|encargado|operario}`
- **Role-based layouts:** `app/panel/encargado/layout.tsx` redirects `operario` to `/panel/operario`; `app/panel/admin/layout.tsx` redirects non-`admin_general` to `/panel/encargado`
- **Graduate login** (`/egresado/ingreso`): query `egresados` by DNI, fuzzy-match normalized `nombres` + `apellidos` (strip accents via `normalize("NFD")`, lowercase, trim) → set cookie `egresado_session` → redirect to `/egresado/[id]/invitados`. If same DNI matches multiple ceremonies, user picks from a list.
- **Sessions**: graduates use a cookie (no Supabase Auth), staff uses Supabase Auth session.

## Two type files — do not confuse

- `lib/types.ts` — for `client.ts` and `server.ts`
- `types/database.ts` — for `middleware.ts` only (identical content, separate location)
- Use `import { Database } from "@/lib/types"` in all app code.

## Key architecture patterns

- **All pages are `"use client"`** — no RSC for dynamic data; Supabase queries run on the browser via `@/lib/supabase/client`
- **Server actions** (`app/actions/`) use `getAdminClient()` — creates a raw `@supabase/supabase-js` client with `SUPABASE_SERVICE_ROLE_KEY`, bypasses RLS entirely. `admin_general` and `encargado` can create ceremonies; only `admin_general` can edit them.
- **`as any` casts** on Supabase queries (`(s.from("table") as any)`) are the established pattern throughout the codebase.
- **Supabase Realtime** subscriptions used in `ResumenCeremonia.tsx` (listens on `egresados` and `invitados` tables); `generateStaticParams` in `invitacion/[qr_token]/page.tsx` is hardcoded to return only the placeholder UUID.
- **`finalizarCeremonia` is destructive:** it counts guests who entered, updates ceremony state, then **deletes all `invitados` rows** for that ceremony. Only `admin_general` can delete data.
- **Operario page** (`app/panel/operario/page.tsx`) is a single 1125-line component with inline Peru timezone (`America/Lima`) formatting.
- **`capitalizarNombre` utility** at `@/app/utils/formatters` handles Spanish name capitalization (conjunctions like "de", "del", "y" are lowercased).

## Schema vs types drift

`schema.sql` is the initial reference but `lib/types.ts` has fields added later and not reflected there:
- `ceremonias` has `autoridades` JSON column and `conteo_final_invitados` (used in `finalizarCeremonia` action, absent from both schema and types)
- `egresados` has additional client-side fields: `ingreso_evento`, `toga_entregada`, `hora_toga_entregada`, `es_discurso`, `toga_devuelta`, `hora_toga_devuelta` — the `v_resumen_ceremonia` view also doesn't include the frontend-computed metrics (`egresados_con_equipo`, `togas_por_devolver`, `dnis_en_custodia`), which are fetched client-side via separate queries in `ResumenCeremonia.tsx`.

## Conventions

- UI text in **Spanish**, `lang="es"` in root layout
- Body classes: `bg-surface-container-lowest min-h-screen antialiased font-body-md text-on-surface`
- No custom CSS files — Tailwind utility classes only, using custom tokens from `tailwind.config.ts`
- Times displayed in Peru timezone (`America/Lima`) using `toLocaleString("es-PE", ...)`

## Offline & storage quirks

- Operario panel queues offline entries in `localStorage` under key `"offline_ingresos"`
- QR scanner element ID: `"qr-scanner"`
- Placeholder egresado UUID for last-minute guest registration: `00000000-0000-0000-0000-000000000000`
- `ResumenCeremonia.tsx` caches metrics in `localStorage` under `"resumen_ceremonia_cache"`

## Design references

HTML/CSS mockups at `../Interfaces/` — read the corresponding `code.html` + `screen.png` before building a new screen.

## Reference docs

- `../contexto-sistema.md` — full system context (problem, flows, roles, decisions)
- `../schema.sql` — initial schema for 6 tables (`sedes`, `usuarios`, `ceremonias`, `egresados`, `invitados`, `auditoria`) + `v_resumen_ceremonia` view
- `../rls-policies.sql` — all RLS policies with helper functions `sede_del_usuario()` and `es_admin_general()`
