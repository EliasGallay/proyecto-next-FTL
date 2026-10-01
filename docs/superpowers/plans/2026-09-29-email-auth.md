# Email Auth Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Activar los flujos de confirmación de email y recuperación de contraseña en el módulo de auth usando Supabase + Gmail SMTP ya configurado.

**Architecture:** Se agrega `emailRedirectTo` a los `signUp()` existentes para que Supabase envíe emails de confirmación. Un único Route Handler `/auth/callback` procesa los tokens PKCE de ambos flujos (confirmación y reset) y redirige según el parámetro `?next=`. El flujo de recuperación sigue el mismo patrón Client Component + Server Action del resto del módulo auth.

**Tech Stack:** Next.js 16 App Router, Supabase SSR (`@supabase/ssr`), Server Actions, react-hook-form + zod, Tailwind CSS v4, shadcn/ui (base-nova).

**Spec:** `docs/guias/guia-emails-supabase.md`, `docs/clase/prompts-replicar-sistema/09-recuperar-contrasena.md`

## Global Constraints

- `NEXT_PUBLIC_SITE_URL` sin barra al final (ej: `http://localhost:3000`)
- Card structure exacta: `relative w-full max-w-lg overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10 shadow-elevated motion-safe:animate-enter-from-below motion-safe:[animation-delay:120ms]`
- Padding de card: `p-6 sm:p-8` (mobile-first — nunca padding grande sin base mobile)
- Server Actions devuelven `{ ok: true } | { ok: false; error: string }` — mismo patrón que login/registro
- `redirect()` siempre fuera de bloques `try/catch` (Next.js lo implementa como throw)
- No usar el cliente browser (`src/lib/supabase.ts`) para mutaciones — usar `createSupabaseServerClient()` en Server Actions
- Contraseña mínimo 8 caracteres con confirmación (zod `.refine()`)
- `solicitarRecuperacion` siempre devuelve `{ ok: true }` sin importar si el email existe (no enumerar cuentas)
- No modificar archivos fuera del scope aprobado

## Review Focus

1. **`?code=` expirado o ya usado** — `exchangeCodeForSession` devuelve error; el callback debe redirigir a `/auth/login` en ese caso, no a `next`. El test: GET `/auth/callback?code=invalid` → debe redirigir a `/auth/login`.
2. **`?code=` ausente en la URL** — el callback no debe tirar; debe redirigir a `/auth/login`. El test: GET `/auth/callback` (sin params) → redirige a `/auth/login`.
3. **Contraseñas que no coinciden en el formulario** — zod `.refine()` en `nueva-contrasena-form.tsx` debe marcar error en el campo `confirm`. El test: submit con `password="abc12345"` y `confirm="xyz99999"` → `FormMessage` visible bajo confirmar.
4. **Contraseña nueva demasiado corta** — `updateUser` puede rechazarla o zod interceptarla antes. Zod valida min 8; si Supabase tiene regla más estricta, el error de `actualizarContrasena` se muestra en el formulario.
5. **`NEXT_PUBLIC_SITE_URL` no definido en producción** — `signUp` enviaría `undefined/auth/callback`. Agregar la variable tanto a `.env.example` como documentar en el README de deploy; el plan la agrega a `.env.example`.

---

### Task 1: Variable de entorno + `emailRedirectTo` en signUp

**Files:**
- Modify: `.env.example`
- Modify: `.env.local` (manual — no se commitea)
- Modify: `src/app/auth/actions.ts` — líneas 29-32 (`registrarPostulante`) y 83-86 (`registrarEmpresa`)

**Interfaces:**
- Consumes: `process.env.NEXT_PUBLIC_SITE_URL`
- Produces: ambas funciones de registro pasan `emailRedirectTo` al signUp de Supabase

- [ ] **Step 1: Agregar `NEXT_PUBLIC_SITE_URL` a `.env.example`**

Agregar al final del archivo `.env.example`:
```
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

- [ ] **Step 2: Agregar `NEXT_PUBLIC_SITE_URL` a `.env.local`**

Agregar (o verificar que ya existe) en `.env.local`:
```
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

- [ ] **Step 3: Modificar el `signUp` de `registrarPostulante` en `actions.ts`**

En `src/app/auth/actions.ts`, reemplazar el `signUp` de `registrarPostulante` (línea ~29):

```ts
const { data: authData, error } = await supabase.auth.signUp({
  email: data.email,
  password: data.password,
  options: {
    emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
  },
})
```

- [ ] **Step 4: Modificar el `signUp` de `registrarEmpresa` en `actions.ts`**

Mismo cambio para el `signUp` de `registrarEmpresa` (línea ~83):

```ts
const { data: authData, error } = await supabase.auth.signUp({
  email: data.email,
  password: data.password,
  options: {
    emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
  },
})
```

