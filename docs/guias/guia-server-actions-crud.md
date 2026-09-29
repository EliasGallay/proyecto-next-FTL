# Guía de Server Actions y CRUD con Supabase

## Qué es un Server Action

Un Server Action es una función que corre en el servidor pero que puede ser llamada directamente desde un componente de React — sin necesidad de crear un endpoint de API por separado.

Se declaran con `'use server'` al principio del archivo o de la función:

```ts
'use server'

export async function crearOferta(formData: FormData) {
  // Este código corre en el servidor, nunca en el navegador
}
```

Ventajas frente a una Route Handler (`/api/...`):
- No hace falta definir una URL ni usar `fetch`
- El componente importa y llama la función directamente

> Usá Server Actions para operaciones iniciadas desde la UI de este proyecto (formularios, botones). Usá Route Handlers solo si necesitás un endpoint HTTP que consuma algo externo (webhook, otra aplicación).

---

## Estructura de archivos

Cada sección de la app tiene su propio archivo de actions:

```
src/app/ofertas/actions.ts
src/app/empresa/actions.ts
src/app/admin/actions.ts
src/app/postulaciones/actions.ts
```

Todos empiezan con:

```ts
'use server'
```

---

## Patrón base: resultado estructurado

En lugar de lanzar excepciones o redirigir siempre, conviene que las actions devuelvan un objeto con `ok` y un mensaje de error. Así el componente puede mostrar el error al usuario sin que la app explote.

```ts
// Éxito
return { ok: true, data: oferta }

// Error
return { ok: false, error: 'Todos los campos son obligatorios' }
```

---

## CREATE — crear un registro

```ts
// src/app/ofertas/actions.ts
'use server'

import { createSupabaseServerClient } from '@/lib/supabase-server'
import { revalidatePath } from 'next/cache'

export async function crearOferta(formData: FormData) {
  const supabase = await createSupabaseServerClient()

  // Verificar que hay sesión
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'No autenticado' }

  // Leer y validar los datos del formulario
  const titulo = formData.get('titulo') as string
  const descripcion = formData.get('descripcion') as string
  const empresa_nombre = formData.get('empresa_nombre') as string

  if (!titulo || !descripcion || !empresa_nombre) {
    return { ok: false, error: 'Todos los campos son obligatorios' }
  }

  const { data, error } = await supabase
    .from('ofertas')
    .insert({ titulo, descripcion, empresa_nombre })
    .select()
    .single()

  if (error) return { ok: false, error: error.message }

  // Invalida el caché de la página de ofertas para que muestre el nuevo registro
  revalidatePath('/ofertas')

  return { ok: true, data }
}
```

### Usar la action en un formulario (Server Component)

```tsx
// src/app/ofertas/nueva/page.tsx
import { crearOferta } from '../actions'

export default function NuevaOfertaPage() {
  return (
    <form action={crearOferta}>
      <input name="titulo" placeholder="Título" required />
      <input name="empresa_nombre" placeholder="Empresa" required />
      <textarea name="descripcion" placeholder="Descripción" required />
      <button type="submit">Crear oferta</button>
    </form>
  )
}
```

### Usar la action en un Client Component (con feedback)

Cuando necesitás mostrar errores o un estado de carga, el componente tiene que ser cliente:

```tsx
// src/app/ofertas/nueva/page.tsx
'use client'

import { useActionState } from 'react'
import { crearOferta } from '../actions'

const estadoInicial = { ok: true, data: null, error: '' }

export default function NuevaOfertaPage() {
  const [estado, action, pending] = useActionState(crearOferta, estadoInicial)

  return (
    <form action={action}>
      <input name="titulo" placeholder="Título" required />
      <input name="empresa_nombre" placeholder="Empresa" required />
      <textarea name="descripcion" placeholder="Descripción" required />

      {!estado.ok && (
        <p className="text-red-500 text-sm">{estado.error}</p>
      )}

      <button type="submit" disabled={pending}>
        {pending ? 'Guardando...' : 'Crear oferta'}
      </button>
    </form>
  )
}
```

---

## READ — leer registros

La lectura de datos se hace directamente en el Server Component — no hace falta un Server Action para esto.

