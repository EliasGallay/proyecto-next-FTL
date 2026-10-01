# CLAUDE.md

This file provides mandatory guidance to Claude Code when working with
code in this repository.

@AGENTS.md

## Commands

``` bash
npm run dev      # start dev server (http://localhost:3000)
npm run build    # production build
npm run lint     # ESLint (eslint-config-next)
```

No test runner is currently configured.

------------------------------------------------------------------------

## Architecture

**Portal Municipal de Empleo** --- a Next.js 16 App Router project in
Spanish.

All source lives under `src/`. The path alias `@/*` resolves to `src/*`.

### Routes

  ------------------------------------------------------------------------------------------------
  Path                   File                                       Notes
  ---------------------- ------------------------------------------ ----------------------------
  `/`                    `src/app/page.tsx`                         Home (public)

  `/auth/login`          `src/app/auth/login/page.tsx`              Login — redirects to `/inicio`
                                                                     on success

  `/auth/registro`       `src/app/auth/registro/page.tsx`           Registration (postulante /
                                                                     empresa)

  `/auth/verificar-email` `src/app/auth/verificar-email/page.tsx`   Post-signup confirmation page

  `/inicio`              `src/app/(dashboard)/inicio/page.tsx`      Authenticated landing page
                                                                     (welcome banner)

  `/empresa`             `src/app/empresa/page.tsx`                 Company dashboard

  `/admin`               `src/app/admin/page.tsx`                   Admin dashboard

  `/ofertas`             `src/app/ofertas/page.tsx`                 Job listings

  `/ofertas/[id]`        `src/app/ofertas/[id]/page.tsx`            Job detail (dynamic)

  `/saludo`              `src/app/saludo/page.tsx`                  Client component fetching
                                                                     `/api/saludo`

  `/api/saludo`          `src/app/api/saludo/route.ts`              Route Handler
  ------------------------------------------------------------------------------------------------

### Route groups

`src/app/(dashboard)/` wraps authenticated pages and provides the
sidebar layout (`src/components/layout/sidebar.tsx`). Its `layout.tsx`
reads the session server-side and redirects to `/auth/login` if there
is no authenticated user. Pages under `/empresa` and `/admin` should
be moved into this group when their authenticated views are built.

Do not invent new architectural patterns when an existing repository
pattern already solves the same problem.

------------------------------------------------------------------------

## Next.js 16

This project may use APIs and conventions newer than Claude's training
knowledge.

Before implementing or modifying Next.js-specific behavior, read the
relevant documentation under:

`node_modules/next/dist/docs/`

The documentation installed with the project's Next.js version is the
source of truth.

Do not rely on remembered Next.js behavior when the installed
documentation differs.

This applies especially to:

-   App Router
-   Server Components
-   Client Components
-   Route Handlers
-   Server Actions
-   caching
-   revalidation
-   cookies
-   headers
-   authentication integration
-   middleware/proxy behavior

### Known breaking changes

-   **`params` is a Promise** in dynamic route segments --- always
    `await params` before destructuring.
-   **Layout props** use `LayoutProps<"/">` imported from `next`, not a
    manually typed `{ children: ReactNode }`. The generic parameter is
    constrained to `"/"` — other path strings cause a type error.
-   Heed deprecation notices in the installed documentation.

------------------------------------------------------------------------

## Server Components and Client Components

Prefer Server Components by default.

Add `"use client"` only when client-side behavior is actually required,
such as:

-   React state
-   effects
-   event handlers
-   browser APIs
-   client-only libraries

Do not convert an entire page or layout to a Client Component merely
because one nested component requires client-side behavior.

Keep the client boundary as small as practical.

------------------------------------------------------------------------

## Route Handlers / REST API

HTTP endpoints use Next.js Route Handlers under:

`src/app/api/**/route.ts`

Examples:

``` text
src/app/api/ofertas/route.ts
src/app/api/ofertas/[id]/route.ts
src/app/api/postulaciones/route.ts
```

Use Route Handlers when an actual HTTP boundary is required, including:

-   REST endpoints
-   external integrations
-   webhooks
-   endpoints consumed by another application
-   public or programmatic HTTP interfaces

Do not introduce:

-   Express
-   a separate Node.js API
-   a custom HTTP server

unless explicitly requested.

Before creating a Route Handler:

1.  inspect existing Route Handlers;
2.  follow existing naming conventions;
3.  follow existing validation conventions;
4.  follow existing response/error conventions;
5.  verify the relevant Next.js documentation.

