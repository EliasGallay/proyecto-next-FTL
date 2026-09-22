# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

```bash
npm run dev      # start dev server (http://localhost:3000)
npm run build    # production build
npm run lint     # ESLint (eslint-config-next)
```

No test runner is configured.

## Architecture

**Portal Municipal de Empleo** — a Next.js 16 App Router project in Spanish.

All source lives under `src/`. The path alias `@/*` resolves to `src/*`.

### Routes

| Path | File | Notes |
|------|------|-------|
| `/` | `src/app/page.tsx` | Home |
| `/ofertas` | `src/app/ofertas/page.tsx` | Job listings |
| `/ofertas/[id]` | `src/app/ofertas/[id]/page.tsx` | Job detail (dynamic) |
| `/empresa` | `src/app/empresa/page.tsx` | Company dashboard |
| `/admin` | `src/app/admin/page.tsx` | Admin dashboard |
| `/saludo` | `src/app/saludo/page.tsx` | Client component fetching `/api/saludo` |
| `/api/saludo` | `src/app/api/saludo/route.ts` | Route Handler |

### Key Next.js 16 breaking changes

- **`params` is a Promise** in dynamic route segments — always `await params` before destructuring.
- **Layout props** use the `LayoutProps<"/path">` type (imported from `next`), not a manually typed `{ children: ReactNode }`.
- Read `node_modules/next/dist/docs/` before writing any Next.js-specific code.

### Styling

- Tailwind CSS v4: imported as `@import "tailwindcss"` in `globals.css` — no `tailwind.config.*` file.
- CSS custom properties for the brand palette are defined in `:root` in `globals.css` (`--teal`, `--ink`, `--paper`, etc.).
- `src/app/empresa/empresa.styles.css` holds route-scoped styles.

### UI components

- shadcn/ui with `base-nova` style backed by **Base UI React** (`@base-ui/react`), not Radix UI.
- Add components via `npx shadcn add <component>` — config is in `components.json`.
- `cn()` is re-exported from the `cn` package via `@/lib/utils`.
