# GPT Card Agent Guide

This file contains project-specific rules for coding agents working on GPT Card.
Read it before making code, database, MCP, auth, or UI changes.

## Default Agent Mode

Most project-agent requests against GPT Card should be small, targeted edits:
change copy, add or adjust a profile field, refine onboarding, update the public
card, change availability behavior, or expose a narrow MCP operation. Prefer the
smallest safe change that satisfies the user request.

Do not start routine work by mapping the whole codebase. First inspect only the
files directly related to the requested UI, API route, Prisma model, MCP tool,
feature service, or auth path. Broaden the search only when those files do not
explain the behavior.

For small changes:

1. Locate the likely feature, route, schema, or component.
2. Read the smallest surrounding context needed.
3. Edit in the existing style.
4. Run the narrowest relevant check.
5. Report what changed and what was verified.

Avoid unrelated refactors, architecture rewrites, generated-file churn, and
large exploratory edits unless the user explicitly asks. Slow down and broaden
analysis for OAuth, permissions, public booking flows, MCP write permissions,
database migrations, deployment, shared framework code, and failures that
suggest cross-module coupling.

## Common Places

- Product specification: `SPEC.md`
- App routes, layouts, route boundaries, and API adapters: `app/`
- Public JSON route handlers: `app/api/**/route.ts`
- Admin MCP endpoint adapter: `app/api/mcp/route.ts`
- Public booking MCP endpoint adapter: `app/api/public-mcp/route.ts` or the
  project-specific public MCP route
- Prisma schema and migrations: `prisma/schema.prisma`,
  `prisma/migrations/`
- Seed data: `prisma/seed.ts` or `prisma/seed.mjs`
- Profile, onboarding, booking, and availability feature modules:
  `src/features/`
- Feature validation schemas: `src/features/<feature>/schemas.ts`
- Feature business logic and Prisma writes: `src/features/<feature>/service.ts`
- Shared API/result contracts: `src/shared/api.ts`, `src/shared/result.ts`
- Shared schema parsing helpers: `src/shared/schema.ts`
- HTTP response helpers: `src/server/http.ts`
- Server infrastructure, auth, env, db, logging, audit, and file helpers:
  `src/server/`
- Typed MCP registry and tool definitions: `src/mcp/`
- App shell, providers, and public card entry points: `app/layout.tsx`,
  `app/page.tsx`, `app/(app)/`, or the app's established route groups
- Global and theme styling: `app/globals.css`, `app/mantine-provider.tsx`,
  `ui-kit/`, `src/theme/`, or `src/ui/`
- Tests: colocated `*.test.ts`, Playwright specs under `tests/` or `e2e/`

If these paths do not exist yet, create them following the OS7 template layout
instead of inventing a different structure.

## Product Shape

GPT Card lets a person create a personal business-card website for other people
to visit. The app collects profile content, a photo, weekly consultation
availability, excluded dates, and visitor consultation requests. The finished
public card must be readable by anonymous visitors.

The first usable screen for an admin who has not completed setup is onboarding.
After onboarding, the primary app experience is the finished generated page with
the user's own data and editing controls for admins.

The app must be mobile-first. Onboarding, photo upload, profile editing, weekly
availability editing, public slot selection, booking modals, and the generated
public card must work well on narrow mobile screens before desktop refinements
are considered complete.

## Access Model

Public visitors:

- can view the generated public website card anonymously
- can view available consultation slots
- can submit a consultation request for an available slot
- must never see admin-only controls
- must never edit profile content, onboarding state, availability, excluded
  dates, or request management status

Admin users:

- authenticate through OS7 OAuth
- must have the `admin` role for onboarding, editing, photo updates,
  availability changes, excluded date changes, and request management
- can edit every section of the generated website after onboarding
- can add, update, and remove weekly consultation slots
- can add and remove excluded dates

Keep public read/booking flows and admin editing flows clearly separated in UI,
API, and MCP code.

