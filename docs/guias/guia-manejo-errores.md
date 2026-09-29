# Guía de Manejo de Errores y Respuestas

## El problema sin una convención

Sin una forma estándar de manejar errores, cada componente termina haciendo algo distinto:

```ts
// Una action lanza una excepción
throw new Error('No autorizado')

// Otra redirige directamente
redirect('/error')

// Otra devuelve un string
return 'algo salió mal'

// Otra devuelve un objeto inventado
return { success: false, msg: 'ups' }
```

El componente que llama no sabe qué esperar. Con una convención fija, el código es predecible en toda la app.

---

## El patrón estándar de este proyecto

Todas las Server Actions devuelven un objeto con la misma forma:

```ts
// Éxito
return { ok: true, data: ... }

// Error
return { ok: false, error: 'Mensaje para mostrar al usuario' }
```

Siempre `ok`, siempre `error` cuando falla. Nada más.

---

## Cuándo devolver error vs cuándo redirigir

Esta es la decisión más importante:

| Situación | Qué hacer |
|---|---|
| El usuario llenó mal un campo | `return { ok: false, error: '...' }` — mostrar el error en el formulario |
| No hay sesión activa | `redirect('/auth/login')` — no tiene sentido mostrar un error |
| El rol no tiene permiso | `return { ok: false, error: '...' }` — mostrar mensaje en la página |
| La operación fue exitosa | `redirect('/ruta')` o `return { ok: true, data }` según si hay que navegar |
| Error inesperado de base de datos | `return { ok: false, error: 'Ocurrió un error, intentá de nuevo' }` — nunca exponer el error interno |

**Regla general:** redirigir cuando no tiene sentido seguir en la misma página. Devolver el error cuando el usuario puede corregir algo sin irse.

---

## Mensajes de error

### Lo que ve el usuario vs lo que ves vos

```ts
const { data, error } = await supabase.from('ofertas').insert(...)

if (error) {
  // Loguear el error técnico para debugging (solo visible en el servidor)
  console.error('[crearOferta]', error.message, error.code)

  // Devolver un mensaje genérico al usuario
  return { ok: false, error: 'No se pudo crear la oferta. Intentá de nuevo.' }
}
```

Nunca exponer el mensaje interno de Supabase al usuario — puede contener detalles técnicos, nombres de columnas o información sensible.

### Mensajes según el tipo de error

```ts
// Validación — el usuario puede corregirlo
if (!titulo) return { ok: false, error: 'El título es obligatorio' }

// Conflicto — ya existe
if (error.code === '23505') return { ok: false, error: 'Ya existe una postulación para esta oferta' }

// Sin permiso — rol incorrecto
if (rol !== 'empresa') return { ok: false, error: 'Solo las empresas pueden publicar ofertas' }

// Error inesperado — no hay nada que corregir
return { ok: false, error: 'Ocurrió un error inesperado. Intentá de nuevo.' }
```

---

## Server Action completa con manejo de errores

```ts
// src/app/ofertas/actions.ts
'use server'

import { createSupabaseServerClient } from '@/lib/supabase-server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function crearOferta(formData: FormData) {
  const supabase = await createSupabaseServerClient()

  // 1. Verificar sesión — redirigir si no hay
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  // 2. Verificar rol — devolver error si no tiene permiso
  const { data: usuario } = await supabase
    .from('usuarios')
    .select('rol')
    .eq('id', user.id)
    .single()

  if (usuario?.rol !== 'empresa' && usuario?.rol !== 'municipalidad') {
    return { ok: false, error: 'Solo las empresas pueden publicar ofertas' }
  }

  // 3. Validar campos — devolver error si faltan datos
  const titulo       = formData.get('titulo') as string
  const descripcion  = formData.get('descripcion') as string
  const empresa_nombre = formData.get('empresa_nombre') as string

  if (!titulo || !descripcion || !empresa_nombre) {
    return { ok: false, error: 'Todos los campos son obligatorios' }
  }

  // 4. Ejecutar operación — loguear internamente, devolver error genérico
  const { error } = await supabase
    .from('ofertas')
    .insert({ titulo, descripcion, empresa_nombre })

  if (error) {
    console.error('[crearOferta]', error.message)
    return { ok: false, error: 'No se pudo crear la oferta. Intentá de nuevo.' }
  }

  // 5. Éxito — revalidar y redirigir
  revalidatePath('/ofertas')
  redirect('/ofertas')
}
```

