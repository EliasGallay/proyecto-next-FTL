# Prompt 07 — Módulo de ofertas laborales

```
Eres un desarrollador senior de Next.js 16 trabajando en el "Portal Municipal de Empleo".

<context>
Tenemos autenticación, layout autenticado y RLS configurado. La tabla `ofertas` tiene:

- `id`, `empresa_id` (FK a empresas), `titulo`, `descripcion`, `estado`, `created_at`
- `estado`: `'borrador' | 'pendiente_aprobacion' | 'activa' | 'rechazada' | 'cerrada'`

Flujo de aprobación:
- Empresa crea oferta → estado: `pendiente_aprobacion`
- Municipalidad aprueba → estado: `activa` (se publica)
- Municipalidad rechaza → estado: `rechazada`
- Municipalidad puede crear ofertas directamente en cualquier estado.
</context>

<instructions>
Implementar el módulo de ofertas con cuatro vistas:
1. Listado público `/ofertas` — solo ofertas `activa`. Accesible sin login.
2. Detalle `/ofertas/[id]` — detalle de una oferta activa.
3. Dashboard empresa — formulario para crear ofertas y listado de las propias con su estado.
4. Dashboard municipalidad — listado de ofertas `pendiente_aprobacion` con botones para aprobar o rechazar.
</instructions>

<rules>
- Leer datos en Server Components, llamando directo a Supabase sin fetch.
- Las mutaciones van en Server Actions en `src/app/ofertas/actions.ts`.
- Después de cada mutación llamar `revalidatePath('/ofertas')` para invalidar el caché.
- El `empresa_id` se obtiene SIEMPRE desde la sesión del servidor, nunca del formulario — es una decisión de autorización.
- En rutas dinámicas de Next.js 16, `params` es una Promise — siempre hacer `await params` antes de desestructurar.
- Verificar el rol del usuario en cada Server Action de mutación.
</rules>

<examples>
<example>
// Leer datos en Server Component — sin fetch
const supabase = await createSupabaseServerClient()
const { data: ofertas } = await supabase
  .from('ofertas')
  .select('*')
  .eq('estado', 'activa')
  .order('created_at', { ascending: false })
</example>

<example>
// Obtener empresa_id desde la sesión — nunca del formulario
const { data: { user } } = await supabase.auth.getUser()
const { data: empresa } = await supabase
  .from('empresas')
  .select('id')
  .eq('usuario_id', user.id)
  .single()
// usar empresa.id, nunca un id que vino del formulario
</example>

<example>
// Ruta dinámica en Next.js 16 — params es una Promise
export default async function OfertaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  // ...
}
</example>
</examples>

<output>
- `src/app/ofertas/page.tsx` — listado público
- `src/app/ofertas/[id]/page.tsx` — detalle
- `src/app/ofertas/actions.ts` — `crearOferta`, `aprobarOferta`, `rechazarOferta`
- Vista de empresa en el dashboard: formulario + listado de sus ofertas con estado
- Vista de municipalidad en el dashboard: listado de ofertas pendientes de aprobación
</output>
```