```tsx
// src/app/ofertas/page.tsx
import { createSupabaseServerClient } from '@/lib/supabase-server'

export default async function OfertasPage() {
  const supabase = await createSupabaseServerClient()

  const { data: ofertas } = await supabase
    .from('ofertas')
    .select('*')
    .order('created_at', { ascending: false })

  return (
    <ul>
      {ofertas?.map((oferta) => (
        <li key={oferta.id}>{oferta.titulo}</li>
      ))}
    </ul>
  )
}
```

### Leer un registro por ID (ruta dinámica)

```tsx
// src/app/ofertas/[id]/page.tsx
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { notFound } from 'next/navigation'

export default async function DetalleOfertaPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createSupabaseServerClient()

  const { data: oferta } = await supabase
    .from('ofertas')
    .select('*')
    .eq('id', id)
    .single()

  if (!oferta) notFound()

  return <h1>{oferta.titulo}</h1>
}
```

---

## UPDATE — actualizar un registro

```ts
// src/app/ofertas/actions.ts
export async function actualizarOferta(id: string, formData: FormData) {
  const supabase = await createSupabaseServerClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'No autenticado' }

  const titulo = formData.get('titulo') as string
  const descripcion = formData.get('descripcion') as string

  const { data, error } = await supabase
    .from('ofertas')
    .update({ titulo, descripcion })
    .eq('id', id)
    .select()
    .single()

  if (error) return { ok: false, error: error.message }

  revalidatePath('/ofertas')
  revalidatePath(`/ofertas/${id}`)

  return { ok: true, data }
}
```

### Pasar el ID al action mediante `bind`

`useActionState` solo puede pasar `FormData`. Para incluir el ID, usá `.bind`:

```tsx
'use client'

import { useActionState } from 'react'
import { actualizarOferta } from '../actions'

export default function EditarOfertaForm({ oferta }) {
  // bind fija el primer argumento (id) — el formulario pasa el segundo (formData)
  const actionConId = actualizarOferta.bind(null, oferta.id)
  const [estado, action, pending] = useActionState(actionConId, { ok: true, data: null, error: '' })

  return (
    <form action={action}>
      <input name="titulo" defaultValue={oferta.titulo} required />
      <textarea name="descripcion" defaultValue={oferta.descripcion} required />

      {!estado.ok && <p className="text-red-500 text-sm">{estado.error}</p>}

      <button type="submit" disabled={pending}>
        {pending ? 'Guardando...' : 'Guardar cambios'}
      </button>
    </form>
  )
}
```

---

## DELETE — eliminar un registro

```ts
// src/app/ofertas/actions.ts
export async function eliminarOferta(id: string) {
  const supabase = await createSupabaseServerClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'No autenticado' }

  const { error } = await supabase
    .from('ofertas')
    .delete()
    .eq('id', id)

  if (error) return { ok: false, error: error.message }

  revalidatePath('/ofertas')

  return { ok: true }
}
```

### Botón de eliminar en un Client Component

```tsx
'use client'

import { eliminarOferta } from '../actions'
import { useTransition } from 'react'

export function BotonEliminar({ id }: { id: string }) {
  const [pending, startTransition] = useTransition()

  function handleClick() {
    startTransition(async () => {
      await eliminarOferta(id)
    })
  }

  return (
    <button onClick={handleClick} disabled={pending}>
      {pending ? 'Eliminando...' : 'Eliminar'}
    </button>
  )
}
```

---

## `revalidatePath` — para qué sirve

Next.js cachea las páginas para servirlas más rápido. Cuando una action modifica datos, hay que decirle a Next.js que el caché de ciertas páginas quedó desactualizado.

```ts
revalidatePath('/ofertas')           // recarga la lista de ofertas
revalidatePath(`/ofertas/${id}`)     // recarga el detalle de una oferta específica
revalidatePath('/empresa')           // recarga el dashboard de empresa
```

Sin `revalidatePath`, el usuario podría crear una oferta y no verla aparecer en la lista hasta que recargue manualmente.

---

## Checklist para cada Server Action

Antes de dar por terminada una action, verificar:

- [ ] Verifica que hay sesión activa con `getUser()`
- [ ] Valida que los datos requeridos están presentes
- [ ] Usa el cliente servidor (`createSupabaseServerClient`), nunca el browser
- [ ] Llama a `revalidatePath` en las rutas que muestran los datos modificados
- [ ] Devuelve `{ ok: true, data }` o `{ ok: false, error }` en lugar de lanzar excepciones
