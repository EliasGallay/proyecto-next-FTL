# Guía de Autenticación y Roles con Supabase

## Conceptos clave

Supabase Auth provee un sistema de autenticación completo que se integra directamente con Row Level Security (RLS). Los puntos importantes a entender antes de empezar:

- **`auth.users`** — tabla interna de Supabase donde vive cada usuario autenticado.
- **`auth.uid()`** — función SQL que devuelve el ID del usuario autenticado en el contexto de una query. Es la base de toda política RLS.
- **Dos clientes distintos** — uno para el navegador, otro para el servidor. Confundirlos es el error más frecuente.

---

## Los dos clientes de Supabase

### Cliente browser (ya existe en este proyecto)

```ts
// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
)
```

Úsalo en **Client Components** (`'use client'`). Lee la sesión desde las cookies del navegador.

### Cliente servidor (para Server Components, Server Actions y Route Handlers)

Requiere el paquete `@supabase/ssr`:

```bash
npm install @supabase/ssr
```

```ts
// src/lib/supabase-server.ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createSupabaseServerClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        },
      },
    }
  )
}
```

> **Regla:** nunca uses el cliente browser en un Server Component o Server Action. La sesión no se va a leer correctamente porque no tiene acceso a las cookies del request.

---

### Cliente admin (service role key)

Existe un tercer cliente para operaciones de administración que deben **saltear RLS completamente**. Usa la `SUPABASE_SECRET_KEY` (service role key), que nunca debe llegar al navegador.

```ts
// src/lib/supabase-admin.ts
import { createClient } from '@supabase/supabase-js'

// Sin NEXT_PUBLIC_ — esta variable solo existe en el servidor
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!
)
```

> Este cliente ignora todas las políticas RLS. Solo usarlo en Server Actions o Route Handlers, nunca en Client Components.

**Cuándo usarlo vs el cliente servidor normal:**

| Situación | Cliente a usar |
|---|---|
| Leer datos del usuario autenticado | `createSupabaseServerClient()` |
| Crear/editar datos propios | `createSupabaseServerClient()` |
| Cambiar el rol de otro usuario | `supabaseAdmin` |
| Insertar en `usuarios` durante el registro | `supabaseAdmin` |
| Borrar datos de cualquier usuario | `supabaseAdmin` |

---

## Variables de entorno necesarias

En `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<tu-anon-key>
SUPABASE_SECRET_KEY=<tu-service-role-key>
```

La publishable key es pública (prefijo `NEXT_PUBLIC_`). La secret key **nunca** lleva ese prefijo — si lo tuviera, quedaría expuesta en el bundle del cliente y cualquiera podría operar sin RLS.

Encontrás ambas keys en el dashboard de Supabase en **Project Settings → API**.

---

## Roles en este proyecto

La tabla `usuarios` (que ya existe en el schema) tiene un campo `rol` con tres valores posibles:

| Rol | Quién es |
|---|---|
| `postulante` | Ciudadano que busca trabajo |
| `empresa` | Empresa que publica ofertas |
| `municipalidad` | Personal municipal que administra el portal |

El rol `municipalidad` no se autoasigna — lo asigna otro usuario con ese mismo rol desde el panel de administración.

---

## Registro de usuario

La tabla `usuarios` requiere `nombre`, `apellido`, `dni`, `email` y `rol` — todos NOT NULL. Por eso el registro necesita recolectar todos esos datos y no puede ser solo email + password.

El flujo es:
1. `signUp()` crea el usuario en `auth.users`
2. Con `supabaseAdmin` se inserta en `usuarios` (necesario porque el usuario aún no confirmó su email y RLS no lo dejaría insertar)

### Server Action

```ts
// src/app/auth/actions.ts
'use server'

import { createSupabaseServerClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { redirect } from 'next/navigation'

export async function registrar(formData: FormData) {
  const email    = formData.get('email') as string
  const password = formData.get('password') as string
  const nombre   = formData.get('nombre') as string
  const apellido = formData.get('apellido') as string
  const dni      = formData.get('dni') as string
  const rol      = formData.get('rol') as 'postulante' | 'empresa'

  if (!email || !password || !nombre || !apellido || !dni || !rol) {
    redirect('/auth/registro?error=campos-incompletos')
  }

  const supabase = await createSupabaseServerClient()

  // 1. Crear el usuario en auth.users
  const { data, error } = await supabase.auth.signUp({ email, password })

  if (error || !data.user) {
    redirect('/auth/registro?error=' + encodeURIComponent(error?.message ?? 'Error desconocido'))
  }

  // 2. Insertar en la tabla usuarios con supabaseAdmin
  // (el usuario todavía no confirmó su email, RLS no permitiría el insert)
  const { error: errorInsert } = await supabaseAdmin
    .from('usuarios')
    .insert({
      id: data.user.id,
      email,
      nombre,
      apellido,
      dni,
      rol,
    })

  if (errorInsert) {
    // Si falla el insert, limpiar el usuario de auth para no dejar inconsistencias
    await supabaseAdmin.auth.admin.deleteUser(data.user.id)
    redirect('/auth/registro?error=error-al-crear-perfil')
  }

  redirect('/auth/verificar-email')
}
```

