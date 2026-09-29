# Prompt 09 — Módulo de recuperación de contraseña

```
Eres un desarrollador senior de Next.js 16 trabajando en el "Portal Municipal de Empleo".

<context>
El módulo de autenticación ya está implementado. Las rutas `/auth/login`, `/auth/registro` y
`/auth/verificar-email` existen y funcionan. El login form ya tiene un link a
`/auth/recuperar-contrasena` que todavía no existe — hay que construirlo.

Stack y patrones establecidos:
- Next.js 16 App Router, TypeScript, Tailwind CSS v4, shadcn/ui (base-nova / Base UI React)
- Supabase con `@supabase/ssr` — cliente server-side en `src/lib/supabase-server.ts`
- Server Actions en `src/app/auth/actions.ts` con `'use server'`
- Patrón de retorno de todos los Server Actions: `{ ok: true } | { ok: false; error: string }`
- Formularios con react-hook-form + zod + componentes de `@/components/ui/form`
- Layout compartido: `src/app/auth/layout.tsx` renderiza `AuthShell` (panel institucional +
  sección derecha). Las páginas bajo `/auth/` solo devuelven su card — sin wrappers extra.

Estructura de card para páginas auth (copiar exactamente):
  <div className="relative w-full max-w-lg overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10 shadow-elevated motion-safe:animate-enter-from-below motion-safe:[animation-delay:120ms]">
    <div className="p-6 sm:p-8">
      <div className="flex items-start gap-4">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary-100 text-primary-600 sm:size-12">
          <IconComponent className="size-5 sm:size-6" aria-hidden />
        </span>
        <div className="flex min-w-0 flex-col gap-1 pt-0.5">
          <h2 className="text-2xl leading-8 font-semibold tracking-tight text-foreground">Título</h2>
          <p className="text-sm text-muted-foreground">Descripción breve.</p>
        </div>
      </div>
      {/* contenido / formulario */}
    </div>
  </div>

Variable de entorno requerida (agregar si no existe): `NEXT_PUBLIC_SITE_URL` con la URL base
del sitio (ej: `http://localhost:3000` en desarrollo, la URL de producción en prod).
</context>

<instructions>
Implementar el flujo completo de recuperación de contraseña en dos etapas:

Etapa 1 — Solicitud:
1. El usuario va a `/auth/recuperar-contrasena`, ingresa su email y envía el formulario.
2. El Server Action `solicitarRecuperacion` llama a
   `supabase.auth.resetPasswordForEmail(email, { redirectTo: SITE_URL + '/auth/callback?next=/auth/nueva-contrasena' })`.
3. Siempre redirige a `/auth/recuperar-contrasena/enviado` (no revelar si el email existe o no).

Etapa 2 — Nueva contraseña:
4. El link del email lleva a `/auth/callback?code=xxx&next=/auth/nueva-contrasena`.
5. El Route Handler en `/auth/callback` intercambia el code por sesión con
   `supabase.auth.exchangeCodeForSession(code)` y redirige a `next`.
6. El usuario llega a `/auth/nueva-contrasena` con una sesión de recuperación activa.
7. El Server Action `actualizarContrasena` llama a
   `supabase.auth.updateUser({ password: nuevaContrasena })` y redirige a `/auth/login`.
</instructions>

<rules>
- El Server Action `solicitarRecuperacion` siempre retorna `{ ok: true }` aunque el email no
  exista — evitar enumerar cuentas.
- Validar la nueva contraseña en el formulario: mínimo 8 caracteres, confirmar contraseña
  debe coincidir (refine de zod).
- El Route Handler `/auth/callback` debe manejar el caso en que `code` no esté presente o
  `exchangeCodeForSession` falle — redirigir a `/auth/login` en ese caso.
- No crear un nuevo cliente Supabase en el cliente (browser). Las mutaciones van en Server
  Actions que usan `createSupabaseServerClient()`.
- Las páginas son mobile-first: `p-6 sm:p-8` en la card, nunca padding fijo grande sin base
  mobile. El layout ya centra el contenido — la página solo devuelve la card.
- Iconos sugeridos de lucide-react: `KeyRound` para recuperar contraseña, `MailCheck` ya
  existe en verificar-email (reutilizar el mismo para "enviado"), `ShieldCheck` para nueva
  contraseña.
- No modificar archivos fuera del scope: no tocar el login form existente, no cambiar
  `AuthShell`, no tocar otras páginas auth.
</rules>

<examples>
<example name="Server Action solicitarRecuperacion">
export async function solicitarRecuperacion(email: string) {
  try {
    const supabase = await createSupabaseServerClient()
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback?next=/auth/nueva-contrasena`,
    })
    // siempre ok — no revelar si el email existe
    return { ok: true }
  } catch {
    return { ok: false, error: 'Error inesperado. Intentá de nuevo.' }
  }
}
</example>

<example name="Route Handler /auth/callback">
import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'

export async function GET(request: Request) {
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
</example>

<example name="Server Action actualizarContrasena">
export async function actualizarContrasena(password: string) {
  try {
    const supabase = await createSupabaseServerClient()
    const { error } = await supabase.auth.updateUser({ password })
    if (error) return { ok: false, error: 'No se pudo actualizar la contraseña' }
    redirect('/auth/login')
  } catch {
    return { ok: false, error: 'Error inesperado. Intentá de nuevo.' }
  }
}
</example>
</examples>

<output>
Archivos a crear o modificar:

1. `src/app/auth/actions.ts` — agregar `solicitarRecuperacion` y `actualizarContrasena`
   (no modificar las acciones existentes).

2. `src/app/auth/callback/route.ts` — Route Handler GET para intercambio de code PKCE.

3. `src/components/auth/recuperar-contrasena-form.tsx` — Client Component con:
   - Campo email (type email, autoComplete="email")
   - Validación zod: email válido
   - Estado pending, prop error, prop onSubmit
   - Botón submit con LoaderCircle mientras pending
   - Link "Volver al inicio de sesión" → /auth/login

4. `src/app/auth/recuperar-contrasena/page.tsx` — Client Component que:
   - Llama a `solicitarRecuperacion` en un useTransition
   - Renderiza `<RecuperarContrasenaForm>` en la card
   - Icono: `KeyRound`

5. `src/app/auth/recuperar-contrasena/enviado/page.tsx` — Server Component (sin 'use client'):
   - Card estática informando que se envió el email con el link
   - Mismo patrón visual que `/auth/verificar-email`
   - Link "Volver al inicio de sesión" → /auth/login

6. `src/components/auth/nueva-contrasena-form.tsx` — Client Component con:
   - Campo nueva contraseña con toggle mostrar/ocultar (igual que en registro)
   - Campo confirmar contraseña con el mismo toggle
   - Validación zod: min 8 caracteres, .refine() para que coincidan
   - Estado pending, prop error, prop onSubmit

7. `src/app/auth/nueva-contrasena/page.tsx` — Client Component que:
   - Llama a `actualizarContrasena` en un useTransition
   - Renderiza `<NuevaContrasenaForm>` en la card
   - Icono: `ShieldCheck`
</output>
```