- [ ] **Step 5: Validar**

```bash
npm run lint
npm run build
```
Expected: sin errores.

---

### Task 2: Route Handler `/auth/callback`

**Files:**
- Create: `src/app/auth/callback/route.ts`

**Interfaces:**
- Consumes: `createSupabaseServerClient()` de `@/lib/supabase-server`
- Produces:
  - `GET /auth/callback?code=<token>` — intercambia code por sesión, redirige a `?next` (default `/inicio`)
  - `GET /auth/callback?code=<token>&next=/auth/nueva-contrasena` — usado por el link de reset

- [ ] **Step 1: Crear `src/app/auth/callback/route.ts`**

```ts
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { NextResponse, type NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/inicio'

  if (code) {
    const supabase = await createSupabaseServerClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/auth/login`)
}
```

- [ ] **Step 2: Validar**

```bash
npm run lint
npm run build
```
Expected: sin errores.

- [ ] **Step 3: Prueba manual (confirmación de email)**

1. Registrar una cuenta nueva con email real en `/auth/registro`.
2. Verificar que redirige a `/auth/verificar-email`.
3. Abrir el email de confirmación (revisar spam si no llega).
4. Hacer clic en el enlace → debe aterrizar en `/inicio` con sesión activa.

> Si el SMTP de Supabase aún no está configurado, ir a Authentication → Settings → deshabilitar "Confirm email" temporalmente para verificar que el callback procesa el code y redirige.

---

### Task 3: Flujo de recuperación — solicitud de reset

**Files:**
- Modify: `src/app/auth/actions.ts` — agregar `solicitarRecuperacion`
- Create: `src/components/auth/recuperar-contrasena-form.tsx`
- Create: `src/app/auth/recuperar-contrasena/page.tsx`
- Create: `src/app/auth/recuperar-contrasena/enviado/page.tsx`

**Interfaces:**
- Consumes: `createSupabaseServerClient()`, `redirect` de next/navigation
- Produces:
  - `solicitarRecuperacion(email: string): Promise<{ ok: true } | { ok: false; error: string }>`
  - `RecuperarContrasenaForm` — props: `onSubmit`, `pending`, `error`
  - `RecuperarContrasenaValues` — tipo exportado del form
  - GET `/auth/recuperar-contrasena` — página con formulario (ya tiene link en `LoginForm`)
  - GET `/auth/recuperar-contrasena/enviado` — confirmación estática

- [ ] **Step 1: Agregar `solicitarRecuperacion` al final de `actions.ts`**

Agregar antes del cierre del archivo `src/app/auth/actions.ts`:

```ts
export async function solicitarRecuperacion(email: string) {
  try {
    const supabase = await createSupabaseServerClient()
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback?next=/auth/nueva-contrasena`,
    })
    // Siempre ok — no revelar si el email existe.
    return { ok: true as const }
  } catch {
    return { ok: false as const, error: 'Error inesperado. Intentá de nuevo.' }
  }
}
```

- [ ] **Step 2: Crear `src/components/auth/recuperar-contrasena-form.tsx`**

```tsx
'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Link from 'next/link'
import { ArrowRight, LoaderCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'

const schema = z.object({
  email: z.string().email('Ingresá un email válido'),
})
export type RecuperarContrasenaValues = z.infer<typeof schema>

export function RecuperarContrasenaForm({
  onSubmit,
  pending = false,
  error = '',
}: {
  onSubmit?: (values: RecuperarContrasenaValues) => void
  pending?: boolean
  error?: string
}) {
  const form = useForm<RecuperarContrasenaValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '' },
  })

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit((values) => onSubmit?.(values))} className="mt-8 space-y-5">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel htmlFor="recuperar-email">Email</FormLabel>
              <FormControl>
                <Input id="recuperar-email" type="email" autoComplete="email" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-danger">{error}</p>
        )}

        <Button type="submit" size="lg" className="group mt-2 w-full" disabled={pending}>
          {pending
            ? <><LoaderCircle className="motion-safe:animate-spin" aria-hidden />Enviando...</>
            : <>Enviar enlace<ArrowRight className="transition-transform duration-200 group-hover:translate-x-0.75 motion-reduce:transition-none" aria-hidden /></>
          }
        </Button>

        <p className="text-center text-sm text-foreground-secondary">
          <Link
            href="/auth/login"
            className="font-semibold text-primary-600 hover:text-primary-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 rounded-sm"
          >
            Volver al inicio de sesión
          </Link>
        </p>
      </form>
    </Form>
  )
}
```

- [ ] **Step 3: Crear `src/app/auth/recuperar-contrasena/page.tsx`**

```tsx
'use client'

import { useTransition, useState } from 'react'
import { useRouter } from 'next/navigation'
import { KeyRound } from 'lucide-react'
import { RecuperarContrasenaForm, type RecuperarContrasenaValues } from '@/components/auth/recuperar-contrasena-form'
import { solicitarRecuperacion } from '../actions'

export default function RecuperarContrasenaPage() {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState('')

  function handleSubmit(values: RecuperarContrasenaValues) {
    setError('')
    startTransition(async () => {
      const result = await solicitarRecuperacion(values.email)
      if (!result.ok) setError(result.error ?? 'Error inesperado')
      else router.push('/auth/recuperar-contrasena/enviado')
    })
  }

  return (
    <div className="relative w-full max-w-lg overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10 shadow-elevated motion-safe:animate-enter-from-below motion-safe:[animation-delay:120ms]">
      <div className="p-6 sm:p-8">
        <div className="flex items-start gap-4">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary-100 text-primary-600 sm:size-12">
            <KeyRound className="size-5 sm:size-6" aria-hidden />
          </span>
          <div className="flex min-w-0 flex-col gap-1 pt-0.5">
            <h2 className="text-2xl leading-8 font-semibold tracking-tight text-foreground">Recuperar contraseña</h2>
            <p className="text-sm text-muted-foreground">
              Ingresá tu email y te enviamos un enlace para crear una nueva contraseña.
            </p>
          </div>
        </div>
        <RecuperarContrasenaForm onSubmit={handleSubmit} pending={pending} error={error} />
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Crear `src/app/auth/recuperar-contrasena/enviado/page.tsx`**

```tsx
import Link from 'next/link'
import { MailCheck } from 'lucide-react'

export default function RecuperarContrasenaEnviadoPage() {
  return (
    <div className="relative w-full max-w-lg overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10 shadow-elevated motion-safe:animate-enter-from-below motion-safe:[animation-delay:120ms]">
      <div className="p-6 sm:p-8">
        <div className="flex items-start gap-4">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary-100 text-primary-600 sm:size-12">
            <MailCheck className="size-5 sm:size-6" aria-hidden />
          </span>
          <div className="flex min-w-0 flex-col gap-1 pt-0.5">
            <h2 className="text-2xl leading-8 font-semibold tracking-tight text-foreground">Revisá tu correo</h2>
            <p className="text-sm text-muted-foreground">Te enviamos un enlace para restablecer tu contraseña.</p>
          </div>
        </div>

        <div className="mt-6 space-y-3 rounded-lg bg-primary-50 px-4 py-4 text-sm text-primary-800">
          <p>Abrí el email que te enviamos y hacé clic en el enlace para crear una nueva contraseña.</p>
          <p className="text-primary-700">Si no lo encontrás, revisá la carpeta de spam. El enlace expira en 24 horas.</p>
        </div>

        <div className="mt-6">
          <Link
            href="/auth/login"
            className="flex h-10 w-full items-center justify-center rounded-lg border border-input text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            Volver al inicio de sesión
          </Link>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Validar**

```bash
npm run lint
npm run build
```
Expected: sin errores.

---

### Task 4: Nueva contraseña — Server Action + formulario

**Files:**
- Modify: `src/app/auth/actions.ts` — agregar `actualizarContrasena`
- Create: `src/components/auth/nueva-contrasena-form.tsx`
- Create: `src/app/auth/nueva-contrasena/page.tsx`

**Interfaces:**
- Consumes: `createSupabaseServerClient()`, `redirect` de next/navigation; `NuevaContrasenaValues` del form
- Produces:
  - `actualizarContrasena(password: string): Promise<{ ok: false; error: string } | void>` — en éxito llama a `redirect('/auth/login')` (no retorna)
  - `NuevaContrasenaForm` — props: `onSubmit`, `pending`, `error`
  - `NuevaContrasenaValues` — tipo exportado del form
  - GET `/auth/nueva-contrasena` — página con formulario (destino del link del email vía `/auth/callback?next=/auth/nueva-contrasena`)

- [ ] **Step 1: Agregar `actualizarContrasena` al final de `actions.ts`**

Agregar al final de `src/app/auth/actions.ts`:

```ts
export async function actualizarContrasena(password: string) {
  try {
    const supabase = await createSupabaseServerClient()
    const { error } = await supabase.auth.updateUser({ password })
    if (error) return { ok: false as const, error: 'No se pudo actualizar la contraseña. El enlace puede haber expirado.' }
  } catch {
    return { ok: false as const, error: 'Error inesperado. Intentá de nuevo.' }
  }
  redirect('/auth/login')
}
```

> `redirect()` está fuera del try/catch porque Next.js lo implementa lanzando una excepción interna — ponerlo dentro del catch lo capturaría incorrectamente.

- [ ] **Step 2: Crear `src/components/auth/nueva-contrasena-form.tsx`**

```tsx
'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowRight, Eye, EyeOff, LoaderCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'

const schema = z
  .object({
    password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
    confirm: z.string(),
  })
  .refine((data) => data.password === data.confirm, {
    message: 'Las contraseñas no coinciden',
    path: ['confirm'],
  })
export type NuevaContrasenaValues = z.infer<typeof schema>

export function NuevaContrasenaForm({
  onSubmit,
  pending = false,
  error = '',
}: {
  onSubmit?: (values: NuevaContrasenaValues) => void
  pending?: boolean
  error?: string
}) {
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const form = useForm<NuevaContrasenaValues>({
    resolver: zodResolver(schema),
    defaultValues: { password: '', confirm: '' },
  })

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit((values) => onSubmit?.(values))} className="mt-8 space-y-5">
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel htmlFor="nueva-password">Nueva contraseña</FormLabel>
              <FormControl>
                <div className="relative">
                  <Input
                    id="nueva-password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    className="pr-11"
                    {...field}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="absolute top-0.5 right-0.5 text-foreground-secondary hover:text-primary-600"
                    aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                    aria-pressed={showPassword}
                    onClick={() => setShowPassword((v) => !v)}
                  >
                    {showPassword ? <EyeOff /> : <Eye />}
                  </Button>
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="confirm"
          render={({ field }) => (
            <FormItem>
              <FormLabel htmlFor="confirmar-password">Confirmá tu contraseña</FormLabel>
              <FormControl>
                <div className="relative">
                  <Input
                    id="confirmar-password"
                    type={showConfirm ? 'text' : 'password'}
                    autoComplete="new-password"
                    className="pr-11"
                    {...field}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="absolute top-0.5 right-0.5 text-foreground-secondary hover:text-primary-600"
                    aria-label={showConfirm ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                    aria-pressed={showConfirm}
                    onClick={() => setShowConfirm((v) => !v)}
                  >
                    {showConfirm ? <EyeOff /> : <Eye />}
                  </Button>
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-danger">{error}</p>
        )}

        <Button type="submit" size="lg" className="group mt-2 w-full" disabled={pending}>
          {pending
            ? <><LoaderCircle className="motion-safe:animate-spin" aria-hidden />Guardando...</>
            : <>Guardar contraseña<ArrowRight className="transition-transform duration-200 group-hover:translate-x-0.75 motion-reduce:transition-none" aria-hidden /></>
          }
        </Button>
      </form>
    </Form>
  )
}
```

- [ ] **Step 3: Crear `src/app/auth/nueva-contrasena/page.tsx`**

```tsx
'use client'

import { useTransition, useState } from 'react'
import { ShieldCheck } from 'lucide-react'
import { NuevaContrasenaForm, type NuevaContrasenaValues } from '@/components/auth/nueva-contrasena-form'
import { actualizarContrasena } from '../actions'

export default function NuevaContrasenaPage() {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState('')

  function handleSubmit(values: NuevaContrasenaValues) {
    setError('')
    startTransition(async () => {
      const result = await actualizarContrasena(values.password)
      if (result && !result.ok) setError(result.error ?? 'Error inesperado')
    })
  }

  return (
    <div className="relative w-full max-w-lg overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10 shadow-elevated motion-safe:animate-enter-from-below motion-safe:[animation-delay:120ms]">
      <div className="p-6 sm:p-8">
        <div className="flex items-start gap-4">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary-100 text-primary-600 sm:size-12">
            <ShieldCheck className="size-5 sm:size-6" aria-hidden />
          </span>
          <div className="flex min-w-0 flex-col gap-1 pt-0.5">
            <h2 className="text-2xl leading-8 font-semibold tracking-tight text-foreground">Nueva contraseña</h2>
            <p className="text-sm text-muted-foreground">Elegí una contraseña segura para tu cuenta.</p>
          </div>
        </div>
        <NuevaContrasenaForm onSubmit={handleSubmit} pending={pending} error={error} />
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Validar**

```bash
npm run lint
npm run build
```
Expected: sin errores.

- [ ] **Step 5: Prueba manual del flujo completo**

1. Ir a `/auth/login` → clic en "¿Olvidaste tu contraseña?".
2. Verificar que abre `/auth/recuperar-contrasena`.
3. Ingresar un email registrado → enviar.
4. Verificar que redirige a `/auth/recuperar-contrasena/enviado`.
5. Abrir el email → clic en el enlace.
6. Verificar que aterriza en `/auth/nueva-contrasena`.
7. Ingresar contraseñas que no coinciden → verificar que zod muestra el error en el campo.
8. Ingresar una contraseña válida → guardar.
9. Verificar que redirige a `/auth/login`.
10. Iniciar sesión con la nueva contraseña → confirmar que funciona.