Do not put substantial reusable business logic directly in `route.ts`.

Route Handlers should act primarily as an HTTP boundary.

------------------------------------------------------------------------

## Server Actions

Server Actions may be used for server-side operations initiated directly
by the Next.js application UI.

When Server Actions for a feature are grouped into a dedicated file,
use:

`actions.ts`

and declare:

``` ts
"use server";
```

Examples:

``` text
src/app/ofertas/actions.ts
src/app/empresa/actions.ts
src/app/admin/actions.ts
```

Do not invent alternative names such as:

-   `server.ts`
-   `mutations.ts`
-   `handlers.ts`

unless the repository already has an established convention requiring
it.

### When to use Server Actions

Server Actions are appropriate for UI-originated server mutations such
as:

-   form submissions
-   creating records
-   updating records
-   deleting records
-   changing workflow state
-   authenticated operations originating from this Next.js application

### Server Actions vs Route Handlers

Do not create a REST endpoint only so a Server Action from the same
application can call it.

Avoid:

``` text
UI
  ↓
Server Action
  ↓
fetch("/api/...")
  ↓
Route Handler
  ↓
Database
```

when no independent HTTP boundary is required.

Prefer:

``` text
UI
  ↓
Server Action
  ↓
shared server/business/data-access logic
  ↓
Supabase
```

When an HTTP API is required:

``` text
External consumer
  ↓
Route Handler
  ↓
shared server/business/data-access logic
  ↓
Supabase
```

Both entry points may reuse the same underlying logic.

Do not duplicate business logic between `actions.ts` and `route.ts`.

Do not convert existing Route Handlers to Server Actions, or Server
Actions to Route Handlers, unless explicitly requested.

------------------------------------------------------------------------

## Server-side security

Treat both Route Handlers and Server Actions as server entry points.

Never assume an operation is authorized merely because its UI is
protected.

Validate authorization server-side.

Do not trust client-provided values for authorization decisions when
they can be derived server-side, including:

-   user ID
-   role
-   company ID
-   ownership
-   authorization state

Validate external input at the server boundary.

Never expose secrets or privileged Supabase credentials to client-side
code.

------------------------------------------------------------------------

## Supabase

Supabase is used for database and authentication infrastructure.

Respect the distinction between the two server-side clients:

-   `supabaseAdmin` (`src/lib/supabase-admin.ts`) — uses the service
    role key; **bypasses RLS entirely**. Use only in Server Actions and
    Route Handlers for operations that must not be subject to row-level
    policies (e.g. creating a user profile after signup).
-   `createSupabaseServerClient()` (`src/lib/supabase-server.ts`) —
    uses the publishable key with the user's session cookies; **respects
    RLS**. Use for reading data on behalf of the authenticated user.

Never expose:

-   service role keys
-   database passwords
-   private access tokens
-   server-only credentials

to client-side code.

Do not bypass Row Level Security as a shortcut.

### Database migrations

When the Supabase migration workflow is configured, database schema
changes must be represented by migrations.

Migration files belong under:

``` text
src/migrations/
```

Do not modify unrelated database structures while implementing a
feature.

Do not rewrite previously applied migrations unless explicitly required
and approved.

Prefer creating a new migration for schema changes.

------------------------------------------------------------------------

## Responsive design

This project is **mobile-first**.

-   Design and implement every screen for mobile (≥ 320px) first, then
    enhance for larger breakpoints with Tailwind's `sm:`, `md:`, `lg:`
    prefixes.
-   Never use fixed widths or large padding values (e.g. `p-8`,
    `px-10`) without a mobile-safe base (e.g. `p-4 sm:p-8`).
-   Layouts that require multiple columns must stack vertically on
    mobile by default.
-   Touch targets must be at least 44 × 44 px.
-   Test every new screen at 375px viewport width before considering it
    complete.

------------------------------------------------------------------------

## Styling

-   Tailwind CSS v4 is imported as `@import "tailwindcss"` in
    `globals.css`.
-   There is no `tailwind.config.*` file.
-   CSS custom properties for the brand palette are defined in `:root`
    in `globals.css`.
-   `src/app/empresa/empresa.styles.css` currently holds route-scoped
    styles.

### Design System

The visual source of truth for this project is:

`DESIGN_SYSTEM_Portal_Municipal_Empleo.md`

Read it before implementing or modifying UI.

All UI changes must respect the design system unless the user explicitly
requests a deviation.

