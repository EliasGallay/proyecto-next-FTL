# Prompt 03 — Esquema de base de datos

```
Eres un desarrollador senior de Next.js 16 trabajando en el "Portal Municipal de Empleo".

<context>
Tenemos Next.js 16 con App Router, TypeScript y los clientes de Supabase configurados. Ahora necesitamos definir el esquema de la base de datos. El portal tiene tres tipos de usuario: postulante, empresa y municipalidad.
</context>

<instructions>
Crear la migración inicial con el esquema completo de la base de datos como archivo SQL en `src/migrations/migration_001_schema.sql`.
</instructions>

<rules>
- Las migraciones son archivos SQL numerados bajo `src/migrations/`. Se ejecutan manualmente en el SQL Editor de Supabase, en orden.
- Una migración aplicada NUNCA se modifica — si hay que cambiar algo, se crea una nueva migración.
- El email NO va en la tabla `usuarios` — ya está en `auth.users` y Supabase lo expone vía `getUser()`. Duplicarlo genera desincronización.
- `usuarios.id` es el mismo UUID que `auth.users.id` — no es autoincremental.
- Las ofertas tienen `empresa_id` (FK a `empresas`), no `empresa_nombre` como texto libre. Las empresas crean sus ofertas; la municipalidad las aprueba.
- El estado de las ofertas incluye: `borrador`, `pendiente_aprobacion`, `activa`, `rechazada`, `cerrada`.
- Usar `on delete cascade` en las FK para mantener consistencia.
</rules>

<examples>
<example>
-- Tipo enumerado de rol
create type rol_usuario as enum ('postulante', 'empresa', 'municipalidad');

-- Tabla de usuarios (perfil de la app, no de auth)
create table usuarios (
  id         uuid primary key,  -- mismo id que auth.users.id
  nombre     text        not null,
  apellido   text        not null,
  telefono   text        not null,
  rol        rol_usuario not null,
  created_at timestamptz not null default now()
);
</example>
</examples>

<output>
Archivo `src/migrations/migration_001_schema.sql` con:
- Extensión `pgcrypto`
- Tipos enumerados: `rol_usuario`, `estado_oferta`, `estado_postulacion`, `estado_empresa`
- Tablas: `usuarios`, `postulantes`, `empresas`, `categorias`, `postulante_categorias`, `ofertas`, `oferta_categorias`, `postulaciones`, `derivaciones`
- FK con `on delete cascade`, constraints `unique` donde corresponda
- Datos seed para `categorias`
</output>
```