### Formulario

```tsx
// src/app/auth/registro/page.tsx
import { registrar } from '../actions'

export default function RegistroPage() {
  return (
    <main className="min-h-screen flex items-center justify-center">
      <form action={registrar} className="flex flex-col gap-4 w-96">
        <h1 className="text-xl font-semibold">Crear cuenta</h1>

        <input name="nombre"   type="text"  placeholder="Nombre"   required className="border rounded-lg px-3 py-2 text-sm" />
        <input name="apellido" type="text"  placeholder="Apellido" required className="border rounded-lg px-3 py-2 text-sm" />
        <input name="dni"      type="text"  placeholder="DNI"      required className="border rounded-lg px-3 py-2 text-sm" />
        <input name="email"    type="email" placeholder="Email"    required className="border rounded-lg px-3 py-2 text-sm" />
        <input name="password" type="password" placeholder="Contraseña (mín. 6 caracteres)" required minLength={6} className="border rounded-lg px-3 py-2 text-sm" />

        <select name="rol" required className="border rounded-lg px-3 py-2 text-sm">
          <option value="">Tipo de cuenta</option>
          <option value="postulante">Postulante</option>
          <option value="empresa">Empresa</option>
        </select>

        <button type="submit" className="bg-teal-600 text-white rounded-lg px-4 py-2 text-sm font-medium">
          Registrarse
        </button>
      </form>
    </main>
  )
}
```

> El rol `municipalidad` no aparece en el formulario — se asigna manualmente desde el panel de administración.

---

## Login

### Server Action

```ts
// src/app/auth/actions.ts (continuación)
export async function login(formData: FormData) {
  const email    = formData.get('email') as string
  const password = formData.get('password') as string

  const supabase = await createSupabaseServerClient()

  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    redirect('/auth/login?error=credenciales-invalidas')
  }

  redirect('/')
}
```

### Formulario

```tsx
// src/app/auth/login/page.tsx
import { login } from '../actions'

export default function LoginPage() {
  return (
    <main className="min-h-screen flex items-center justify-center">
      <form action={login} className="flex flex-col gap-4 w-80">
        <h1 className="text-xl font-semibold">Iniciar sesión</h1>

        <input name="email"    type="email"    placeholder="Email"      required className="border rounded-lg px-3 py-2 text-sm" />
        <input name="password" type="password" placeholder="Contraseña" required className="border rounded-lg px-3 py-2 text-sm" />

        <button type="submit" className="bg-teal-600 text-white rounded-lg px-4 py-2 text-sm font-medium">
          Entrar
        </button>
      </form>
    </main>
  )
}
```

## Logout

```ts
// src/app/auth/actions.ts (continuación)
export async function logout() {
  const supabase = await createSupabaseServerClient()
  await supabase.auth.signOut()
  redirect('/auth/login')
}
```

```tsx
// En cualquier componente de servidor:
import { logout } from '@/app/auth/actions'

<form action={logout}>
  <button type="submit">Cerrar sesión</button>
</form>
```

---

## Leer la sesión en un Server Component

```tsx
// src/app/empresa/page.tsx (ejemplo)
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'

export default async function EmpresaPage() {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  return (
    <main>
      <p>Bienvenido, {user.email}</p>
    </main>
  )
}
```

> Usá siempre `getUser()` en el servidor — es la única llamada que verifica la sesión contra Supabase y no puede ser manipulada por el cliente.

---

## Leer el rol en el servidor

```ts
// src/lib/get-rol.ts
import { createSupabaseServerClient } from './supabase-server'

export async function getRolUsuario() {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  const { data: usuario } = await supabase
    .from('usuarios')
    .select('rol')
    .eq('id', user.id)
    .single()

  return usuario?.rol ?? null
}
```

---

## Proteger una ruta por rol

```tsx
// src/app/admin/page.tsx — solo municipalidad
import { getRolUsuario } from '@/lib/get-rol'
import { redirect } from 'next/navigation'

export default async function AdminPage() {
  const rol = await getRolUsuario()

  if (rol !== 'municipalidad') redirect('/')

  return <main>Panel municipal</main>
}
```

```tsx
// src/app/empresa/page.tsx — empresa y municipalidad
import { getRolUsuario } from '@/lib/get-rol'
import { redirect } from 'next/navigation'

export default async function EmpresaPage() {
  const rol = await getRolUsuario()

  if (rol !== 'empresa' && rol !== 'municipalidad') redirect('/')

  return <main>Dashboard de empresa</main>
}
```

---

## RLS con roles

Con la tabla `usuarios` podés escribir políticas RLS que validan el rol:

