# Guía de Filtros, Búsqueda y Paginación

## La regla más importante

**Nunca traer todos los datos y filtrar en JavaScript.**

```ts
// ❌ MAL — trae los 10.000 registros y filtra en el cliente
const { data: ofertas } = await supabase.from('ofertas').select('*')
const resultado = ofertas.filter(o => o.estado === 'activa')

// ✅ BIEN — la base de datos devuelve solo lo que se necesita
const { data: ofertas } = await supabase
  .from('ofertas')
  .select('*')
  .eq('estado', 'activa')
```

Filtrar en el cliente parece funcionar cuando hay pocos datos, pero cuando la tabla tenga miles de registros la app se va a poner lenta y va a consumir datos innecesariamente. La base de datos está diseñada para filtrar eficientemente — hay que dejarla hacer su trabajo.

---

## Filtros en Supabase

### Igualdad

```ts
.eq('estado', 'activa')          // estado = 'activa'
.neq('estado', 'cerrada')        // estado != 'cerrada'
```

### Comparación numérica / fecha

```ts
.gt('created_at', '2026-01-01')   // mayor que
.gte('created_at', '2026-01-01')  // mayor o igual que
.lt('created_at', '2026-12-31')   // menor que
.lte('created_at', '2026-12-31')  // menor o igual que
```

### Dentro de una lista de valores

```ts
// estado IN ('activa', 'borrador')
.in('estado', ['activa', 'borrador'])
```

### Nulo / no nulo

```ts
.is('cv_url', null)       // cv_url IS NULL
.not('cv_url', 'is', null) // cv_url IS NOT NULL
```

### Combinar filtros

Los filtros se encadenan — todos se aplican juntos con AND:

```ts
const { data } = await supabase
  .from('ofertas')
  .select('*')
  .eq('estado', 'activa')
  .gte('created_at', '2026-01-01')
  .order('created_at', { ascending: false })
```

---

## Búsqueda de texto

### `ilike` — búsqueda simple por patrón

```ts
// Busca "plomero" en el título, sin distinguir mayúsculas
.ilike('titulo', '%plomero%')
```

El `%` es un comodín que significa "cualquier texto". `%plomero%` encuentra cualquier título que contenga la palabra "plomero" en cualquier posición.

```ts
// Ejemplo completo: buscar ofertas por texto
const { data } = await supabase
  .from('ofertas')
  .select('*')
  .ilike('titulo', `%${busqueda}%`)
  .eq('estado', 'activa')
```

### Buscar en múltiples columnas

```ts
// Buscar en título O en descripción
const { data } = await supabase
  .from('ofertas')
  .select('*')
  .or(`titulo.ilike.%${busqueda}%,descripcion.ilike.%${busqueda}%`)
```

> `ilike` es suficiente para la mayoría de los casos. Para búsqueda avanzada (tolerancia a errores ortográficos, relevancia) existe full-text search, pero es mucho más complejo y no lo necesitamos por ahora.

---

## Paginación

### El problema de traer todo

Si la tabla `ofertas` tiene 5.000 registros y hacés `.select('*')` sin límite, Supabase los devuelve todos. La página tarda, el navegador consume memoria, y el usuario igual solo ve los primeros 20.

### Paginación con `range`

```ts
const ITEMS_POR_PAGINA = 10
const pagina = 0 // primera página

const { data, count } = await supabase
  .from('ofertas')
  .select('*', { count: 'exact' }) // pide el total además de los datos
  .eq('estado', 'activa')
  .order('created_at', { ascending: false })
  .range(
    pagina * ITEMS_POR_PAGINA,              // índice de inicio
    pagina * ITEMS_POR_PAGINA + ITEMS_POR_PAGINA - 1  // índice de fin
  )

// data  → los 10 registros de esta página
// count → total de registros que coinciden con los filtros (para calcular páginas)
```

Ejemplo para la página 2 con 10 items por página:
- inicio: `2 * 10 = 20`
- fin: `2 * 10 + 10 - 1 = 29`
- devuelve los registros del índice 20 al 29

---

## Cómo conectar filtros y paginación con la URL

La forma correcta en Next.js App Router es usar los **search params de la URL** como fuente de verdad del estado de los filtros. Así:

- El usuario puede compartir un link con los filtros aplicados
- El botón atrás del navegador funciona correctamente
- Los filtros persisten si se recarga la página
- Todo ocurre en el servidor — no hay estado en el cliente

```
/ofertas?estado=activa&busqueda=plomero&pagina=2
```

### Leer los search params en un Server Component

