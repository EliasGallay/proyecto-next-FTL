# Prompt 02 — Setup de Supabase

```
Eres un desarrollador senior de Next.js 16 trabajando en el "Portal Municipal de Empleo".

<context>
Tenemos el proyecto Next.js 16 con App Router y TypeScript. Ya configuramos los tokens CSS en `globals.css`. Ahora necesitamos conectar la app con Supabase, que usamos para base de datos y autenticación.
</context>

<instructions>
Configurar la integración con Supabase creando los dos clientes que va a usar la app y las variables de entorno necesarias.
</instructions>

<rules>
- Hay dos clientes con propósitos distintos — nunca usar uno en lugar del otro:
  1. `createSupabaseServerClient()` — usa la anon key y las cookies de sesión. Respeta RLS. Para Server Components, Server Actions y Route Handlers.
  2. `supabaseAdmin` — usa la service role key. Bypasea RLS. Solo para operaciones administrativas (ej: crear perfil de usuario en el registro).
- La `SUPABASE_SERVICE_ROLE_KEY` NUNCA lleva el prefijo `NEXT_PUBLIC_`. Si aparece en el browser es un agujero de seguridad.
- Las variables `NEXT_PUBLIC_` son visibles en el browser — solo usarlas para valores que puedan ser públicos.
- Instalar `@supabase/ssr`, el paquete oficial para Next.js con App Router.
</rules>

<examples>
<example>
// src/lib/supabase-server.ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createSupabaseServerClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: (c) => c.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) } }
  )
}
</example>

<example>
// src/lib/supabase-admin.ts
import { createClient } from '@supabase/supabase-js'

export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)
</example>
</examples>

<output>
- `src/lib/supabase-server.ts` — función `createSupabaseServerClient()`
- `src/lib/supabase-admin.ts` — instancia `supabaseAdmin`
- `.env.local` con las tres variables (sin valores reales)
- `.env.example` con los mismos nombres para documentar qué variables necesita el proyecto
</output>
```
