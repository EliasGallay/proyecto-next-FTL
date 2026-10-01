# Prompt 06 — Row Level Security

```
Eres un desarrollador senior de Next.js 16 trabajando en el "Portal Municipal de Empleo".

<context>
Tenemos autenticación y layout funcionando. La base de datos tiene RLS desactivado, lo que significa que cualquier persona con la anon key puede leer toda la base de datos desde el browser. Necesitamos corregir eso.

Roles del sistema:
- `postulante` — solo ve y edita su propia información.
- `empresa` — ve sus propios datos, crea sus ofertas y ve las derivaciones que le corresponden.
- `municipalidad` — acceso completo de lectura y escritura.
</context>

<instructions>
Crear la migración `src/migrations/migration_004_rls.sql` que habilita RLS en todas las tablas y define las políticas por rol.
</instructions>

<rules>
- Una tabla con RLS activado pero SIN políticas bloquea TODOS los accesos, incluso los del propietario.
- Las políticas necesitan saber el rol del usuario, pero ese dato está en `usuarios`, no en el JWT. Hay que crear una función helper `rol_actual()` con `security definer` para consultarlo.
- `security definer` hace que la función corra con los permisos del creador, no del llamador — esto permite leer `usuarios` desde dentro de una política aunque el usuario no tenga acceso directo a esa tabla.
- `auth.uid()` devuelve el UUID del usuario autenticado — usarlo en las políticas para filtrar por propietario.
- `supabaseAdmin` bypasea RLS completamente. Usarlo solo para el registro inicial de usuarios.
- Nombrar las políticas descriptivamente: `"ofertas: lectura pública (activas)"`, `"postulantes: solo su perfil"`.
</rules>

<examples>
<example>
-- Helper function para leer el rol del usuario autenticado
create or replace function rol_actual()
returns rol_usuario
language sql security definer stable
as $$
  select rol from usuarios where id = auth.uid()
$$;

-- Habilitar RLS
alter table ofertas enable row level security;

-- Cualquiera puede leer ofertas activas (sin login)
create policy "ofertas: lectura pública (activas)"
  on ofertas for select
  using (estado = 'activa');

-- Solo municipalidad aprueba ofertas
create policy "ofertas: solo municipalidad aprueba"
  on ofertas for update
  using (rol_actual() = 'municipalidad');

-- Empresa ve y edita sus propias ofertas
create policy "ofertas: empresa gestiona las suyas"
  on ofertas for all
  using (
    empresa_id in (
      select id from empresas where usuario_id = auth.uid()
    )
  );
</example>
</examples>

<output>
Archivo `src/migrations/migration_004_rls.sql` con:
- `alter table t enable row level security;` para las 9 tablas
- La función `rol_actual()`
- Políticas para: `usuarios`, `postulantes`, `empresas`, `ofertas`, `postulaciones`, `derivaciones`, `categorias`, `postulante_categorias`, `oferta_categorias`
</output>
```