```tsx
// src/app/ofertas/page.tsx
import { createSupabaseServerClient } from '@/lib/supabase-server'

const ITEMS_POR_PAGINA = 10

export default async function OfertasPage({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string; busqueda?: string; pagina?: string }>
}) {
  const { estado, busqueda, pagina: paginaParam } = await searchParams
  const pagina = Number(paginaParam ?? 0)

  const supabase = await createSupabaseServerClient()

  let query = supabase
    .from('ofertas')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(pagina * ITEMS_POR_PAGINA, pagina * ITEMS_POR_PAGINA + ITEMS_POR_PAGINA - 1)

  // Aplicar filtros solo si están presentes
  if (estado) query = query.eq('estado', estado)
  if (busqueda) query = query.ilike('titulo', `%${busqueda}%`)

  const { data: ofertas, count } = await query

  const totalPaginas = Math.ceil((count ?? 0) / ITEMS_POR_PAGINA)

  return (
    <main className="p-8 max-w-3xl mx-auto">
      <FiltrosOfertas estado={estado} busqueda={busqueda} />

      <ul className="flex flex-col gap-3 mt-6">
        {ofertas?.map((oferta) => (
          <li key={oferta.id}>{oferta.titulo}</li>
        ))}
      </ul>

      <Paginacion paginaActual={pagina} totalPaginas={totalPaginas} />
    </main>
  )
}
```

### Componente de filtros

Los filtros modifican la URL — cuando el usuario cambia un filtro, se navega a la misma ruta con los nuevos search params. El Server Component se re-ejecuta con los nuevos parámetros.

```tsx
// src/app/ofertas/FiltrosOfertas.tsx
'use client'

import { useRouter, usePathname } from 'next/navigation'

export function FiltrosOfertas({
  estado,
  busqueda,
}: {
  estado?: string
  busqueda?: string
}) {
  const router = useRouter()
  const pathname = usePathname()

  function actualizar(clave: string, valor: string) {
    const params = new URLSearchParams(window.location.search)

    if (valor) {
      params.set(clave, valor)
    } else {
      params.delete(clave)
    }

    // Al cambiar un filtro, volver a la primera página
    params.delete('pagina')

    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <div className="flex gap-3 flex-wrap">
      {/* Búsqueda por texto */}
      <input
        type="search"
        placeholder="Buscar ofertas..."
        defaultValue={busqueda}
        onChange={(e) => actualizar('busqueda', e.target.value)}
        className="border rounded-lg px-3 py-2 text-sm"
      />

      {/* Filtro por estado */}
      <select
        defaultValue={estado ?? ''}
        onChange={(e) => actualizar('estado', e.target.value)}
        className="border rounded-lg px-3 py-2 text-sm"
      >
        <option value="">Todos los estados</option>
        <option value="activa">Activa</option>
        <option value="borrador">Borrador</option>
        <option value="cerrada">Cerrada</option>
      </select>
    </div>
  )
}
```

> El input de búsqueda dispara un request por cada tecla. Para no saturar el servidor, se puede agregar un debounce (esperar que el usuario termine de escribir antes de navegar). Por ahora funciona bien sin él.

### Componente de paginación

```tsx
// src/app/ofertas/Paginacion.tsx
'use client'

import { useRouter, usePathname } from 'next/navigation'

export function Paginacion({
  paginaActual,
  totalPaginas,
}: {
  paginaActual: number
  totalPaginas: number
}) {
  const router = useRouter()
  const pathname = usePathname()

  if (totalPaginas <= 1) return null

  function irA(pagina: number) {
    const params = new URLSearchParams(window.location.search)
    params.set('pagina', String(pagina))
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <div className="flex gap-2 justify-center mt-8">
      <button
        onClick={() => irA(paginaActual - 1)}
        disabled={paginaActual === 0}
        className="px-3 py-1 border rounded text-sm disabled:opacity-40"
      >
        Anterior
      </button>

      <span className="px-3 py-1 text-sm text-gray-500">
        Página {paginaActual + 1} de {totalPaginas}
      </span>

      <button
        onClick={() => irA(paginaActual + 1)}
        disabled={paginaActual >= totalPaginas - 1}
        className="px-3 py-1 border rounded text-sm disabled:opacity-40"
      >
        Siguiente
      </button>
    </div>
  )
}
```

---

## Ordenamiento

```ts
// Un solo campo
.order('created_at', { ascending: false })  // más reciente primero

// Múltiples campos
.order('estado', { ascending: true })
.order('created_at', { ascending: false })
```

Para que el usuario pueda cambiar el orden, se aplica el mismo patrón que los filtros: un search param `orden` en la URL.

```ts
const orden = searchParams.orden ?? 'created_at'
const asc = searchParams.asc === 'true'

query = query.order(orden, { ascending: asc })
```

---

## Filtrar por relación (JOIN)

Supabase permite filtrar por columnas de tablas relacionadas en la misma query:

```ts
// Ofertas que pertenecen a una categoría específica
const { data } = await supabase
  .from('ofertas')
  .select(`
    *,
    oferta_categorias!inner(
      categorias!inner(nombre)
    )
  `)
  .eq('oferta_categorias.categorias.nombre', 'Informática y Tecnología')
  .eq('estado', 'activa')
```

El `!inner` hace que solo devuelva ofertas que tengan esa relación — equivale a un INNER JOIN en SQL.

---

## Resumen de lo que va en el servidor vs el cliente

| Tarea | Dónde |
|---|---|
| Ejecutar la query con filtros | Servidor (Server Component) |
| Leer los search params | Servidor (Server Component) |
| Renderizar la lista filtrada | Servidor (Server Component) |
| Input de búsqueda / select de filtro | Cliente (actualiza la URL) |
| Botones de paginación | Cliente (actualiza la URL) |
| Filtrar un array en JavaScript | Nunca ❌ |
