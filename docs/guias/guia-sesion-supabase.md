# Guía de Sesión con Supabase

## Cómo funciona la sesión por debajo

Cuando un usuario hace login, Supabase genera dos tokens:

- **Access token** — un JWT que dura **1 hora**. Es el que se envía en cada request para identificar al usuario.
- **Refresh token** — dura mucho más (semanas). Se usa exclusivamente para obtener un access token nuevo cuando el anterior expira.

Ambos se guardan en **cookies** en el navegador. Eso es lo que hace que la sesión persista entre visitas: el usuario cierra el tab, vuelve al día siguiente, y sigue logueado porque las cookies siguen ahí.

No tenés que hacer nada para que esto funcione — Supabase lo maneja solo. Lo importante es entender qué pasa para no escribir código innecesario.

---

## El middleware refresca el token automáticamente

### ¿Qué es un middleware?

Un middleware es código que se ejecuta **entre** que el navegador hace un request y que Next.js lo procesa. Cada vez que el usuario navega a una URL, el middleware corre primero — antes de que se cargue cualquier página o componente.

Es el lugar ideal para lógica que tiene que aplicarse a muchas rutas a la vez: verificar si hay sesión activa, redirigir si no hay permiso, o en este caso, refrescar el token de autenticación.

El archivo vive en `src/middleware.ts` (un nivel afuera de `app/`, no adentro).

### Qué hace el middleware de Supabase

Tiene una responsabilidad que va más allá de redirigir rutas: **refresca el access token** antes de que llegue al Server Component.

```
Navegador hace un request
  → Middleware intercepta
  → Supabase detecta que el access token está por vencer
  → Lo refresca usando el refresh token
  → Actualiza las cookies
  → El request continúa con un token fresco
```

Si no existiera el middleware, el token expiraría después de una hora y el usuario quedaría deslogueado aunque su sesión debería seguir activa.

> Por eso el middleware tiene que correr en **todas las rutas**, no solo en las protegidas. Si lo limitás demasiado, el token deja de refrescarse.

---

## `getUser()` vs `getSession()` — cuál usar y cuándo

Esta es la diferencia más importante y la que más confusión genera.

### `getUser()` — siempre verifica con el servidor

```ts
const { data: { user } } = await supabase.auth.getUser()
```

- Hace una llamada a Supabase para verificar que el token es válido
- Siempre devuelve datos frescos y confiables
- Es más lenta (hay un request de red)
- **Usala en el servidor** para decisiones de seguridad: proteger rutas, verificar autorización antes de una operación

### `getSession()` — lee el token local sin verificar

```ts
const { data: { session } } = await supabase.auth.getSession()
```

- Lee el token que está en las cookies, sin consultar a Supabase
- Es instantánea (no hay request de red)
- El token podría estar manipulado — **no es confiable para decisiones de seguridad**
- **Usala en el cliente** para mostrar información del usuario en la UI (nombre, email, avatar) sin hacer una llamada al servidor

### Regla práctica

| Situación | Función |
|---|---|
| Proteger una ruta en Server Component | `getUser()` |
| Verificar autorización antes de escribir en la BD | `getUser()` |
| Mostrar el nombre del usuario en el header | `getSession()` |
| Saber si hay alguien logueado para mostrar un botón | `getSession()` |

---

## Leer la sesión en Client Components

En un Client Component, el cliente browser lee la sesión directamente desde las cookies — sin llamar al servidor.

### Forma simple: leer la sesión una vez

```tsx
'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'

export default function Header() {
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
    })
  }, [])

  if (!user) return <a href="/auth/login">Iniciar sesión</a>

  return <span>{user.email}</span>
}
```

### Forma reactiva: escuchar cambios de sesión

Si el usuario hace login o logout en otra pestaña, o si el token se refresca, `onAuthStateChange` lo detecta y actualiza el estado automáticamente.

```tsx
'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'

export default function Header() {
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    // Estado inicial
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
    })

    // Escucha cambios: login, logout, refresh de token
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null)
      }
    )

    // Limpia el listener cuando el componente se desmonta
    return () => subscription.unsubscribe()
  }, [])

  if (!user) return <a href="/auth/login">Iniciar sesión</a>

  return <span>{user.email}</span>
}
```

---

## Compartir el usuario entre componentes sin repetir llamadas

Si varios componentes en la misma página necesitan saber quién está logueado, no tiene sentido que cada uno llame a `getSession()` por separado. La solución es un Context que obtiene la sesión una sola vez y la comparte.

### Crear el contexto

```tsx
// src/components/SessionProvider.tsx
'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'

const SessionContext = createContext<User | null>(null)

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  return (
    <SessionContext.Provider value={user}>
      {children}
    </SessionContext.Provider>
  )
}

export function useSession() {
  return useContext(SessionContext)
}
```

### Registrar el provider en el layout

```tsx
// src/app/layout.tsx
import { SessionProvider } from '@/components/SessionProvider'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        <SessionProvider>
          {children}
        </SessionProvider>
      </body>
    </html>
  )
}
```

### Usar el usuario en cualquier Client Component

```tsx
'use client'

import { useSession } from '@/components/SessionProvider'

export default function Header() {
  const user = useSession()

  if (!user) return <a href="/auth/login">Iniciar sesión</a>

  return <span>Hola, {user.email}</span>
}
```

```tsx
'use client'

import { useSession } from '@/components/SessionProvider'

export default function BotonPostularse() {
  const user = useSession()

  if (!user) return <a href="/auth/login">Iniciá sesión para postularte</a>

  return <button>Postularse</button>
}
```

Ambos componentes leen del mismo Context — `getSession()` se llamó una sola vez.

---

## Qué pasa cuando el token expira

El access token dura 1 hora. Cuando vence:

1. El middleware detecta que está por vencer en el próximo request
2. Usa el refresh token para pedirle a Supabase un access token nuevo
3. Actualiza las cookies con el token nuevo
4. El usuario no nota nada — sigue navegando normalmente

El refresh token también tiene una fecha de vencimiento (configurable en Supabase, por defecto varias semanas). Cuando vence, la sesión termina y el usuario tiene que volver a hacer login.

Podés ver y configurar estos tiempos en **Authentication → Settings → JWT expiry** en el dashboard de Supabase.

---

## Resumen

```
La sesión persiste en cookies — no hay que guardarla en ningún lado.

Middleware → refresca el token automáticamente en cada request.

getUser()    → verifica con el servidor → usar para seguridad.
getSession() → lee el token local      → usar para la UI.

onAuthStateChange → escucha login/logout/refresh en tiempo real.

SessionProvider → comparte el usuario entre componentes sin llamadas repetidas.
```