```sql
-- Solo empresas y municipalidad pueden crear ofertas
CREATE POLICY "empresas pueden crear ofertas"
  ON ofertas FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE id = auth.uid()
        AND rol IN ('empresa', 'municipalidad')
    )
  );

-- Postulantes y municipalidad pueden ver postulaciones
CREATE POLICY "postulantes ven sus postulaciones"
  ON postulaciones FOR SELECT
  USING (
    postulante_id IN (
      SELECT id FROM postulantes WHERE usuario_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM usuarios
      WHERE id = auth.uid() AND rol = 'municipalidad'
    )
  );

-- Solo ofertas activas son públicas
CREATE POLICY "todos ven ofertas activas"
  ON ofertas FOR SELECT
  USING (estado = 'activa');
```

---

## Proteger rutas con Middleware

Para redirigir automáticamente sin autenticación antes de que cargue el Server Component:

```ts
// src/middleware.ts
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value)
          )
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  const rutasProtegidas = ['/empresa', '/admin', '/ofertas/nueva']
  const estaEnRutaProtegida = rutasProtegidas.some(ruta =>
    request.nextUrl.pathname.startsWith(ruta)
  )

  if (!user && estaEnRutaProtegida) {
    return NextResponse.redirect(new URL('/auth/login', request.url))
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
```

> El middleware solo verifica si hay sesión activa. La verificación del **rol** se hace dentro del Server Component — el middleware no hace queries adicionales.

---

## Operaciones de municipalidad con la service role key

El caso de uso más frecuente es que un usuario de municipalidad cambie el rol de otro usuario. Esto requiere `supabaseAdmin` porque RLS impide que un usuario modifique el registro de otro.

### Server Action

```ts
// src/app/admin/actions.ts
'use server'

import { supabaseAdmin } from '@/lib/supabase-admin'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'

export async function cambiarRolUsuario(formData: FormData) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  // Verificar que quien ejecuta la acción es municipalidad
  const { data: ejecutor } = await supabase
    .from('usuarios')
    .select('rol')
    .eq('id', user.id)
    .single()

  if (ejecutor?.rol !== 'municipalidad') {
    throw new Error('No autorizado')
  }

  const usuarioId = formData.get('usuario_id') as string
  const nuevoRol  = formData.get('rol') as string

  const { error } = await supabaseAdmin
    .from('usuarios')
    .update({ rol: nuevoRol })
    .eq('id', usuarioId)

  if (error) throw new Error('Error al cambiar el rol')
}
```

### Panel de administración

```tsx
// src/app/admin/page.tsx
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getRolUsuario } from '@/lib/get-rol'
import { redirect } from 'next/navigation'
import { cambiarRolUsuario } from './actions'

export default async function AdminPage() {
  const rol = await getRolUsuario()
  if (rol !== 'municipalidad') redirect('/')

  const { data: usuarios } = await supabaseAdmin
    .from('usuarios')
    .select('id, nombre, apellido, rol')
    .order('created_at', { ascending: false })

  return (
    <main className="p-8 max-w-3xl mx-auto">
      <h1 className="text-2xl font-semibold mb-6">Gestión de usuarios</h1>

      <ul className="flex flex-col gap-3">
        {usuarios?.map((u) => (
          <li key={u.id} className="bg-white rounded-xl shadow-sm p-4 flex justify-between items-center">
            <div>
              <p className="text-sm font-medium text-gray-800">{u.nombre} {u.apellido}</p>
              <span className="text-xs bg-gray-100 px-2 py-0.5 rounded-full">{u.rol}</span>
            </div>

            <form action={cambiarRolUsuario} className="flex gap-2 items-center">
              <input type="hidden" name="usuario_id" value={u.id} />
              <select name="rol" defaultValue={u.rol} className="text-sm border rounded px-2 py-1">
                <option value="postulante">postulante</option>
                <option value="empresa">empresa</option>
                <option value="municipalidad">municipalidad</option>
              </select>
              <button type="submit" className="text-sm bg-teal-600 text-white px-3 py-1 rounded-lg">
                Guardar
              </button>
            </form>
          </li>
        ))}
      </ul>
    </main>
  )
}
```

---

## Flujo completo resumido

```
REGISTRO
  Usuario completa el form (nombre, apellido, dni, email, password, rol)
  → signUp() crea el usuario en auth.users
  → supabaseAdmin inserta en public.usuarios con todos los campos
  → Se redirige a verificar-email

LOGIN
  → signInWithPassword() verifica credenciales
  → Supabase setea la cookie de sesión
  → Middleware permite acceso a rutas protegidas
  → Server Components leen el rol desde public.usuarios
  → RLS aplica las restricciones correspondientes en la base de datos
```

---

## Errores comunes

### La sesión siempre es `null` en el servidor

Estás usando el cliente browser en un Server Component o Server Action. Usá `createSupabaseServerClient()`.

### El insert en `usuarios` falla después del `signUp`

Verificá que estés usando `supabaseAdmin` para el insert, no el cliente normal. El usuario recién creado no tiene sesión activa todavía y RLS bloquearía el insert.

### RLS bloquea todas las queries

Si habilitaste RLS en una tabla sin crear políticas, nadie puede leer ni escribir. Creá las políticas necesarias o deshabilitá RLS temporalmente para debuggear.

### `cookies()` da error en el servidor

En Next.js App Router, `cookies()` es asíncrono — recordá usar `await cookies()` al crear el cliente servidor.
