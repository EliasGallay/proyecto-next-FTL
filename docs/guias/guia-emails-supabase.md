# Guía de Emails con Supabase + Gmail SMTP

## Cómo funciona el sistema de emails de Supabase

Supabase envía emails automáticamente en ciertos eventos de autenticación:

- **Confirmación de registro** — al crear una cuenta nueva
- **Recuperación de contraseña** — cuando el usuario solicita un reset
- **Cambio de email** — al actualizar el email de la cuenta
- **Magic link** — login sin contraseña (si se habilita)

Por defecto, Supabase usa su propio servidor de email con un límite de **2 emails por hora**. Eso sirve para probar que el flujo funciona, pero no para desarrollo real. La solución es configurar tu propio servidor SMTP — en este caso, una cuenta de Gmail.

---

## Configurar Gmail para envío SMTP

Gmail no permite usar tu contraseña normal para SMTP. Requiere una **App Password** (contraseña de aplicación), que es una clave de 16 caracteres generada específicamente para esto.

### Paso 1 — Activar la verificación en dos pasos

Las App Passwords solo están disponibles si tenés 2FA activo en tu cuenta de Google.

1. Ir a [myaccount.google.com](https://myaccount.google.com)
2. **Seguridad** → **Verificación en dos pasos**
3. Seguir los pasos para activarla si no está activa

### Paso 2 — Generar una App Password

1. Ir a [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)
2. En **Seleccionar app** elegir **Correo**
3. En **Seleccionar dispositivo** elegir **Otro (nombre personalizado)** → escribir `Supabase`
4. Hacer click en **Generar**
5. Copiar la clave de 16 caracteres que aparece (ej: `abcd efgh ijkl mnop`)

> Guardala en un lugar seguro — Google solo la muestra una vez. Si la perdés, tenés que generar una nueva.

---

## Configurar SMTP en Supabase

1. Ir al dashboard de Supabase → tu proyecto
2. **Authentication** → **Settings** → sección **SMTP Settings**
3. Activar **Enable Custom SMTP**
4. Completar los campos:

| Campo | Valor |
|---|---|
| **Host** | `smtp.gmail.com` |
| **Port** | `587` |
| **Minimum TLS version** | `TLSv1.2` |
| **Username** | tu dirección de Gmail (ej: `tucuenta@gmail.com`) |
| **Password** | la App Password generada en el paso anterior (sin espacios) |
| **Sender email** | tu dirección de Gmail |
| **Sender name** | el nombre que van a ver los destinatarios (ej: `Portal Municipal de Empleo`) |

5. Hacer click en **Save**

### Verificar que funciona

En la misma sección hay un botón **Send test email**. Ingresar una dirección de destino y verificar que llega. Si no llega, revisar la sección de errores al final de esta guía.

---

## Configurar las URLs de redirección

Cuando Supabase envía un email con un link (confirmación, reset de contraseña), ese link lleva al usuario de vuelta a tu app. Hay que decirle a Supabase cuál es la URL base.

1. **Authentication** → **URL Configuration**
2. Completar **Site URL**:
   - En desarrollo: `http://localhost:3000`
   - En producción: `https://tu-dominio.com`
3. En **Redirect URLs** agregar las URLs permitidas:
   ```
   http://localhost:3000/**
   https://tu-dominio.com/**
   ```

> En producción, reemplazá `localhost:3000` con la URL real del deploy.

---

## Flujo de confirmación de registro

Cuando un usuario se registra con `signUp()`, Supabase envía un email con un link de confirmación. El usuario hace click y aterriza en tu app con un token en la URL.

### Ruta de callback

Hay que crear una ruta que procese ese token:

```ts
// src/app/auth/callback/route.ts
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { NextResponse, type NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (code) {
    const supabase = await createSupabaseServerClient()
    await supabase.auth.exchangeCodeForSession(code)
  }

  return NextResponse.redirect(`${origin}/`)
}
```

### Registrar la URL de callback en Supabase

En **Authentication** → **URL Configuration** → **Redirect URLs** agregar:

```
http://localhost:3000/auth/callback
```

### Configurar la redirección en el signUp

```ts
// src/app/auth/actions.ts
export async function registrar(formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  const supabase = await createSupabaseServerClient()

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
    },
  })

  if (error) {
    redirect('/auth/registro?error=' + encodeURIComponent(error.message))
  }

  redirect('/auth/verificar-email')
}
```

Agregar la variable al `.env.local`:

```env
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

En producción cambiarla por la URL real del deploy.

### Página de "verificá tu email"

```tsx
// src/app/auth/verificar-email/page.tsx
export default function VerificarEmailPage() {
  return (
    <main className="min-h-screen flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-md px-10 py-8 flex flex-col items-center gap-3 max-w-sm text-center">
        <span className="text-4xl">📧</span>
        <h1 className="text-xl font-semibold text-gray-800">Revisá tu email</h1>
        <p className="text-sm text-gray-500">
          Te enviamos un link de confirmación. Hacé click en el link para activar tu cuenta.
        </p>
      </div>
    </main>
  )
}
```

---

## Flujo de recuperación de contraseña

### Paso 1 — El usuario pide el reset

```ts
// src/app/auth/actions.ts
export async function solicitarResetContrasena(formData: FormData) {
  const email = formData.get('email') as string

  const supabase = await createSupabaseServerClient()

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/nueva-contrasena`,
  })

  // Siempre redirigir al mismo lugar, independientemente de si el email existe
  // (no revelar si una cuenta existe o no)
  redirect('/auth/reset-enviado')
}
```

```tsx
// src/app/auth/recuperar/page.tsx
import { solicitarResetContrasena } from '../actions'

export default function RecuperarContrasenaPage() {
  return (
    <main className="min-h-screen flex items-center justify-center">
      <form action={solicitarResetContrasena} className="flex flex-col gap-4 w-80">
        <h1 className="text-xl font-semibold">Recuperar contraseña</h1>
        <p className="text-sm text-gray-500">
          Ingresá tu email y te enviamos un link para crear una nueva contraseña.
        </p>

        <input
          name="email"
          type="email"
          placeholder="Email"
          required
          className="border rounded-lg px-3 py-2 text-sm"
        />
        <button
          type="submit"
          className="bg-teal-600 text-white rounded-lg px-4 py-2 text-sm font-medium"
        >
          Enviar link
        </button>
      </form>
    </main>
  )
}
```

### Paso 2 — El callback procesa el token de reset

El link del email lleva al usuario a `/auth/nueva-contrasena` con un `code` en la URL. Hay que intercambiarlo por una sesión antes de mostrar el formulario.

```ts
// src/app/auth/nueva-contrasena/route.ts
// Este archivo maneja la redirección inicial del link del email
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { NextResponse, type NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (code) {
    const supabase = await createSupabaseServerClient()
    await supabase.auth.exchangeCodeForSession(code)
  }

  return NextResponse.redirect(`${origin}/auth/nueva-contrasena/formulario`)
}
```

### Paso 3 — El usuario elige su nueva contraseña

```tsx
// src/app/auth/nueva-contrasena/formulario/page.tsx
'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function NuevaContrasenaPage() {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
      setError(error.message)
      return
    }

    router.push('/?reset=ok')
  }

  return (
    <main className="min-h-screen flex items-center justify-center">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 w-80">
        <h1 className="text-xl font-semibold">Nueva contraseña</h1>

        <input
          type="password"
          placeholder="Nueva contraseña (mín. 6 caracteres)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
          className="border rounded-lg px-3 py-2 text-sm"
        />

        {error && <p className="text-sm text-red-500">{error}</p>}

        <button
          type="submit"
          className="bg-teal-600 text-white rounded-lg px-4 py-2 text-sm font-medium"
        >
          Guardar contraseña
        </button>
      </form>
    </main>
  )
}
```

> Este formulario usa el cliente browser porque `updateUser()` requiere que haya una sesión activa en el navegador, que se estableció al procesar el `code` en el paso anterior.

---

## Personalizar las plantillas de email

En Supabase podés editar el HTML que se envía en cada email.

**Authentication** → **Email Templates**

Las plantillas disponibles son:

| Plantilla | Cuándo se usa |
|---|---|
| **Confirm signup** | Confirmación de cuenta nueva |
| **Reset password** | Recuperación de contraseña |
| **Magic Link** | Login sin contraseña |
| **Change Email Address** | Cambio de email |

### Variables disponibles en las plantillas

```
{{ .ConfirmationURL }}   → el link completo con el token
{{ .Email }}            → el email del usuario
{{ .SiteURL }}          → la URL base del proyecto
{{ .Token }}            → solo el token (para construir URLs custom)
```

### Ejemplo de plantilla personalizada para reset de contraseña

```html
<h2>Recuperación de contraseña — Portal Municipal de Empleo</h2>

<p>Recibimos una solicitud para restablecer la contraseña de tu cuenta.</p>

<p>
  <a href="{{ .ConfirmationURL }}" style="
    background-color: #0d9488;
    color: white;
    padding: 10px 20px;
    border-radius: 8px;
    text-decoration: none;
    font-size: 14px;
  ">
    Crear nueva contraseña
  </a>
</p>

<p style="color: #6b7280; font-size: 12px;">
  Si no solicitaste este cambio, podés ignorar este email.
  El link expira en 24 horas.
</p>
```

---

## Resumen del flujo completo

```
CONFIRMACIÓN DE REGISTRO
  Usuario completa el form → signUp() con emailRedirectTo
  → Supabase envía email vía Gmail SMTP
  → Usuario hace click en el link
  → Aterriza en /auth/callback?code=...
  → exchangeCodeForSession(code) activa la cuenta
  → Redirige a /

RECUPERACIÓN DE CONTRASEÑA
  Usuario ingresa su email → resetPasswordForEmail() con redirectTo
  → Supabase envía email vía Gmail SMTP
  → Usuario hace click en el link
  → Aterriza en /auth/nueva-contrasena?code=...
  → exchangeCodeForSession(code) establece sesión temporal
  → Redirige a /auth/nueva-contrasena/formulario
  → Usuario elige nueva contraseña → updateUser({ password })
  → Redirige a /
```

---

## Variables de entorno actualizadas

```env
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<tu-anon-key>
SUPABASE_SECRET_KEY=<tu-service-role-key>
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

---

## Errores comunes

### El email no llega

1. Verificar que la App Password esté ingresada **sin espacios** en Supabase.
2. Verificar que la cuenta de Gmail tenga la verificación en dos pasos activa.
3. Revisar la carpeta de spam.
4. En **Authentication** → **Settings** verificar que el SMTP esté habilitado (el toggle puede desactivarse solo si hay un error de configuración).
5. Usar el botón **Send test email** para confirmar que la configuración SMTP funciona independientemente del flujo de auth.

### `Error: Invalid login: 535 Authentication failed`

La App Password es incorrecta o venció. Generá una nueva en [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords).

### El link del email lleva a una página en blanco o da 404

La ruta `/auth/callback` no existe o tiene un error. Verificar que el archivo `src/app/auth/callback/route.ts` esté creado correctamente.

### `exchangeCodeForSession` falla con `invalid_grant`

El `code` del link ya fue usado o expiró (duran 24 horas). El usuario debe solicitar un nuevo link.

### El usuario queda logueado pero sin fila en la tabla `usuarios`

El insert en `usuarios` que se hace después del `signUp()` falló. Verificar que se esté usando `supabaseAdmin` para ese insert — el cliente normal no puede insertar porque el usuario todavía no confirmó su email y RLS lo bloquea. Ver la guía de auth para el detalle del flujo.