## Engineering Contract

GPT Card follows the OS7 app template architecture.

Use the same stack and conventions as the Money template:

- Next.js App Router
- React
- TypeScript
- Prisma
- MySQL as the production database
- Mantine
- OS7 UI kit
- next-intl for localization
- Zod-style runtime validation
- typed app MCP tools
- structured server logging and safe error reporting

- Use Next.js App Router only.
- Keep `app/` as route, layout, provider, route boundary, and API adapter code.
- Keep business feature modules under `src/features/<feature>/`.
- Keep server-only infrastructure under `src/server/`.
- Keep framework-neutral types, schema helpers, result contracts, and pure
  utilities under `src/shared/`.
- Keep typed MCP registry and tool definitions under `src/mcp/`.
- Use `@/features`, `@/server`, `@/shared`, and `@/mcp` path aliases instead of
  long relative imports.
- Use typed runtime validation for route, service, and MCP inputs.
- Keep public API DTO types in `src/shared/api.ts`, pure app result/error logic
  in `src/shared/result.ts`, and Next response helpers in `src/server/http.ts`.
- Public JSON APIs should use `{ ok: true, data }` and
  `{ ok: false, error: { code, message, details? } }`.
- OAuth redirects, file responses, SSE streams, and MCP JSON-RPC routes are
  documented exceptions to the JSON envelope.
- Server-only modules that touch secrets, cookies, Prisma, auth, env, events, or
  business data must import `server-only`.

## Database Rules

All app data must be stored in MySQL through Prisma. Local browser state can be
used for temporary UI interactions, but MySQL is the source of truth.

Persist:

- onboarding completion state and current step
- profile photo metadata and stored file references
- name and optional age
- professional profile
- expertise
- cases and results
- optional experience and achievements
- collaboration formats
- weekly consultation availability slots
- excluded consultation dates
- visitor consultation requests
- request review/handled status when implemented
- creation and update timestamps

When adding or changing Prisma models:

1. Update `prisma/schema.prisma`.
2. Add a MySQL migration under `prisma/migrations/`.
3. Update the related feature schema in `src/features/<feature>/schemas.ts`.
4. Update service writes, queries, serialization, audit, and realtime
   notifications in `src/features/<feature>/service.ts`.
5. Update API and MCP surfaces when the data is user-visible or agent-visible.
6. Update UI only where users directly manage or view the model.
7. Run Prisma generation, schema validation, typecheck, and relevant tests.

Do not hide missing required tables or columns with UI fallbacks. Fix the schema,
generated Prisma client, migration, and seed path instead.

## Onboarding Rules

Onboarding is required for the admin after first install.

The flow should be step-by-step and save after each step. The user must be able
to leave onboarding and continue later without losing progress.

Onboarding should collect:

- profile photo
- name
- optional age
- professional profile
- expertise
- cases and results
- optional experience and achievements
- collaboration formats
- weekly consultation availability
- excluded dates when the user wants to add them during setup

Do not turn onboarding into one large cramped form. Keep each step focused,
mobile-friendly, and resumable.

## Availability And Booking Rules

Weekly consultation availability represents recurring weekly slots, not one-off
appointments.

Excluded dates override recurring weekly availability. Examples include holidays,
public holidays, personal days off, travel days, or any date when the admin does
not want bookings.

Visitor booking must:

- show only actually available slots
- respect weekly availability and excluded dates
- account for already booked or unavailable slots when booking storage exists
- open a modal after slot selection
- collect visitor name, email, phone, and a short request description
- clearly show the selected date and time
- save the consultation request to MySQL

Validate booking requests server-side. Do not trust client-side slot state.

## MCP Rules

GPT Card has two MCP surfaces.

Admin app MCP:

- intended for the project subagent editing the website for the admin
- requires OS7 OAuth context
- requires the acting user to have the `admin` role for all writes
- can read and update profile sections
- can update the profile photo reference when an uploaded file is available
- can read, add, update, and remove weekly availability slots
- can read, add, and remove excluded dates
- can read visitor consultation requests
- can mark consultation requests reviewed or handled when request management is
  implemented

Public booking MCP:

- intended only for anonymous/public visitor booking flows
- must not expose admin settings, onboarding state, or editing tools
- can read public profile summary data needed for booking context
- can read available consultation slots
- can check whether a selected slot is still available
- can create a visitor consultation request
- cannot update profile content, weekly availability, excluded dates, onboarding
  state, or request management status

For every MCP tool:

- define a clear tool name and description
- define input schemas in the related feature schema module
- validate arguments through the feature schema/service layer
- execute business operations through the same service path used by UI/API
- return structured business objects, not UI strings
- do not expose secrets, raw environment values, tokens, cookies, or private
  provider payloads

## UI Rules

GPT Card should feel like a polished mobile-first app for creating and managing a
public personal page, not a generic admin dashboard.

Prefer Mantine and the OS7 UI kit as the UI foundation when available. Use
framework controls for forms, modals, date inputs, file upload, menus,
notifications, calendars, cards, and app shell structure before writing custom
controls.

When adding or changing UI:

- verify narrow mobile and desktop layouts
- avoid text, buttons, controls, and calendar slots overflowing or overlapping
- keep forms focused and readable
- keep public visitor flows free of admin controls
- keep admin editing controls visible only in authenticated admin contexts
- prefer skeleton states over blank pages or full-screen spinners
- use optimistic or focused refreshes for routine edits instead of full reloads

Do not use a marketing landing page as the first screen. The first screen should
be onboarding for incomplete admins, the generated card for completed admins,
and the public card for anonymous visitors.

## Logging And Audit Rules

Use the app's server logger and audit helpers instead of scattered raw
`console.log` calls in services, API routes, MCP handlers, or Prisma-heavy code.

For server operations, log stable lifecycle events where useful:

- `<operation>.started`
- `<operation>.finished`
- `<operation>.failed`

Include safe context such as `requestId`, `userId`, operation name, record type,
record id, status, and `elapsedMs`. For MCP actions, log tool name, status, and
duration, but do not dump raw arguments or full payloads when they may contain
personal data.

Never log secrets, auth tokens, cookies, OAuth codes, API keys, database
passwords, full connection strings, private headers, or unredacted environment
values.

Business mutations should write persistent audit events when the app has the
supporting model. Audit events should capture who did what, to which resource,
and when, with safe metadata.

User-facing errors should stay concise and safe. Do not expose stack traces,
provider payloads, SQL details, tokens, or implementation-specific log context in
UI/API/MCP responses.

## Verification

After code changes, run the most relevant checks available in the project.

Prefer:

- `npm run format:check`
- `npm run prisma:generate` after Prisma schema changes
- `npm run prisma:validate`
- `npm run test`
- `npm run lint`
- `npm run typecheck`
- `npm run build` when changes affect routing or production behavior
- Playwright/e2e checks after onboarding, public card, booking, or app shell UI
  changes

After Prisma schema changes:

1. Run `npm run prisma:generate`.
2. Run `npm run db:deploy` against MySQL, or the app's documented local test DB
   reset/push path.
3. Run `npm run typecheck`.
4. Run relevant tests.

Do not report success if required checks did not complete. Report exactly what
failed or could not be run.

## Generated Files

Do not intentionally edit generated framework files such as `next-env.d.ts`.
If a tool run changes generated files, treat them as generated noise unless the
change is explicitly required.

## Command Rules

When running commands through agent tools:

- use the project root by omitting `cwd` or setting `cwd` to `.`
- do not pass absolute paths as `cwd`
- if a command fails because of the tool environment, explain that failure
  plainly and try the same command again with a relative `cwd` when appropriate