Prefer Tailwind utilities when an equivalent utility exists.

Do not scatter hardcoded design-system colors throughout components.

Do not introduce arbitrary visual values when an existing design token
solves the same problem.

Do not redesign unrelated screens while implementing a task.

------------------------------------------------------------------------

## UI components

The project uses shadcn/ui with `base-nova` style backed by **Base UI
React** (`@base-ui/react`), not Radix UI.

Add components with:

``` bash
npx shadcn add <component>
```

Configuration lives in:

`components.json`

`cn()` is re-exported from the `cn` package via:

`@/lib/utils`

Before creating a new UI component:

1.  check whether an existing shared component already solves the
    problem;
2.  check whether shadcn/ui provides an appropriate primitive;
3.  prefer composition over duplication.

Do not duplicate shared components for different roles when props or
composition can express the difference.

Use the project's established icon library consistently.

------------------------------------------------------------------------

## Scope discipline

Implement only the requested scope.

Do not perform unrelated:

-   refactors
-   cosmetic cleanup
-   dependency upgrades
-   architecture migrations
-   file reorganizations
-   renames
-   design changes

unless explicitly requested.

Do not modify files outside the approved implementation scope unless
they are technically required for the requested change.

If implementation reveals an ambiguity that affects:

-   behavior
-   architecture
-   permissions
-   data
-   security
-   scope

stop and report the ambiguity before continuing.

Do not silently choose between materially different behaviors.

------------------------------------------------------------------------

## Dependencies

Do not install, remove, or upgrade dependencies unless required by the
requested implementation.

Before introducing a significant new dependency, verify that the
existing stack cannot reasonably solve the requirement.

Do not update unrelated dependencies.

------------------------------------------------------------------------

## Code comments

Do not add comments that merely narrate obvious code.

Avoid comments such as:

``` ts
// Get user
// Create job
// Return response
```

Comments are appropriate for:

-   non-obvious business rules
-   important constraints
-   unusual technical decisions
-   behavior that would otherwise be difficult to understand

Do not add comments stating that code was generated or modified by
Claude or AI.

Do not remove existing useful comments unless they are no longer
correct.

------------------------------------------------------------------------

## Git rules

### Commits

**NEVER create a Git commit unless the user explicitly asks for a
commit.**

Completing an implementation does NOT authorize a commit.

Instructions such as:

-   "implement this"
-   "fix this"
-   "make the changes"
-   "finish the ticket"
-   "run the tests"
-   "prepare this for review"

do NOT authorize `git commit`.

Only an explicit instruction such as:

-   "commit this"
-   "create the commit"
-   "make a git commit"

authorizes a commit.

Without explicit commit authorization:

1.  make the requested changes;
2.  run the appropriate validations;
3.  report the changed files;
4.  report validation results;
5.  leave the changes uncommitted.

### Push

**NEVER run `git push` unless explicitly requested.**

Permission to commit does NOT imply permission to push.

### Branches

Do not create, rename, delete, or switch branches unless explicitly
requested.

### Destructive Git operations

Never discard user changes without explicit approval.

Do not run destructive commands such as:

``` bash
git reset --hard
git clean -fd
git checkout -- .
git restore .
```

without explicit authorization.

------------------------------------------------------------------------

## AI attribution

Never add Claude, Anthropic, or AI attribution to repository content or
Git history.

This includes:

-   commits
-   commit bodies
-   pull requests
-   merge requests
-   source files
-   code comments
-   documentation
-   changelogs

Never add text such as:

``` text
Generated with Claude Code
Generated by Claude
AI-generated
```

Never add a Claude/Anthropic co-author trailer such as:

``` text
Co-Authored-By: Claude ...
```

When the user explicitly requests a commit, use the repository's normal
commit conventions without AI attribution.

------------------------------------------------------------------------

## Validation

Before considering an implementation complete, run the validations
relevant to the changed scope.

Available project commands:

``` bash
npm run lint
npm run build
```

No test runner is currently configured.

Do not claim that a validation passed unless it was actually executed
successfully.

If a validation cannot be executed, report the reason.

Do not fix unrelated lint/build problems unless they prevent validation
of the requested work. Report unrelated failures separately.

------------------------------------------------------------------------

## Final implementation report

After completing an implementation, report:

1.  what changed;
2.  files modified;
3.  important implementation decisions;
4.  validations executed;
5.  validation results;
6.  anything pending or blocked.

Do not commit or push as part of finalization unless explicitly
requested.
