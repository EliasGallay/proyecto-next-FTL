# Prompt 08 — Módulo de postulaciones

```
Eres un desarrollador senior de Next.js 16 trabajando en el "Portal Municipal de Empleo".

<context>
Tenemos el módulo de ofertas funcionando. Las tablas relevantes son:

- `postulantes` (id, usuario_id, dni, cv_url)
- `postulaciones` (id, oferta_id, postulante_id, estado, created_at)
  - `estado`: `'recibida' | 'en_revision' | 'derivada' | 'rechazada_municipalidad'`
  - `unique(oferta_id, postulante_id)` — un postulante no puede aplicar dos veces a la misma oferta
- `derivaciones` (id, postulacion_id, municipalidad_usuario_id, nota_municipalidad, estado_empresa, nota_empresa)
  - `estado_empresa`: `'pendiente' | 'en_proceso' | 'contratado' | 'rechazado'`
</context>

<instructions>
Implementar el flujo completo de postulación en tres partes:

1. Vista del postulante — botón "Postularme" en `/ofertas/[id]`. Si ya aplicó, mostrar estado actual.
2. Vista de la municipalidad — listado de postulaciones, cambio de estado y derivación a empresa.
3. Vista de la empresa — ver derivaciones recibidas y actualizar estado + nota.
</instructions>

<rules>
- El `postulante_id` se obtiene SIEMPRE de la sesión del servidor, nunca del formulario o de la URL — es una decisión de autorización.
- Verificar el rol correspondiente en cada Server Action: `postularse` solo postulante, `derivar` solo municipalidad, `actualizarDerivacion` solo la empresa dueña de esa derivación.
- Para verificar que una empresa es dueña de una derivación, hacer el join en la query en lugar de confiar en un id del cliente.
- Código Postgres `23505` en postulaciones = el postulante ya aplicó a esa oferta.
</rules>

<examples>
<example>
// Obtener postulante_id desde la sesión — nunca del formulario
const { data: { user } } = await supabase.auth.getUser()
const { data: postulante } = await supabase
  .from('postulantes')
  .select('id')
  .eq('usuario_id', user.id)
  .single()

const { error } = await supabase
  .from('postulaciones')
  .insert({ oferta_id: ofertaId, postulante_id: postulante.id })

if (error?.code === '23505') return { ok: false, error: 'Ya aplicaste a esta oferta' }
</example>

<example>
// Verificar que la empresa es dueña de la derivación antes de actualizar
const { data: derivacion } = await supabase
  .from('derivaciones')
  .select('id, postulaciones(ofertas(empresa_id))')
  .eq('id', derivacionId)
  .single()

const empresaId = derivacion?.postulaciones?.ofertas?.empresa_id
const { data: empresa } = await supabase
  .from('empresas').select('id').eq('usuario_id', user.id).single()

if (empresaId !== empresa.id) return { ok: false, error: 'Sin permiso' }
</example>
</examples>

<output>
- `src/app/ofertas/actions.ts` — agregar `postularse(ofertaId)`
- `src/app/(dashboard)/municipalidad/postulaciones/` — listado con cambio de estado y derivación
- `src/app/(dashboard)/municipalidad/postulaciones/actions.ts` — `cambiarEstado`, `derivar`
- `src/app/(dashboard)/empresa/derivaciones/` — listado de derivaciones recibidas
- `src/app/(dashboard)/empresa/derivaciones/actions.ts` — `actualizarDerivacion`
- Botón "Postularme" en `/ofertas/[id]` que muestra el estado actual si ya aplicó
</output>
```