---

## Mostrar errores en el componente

### Con `useActionState` (recomendado para formularios)

```tsx
'use client'

import { useActionState } from 'react'
import { crearOferta } from '../actions'

const estadoInicial = { ok: true, error: '' }

export default function NuevaOfertaPage() {
  const [estado, action, pending] = useActionState(crearOferta, estadoInicial)

  return (
    <form action={action} className="flex flex-col gap-4">
      <input name="titulo" placeholder="Título" required />
      <input name="empresa_nombre" placeholder="Empresa" required />
      <textarea name="descripcion" placeholder="Descripción" required />

      {/* El error aparece si ok es false */}
      {!estado.ok && (
        <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
          {estado.error}
        </p>
      )}

      <button type="submit" disabled={pending}>
        {pending ? 'Guardando...' : 'Publicar oferta'}
      </button>
    </form>
  )
}
```

### Con `useTransition` (para botones que no son formularios)

```tsx
'use client'

import { useTransition } from 'react'
import { eliminarOferta } from '../actions'
import { useState } from 'react'

export function BotonEliminar({ id }: { id: string }) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState('')

  function handleClick() {
    startTransition(async () => {
      const resultado = await eliminarOferta(id)
      if (!resultado.ok) setError(resultado.error)
    })
  }

  return (
    <div>
      <button onClick={handleClick} disabled={pending}>
        {pending ? 'Eliminando...' : 'Eliminar'}
      </button>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  )
}
```

---

## Errores de Supabase que hay que conocer

Supabase devuelve errores con un campo `code`. Los más comunes en este proyecto:

| Código | Causa | Mensaje para el usuario |
|---|---|---|
| `23505` | Registro duplicado (unique constraint) | "Ya existe un registro con esos datos" |
| `23503` | FK inválida (referencia a ID que no existe) | "Los datos ingresados no son válidos" |
| `PGRST116` | `.single()` no encontró resultados | Tratar como NOT FOUND |
| `42501` | RLS bloqueó la operación | "No tenés permiso para esta acción" |

```ts
if (error) {
  if (error.code === '23505') {
    return { ok: false, error: 'Ya te postulaste a esta oferta' }
  }
  console.error('[crearPostulacion]', error.message)
  return { ok: false, error: 'No se pudo crear la postulación. Intentá de nuevo.' }
}
```

---

## Orden de verificaciones en una action

Siempre en este orden:

```
1. Sesión          → redirect('/auth/login') si no hay usuario
2. Rol / permiso   → { ok: false, error } si no tiene acceso
3. Validación      → { ok: false, error } si faltan o son inválidos los datos
4. Operación       → { ok: false, error } si falla algo en la base de datos
5. Éxito           → revalidatePath + redirect, o { ok: true, data }
```

Respetar este orden evita hacer queries innecesarias (no tiene sentido validar los campos si el usuario no tiene sesión) y evita exponer información (no verificar permisos después de buscar el dato).

---

## Resumen rápido

```
¿No hay sesión?          → redirect('/auth/login')
¿No tiene permiso?       → { ok: false, error: 'mensaje claro' }
¿Faltan datos?           → { ok: false, error: 'mensaje claro' }
¿Falló la base de datos? → console.error interno + { ok: false, error: 'mensaje genérico' }
¿Todo bien?              → redirect() o { ok: true, data }
```

Nunca lanzar excepciones (`throw`) desde una action — rompería el componente que la llama sin que pueda mostrar el error al usuario.
```