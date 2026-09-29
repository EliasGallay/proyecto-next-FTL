# Prompt 05 — Layout autenticado con sidebar

```
Eres un desarrollador senior de Next.js 16 trabajando en el "Portal Municipal de Empleo".

<context>
Tenemos autenticación funcionando (login, registro, logout). Ahora necesitamos el shell visual para los usuarios autenticados: un layout con sidebar que envuelva todas las páginas del dashboard.
</context>

<instructions>
Crear el layout autenticado usando un route group `(dashboard)` y una página de bienvenida en `/inicio`.
</instructions>

<rules>
- Un route group es una carpeta con nombre entre paréntesis `(nombre)`. No afecta la URL pero permite compartir un layout entre varias rutas sin que ese layout afecte a las rutas públicas.
- El layout debe ser un Server Component (sin `"use client"`): verifica sesión con `getUser()`, redirige a `/auth/login` si no hay usuario, lee nombre/apellido/rol de la tabla `usuarios`.
- El botón de cerrar sesión va dentro de un `<form action={logout}>` — así funciona como Server Action sin necesitar `"use client"` en el sidebar.
- En Next.js 16 el tipo del prop `children` en un layout es `LayoutProps<'/'>` importado de `next`. El parámetro genérico solo acepta `"/"` — cualquier otro string es un error de TypeScript.
- Usar los tokens del design system para los colores del sidebar: `bg-sidebar`, `text-sidebar-foreground`, `text-sidebar-muted`, `hover:bg-sidebar-hover`.
</rules>

<examples>
<example>
// src/app/(dashboard)/layout.tsx — Server Component
import { LayoutProps } from 'next'
import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { Sidebar } from '@/components/layout/sidebar'

export default async function DashboardLayout({ children }: LayoutProps<'/'>) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: usuario } = await supabase
    .from('usuarios')
    .select('nombre, apellido, rol')
    .eq('id', user.id)
    .single()

  return (
    <div className="flex h-screen bg-page">
      <Sidebar usuario={usuario} />
      <main className="flex-1 overflow-y-auto p-6">{children}</main>
    </div>
  )
}
</example>

<example>
// Botón de logout sin "use client"
<form action={logout}>
  <button type="submit">Cerrar sesión</button>
</form>
</example>
</examples>

<output>
- `src/app/(dashboard)/layout.tsx` — verifica sesión, renderiza sidebar + children
- `src/components/layout/sidebar.tsx` — logo, nav vacía, nombre/rol del usuario y botón de logout al pie
- `src/app/(dashboard)/inicio/page.tsx` — card de bienvenida con nombre, apellido y badge de rol
</output>
```
