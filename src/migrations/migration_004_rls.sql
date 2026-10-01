-- ============================================================
-- Portal Municipal de Empleo — Migración 004
-- Ejecutar en Supabase Dashboard → SQL Editor
-- ============================================================
-- Habilita RLS en todas las tablas y define políticas por rol.
--
-- Contexto de clientes:
--   supabaseAdmin (service role) → bypasses RLS — usado en server actions
--   createSupabaseServerClient   → respeta RLS — usa sesión del usuario
--   supabase (anon)              → respeta RLS — sin sesión, rol anon
--
-- Limitación conocida: `ofertas` no tiene FK a `empresas`.
-- Hasta que se agregue `ofertas.empresa_id`, no se puede restringir
-- a cada empresa a ver/editar solo sus propias ofertas.
-- ============================================================

-- ------------------------------------------------------------
-- Función auxiliar: rol del usuario autenticado actual
-- ------------------------------------------------------------
create or replace function rol_actual()
returns rol_usuario
language sql
security definer
stable
as $$
  select rol from usuarios where id = auth.uid()
$$;

-- ------------------------------------------------------------
-- Habilitar RLS
-- ------------------------------------------------------------
alter table usuarios              enable row level security;
alter table postulantes           enable row level security;
alter table empresas              enable row level security;
alter table ofertas               enable row level security;
alter table categorias            enable row level security;
alter table oferta_categorias     enable row level security;
alter table postulante_categorias enable row level security;
alter table postulaciones         enable row level security;
alter table derivaciones          enable row level security;

-- ------------------------------------------------------------
-- USUARIOS
-- ------------------------------------------------------------
create policy "usuarios: ver propio perfil"
  on usuarios for select
  using (auth.uid() = id);

create policy "usuarios: municipalidad ve todos"
  on usuarios for select
  using (rol_actual() = 'municipalidad');

create policy "usuarios: editar propio perfil"
  on usuarios for update
  using (auth.uid() = id);

-- ------------------------------------------------------------
-- POSTULANTES
-- ------------------------------------------------------------
create policy "postulantes: ver propio perfil"
  on postulantes for select
  using (auth.uid() = usuario_id);

create policy "postulantes: municipalidad ve todos"
  on postulantes for select
  using (rol_actual() = 'municipalidad');

create policy "postulantes: editar propio perfil"
  on postulantes for update
  using (auth.uid() = usuario_id);

-- ------------------------------------------------------------
-- EMPRESAS
-- ------------------------------------------------------------
create policy "empresas: ver propio perfil"
  on empresas for select
  using (auth.uid() = usuario_id);

create policy "empresas: municipalidad ve todas"
  on empresas for select
  using (rol_actual() = 'municipalidad');

create policy "empresas: editar propio perfil"
  on empresas for update
  using (auth.uid() = usuario_id);

-- ------------------------------------------------------------
-- OFERTAS
-- Nota: sin empresa_id no se puede filtrar por empresa dueña.
-- Las políticas de escritura se restringen a municipalidad hasta
-- que se agregue la FK. Los inserts de empresa quedan pendientes.
-- ------------------------------------------------------------
create policy "ofertas: lectura pública (activas)"
  on ofertas for select
  using (estado = 'activa');

create policy "ofertas: lectura autenticada (todas)"
  on ofertas for select
  using (rol_actual() in ('empresa', 'municipalidad'));

create policy "ofertas: insertar (empresa o municipalidad)"
  on ofertas for insert
  with check (rol_actual() in ('empresa', 'municipalidad'));

create policy "ofertas: actualizar (municipalidad)"
  on ofertas for update
  using (rol_actual() = 'municipalidad');

create policy "ofertas: eliminar (municipalidad)"
  on ofertas for delete
  using (rol_actual() = 'municipalidad');

-- ------------------------------------------------------------
-- CATEGORÍAS
-- ------------------------------------------------------------
create policy "categorias: lectura pública"
  on categorias for select
  using (true);

create policy "categorias: insertar (municipalidad)"
  on categorias for insert
  with check (rol_actual() = 'municipalidad');

create policy "categorias: actualizar (municipalidad)"
  on categorias for update
  using (rol_actual() = 'municipalidad');

create policy "categorias: eliminar (municipalidad)"
  on categorias for delete
  using (rol_actual() = 'municipalidad');

-- ------------------------------------------------------------
-- OFERTA_CATEGORIAS
-- ------------------------------------------------------------
create policy "oferta_categorias: lectura pública"
  on oferta_categorias for select
  using (true);

create policy "oferta_categorias: insertar (empresa o municipalidad)"
  on oferta_categorias for insert
  with check (rol_actual() in ('empresa', 'municipalidad'));

create policy "oferta_categorias: eliminar (empresa o municipalidad)"
  on oferta_categorias for delete
  using (rol_actual() in ('empresa', 'municipalidad'));

-- ------------------------------------------------------------
-- POSTULANTE_CATEGORIAS
-- ------------------------------------------------------------
create policy "postulante_categorias: ver propias"
  on postulante_categorias for select
  using (
    exists (select 1 from postulantes where id = postulante_id and usuario_id = auth.uid())
    or rol_actual() = 'municipalidad'
  );

create policy "postulante_categorias: insertar propias"
  on postulante_categorias for insert
  with check (
    exists (select 1 from postulantes where id = postulante_id and usuario_id = auth.uid())
  );

create policy "postulante_categorias: eliminar propias"
  on postulante_categorias for delete
  using (
    exists (select 1 from postulantes where id = postulante_id and usuario_id = auth.uid())
  );

-- ------------------------------------------------------------
-- POSTULACIONES
-- ------------------------------------------------------------
create policy "postulaciones: ver propias (postulante)"
  on postulaciones for select
  using (
    exists (select 1 from postulantes where id = postulante_id and usuario_id = auth.uid())
  );

create policy "postulaciones: ver todas (empresa o municipalidad)"
  on postulaciones for select
  using (rol_actual() in ('empresa', 'municipalidad'));

create policy "postulaciones: postular"
  on postulaciones for insert
  with check (
    exists (select 1 from postulantes where id = postulante_id and usuario_id = auth.uid())
  );

create policy "postulaciones: actualizar estado (municipalidad)"
  on postulaciones for update
  using (rol_actual() = 'municipalidad');

create policy "postulaciones: retirar (postulante)"
  on postulaciones for delete
  using (
    exists (select 1 from postulantes where id = postulante_id and usuario_id = auth.uid())
  );

-- ------------------------------------------------------------
-- DERIVACIONES
-- ------------------------------------------------------------
create policy "derivaciones: ver (empresa o municipalidad)"
  on derivaciones for select
  using (rol_actual() in ('empresa', 'municipalidad'));

create policy "derivaciones: insertar (municipalidad)"
  on derivaciones for insert
  with check (rol_actual() = 'municipalidad');

create policy "derivaciones: actualizar (municipalidad)"
  on derivaciones for update
  using (rol_actual() = 'municipalidad');

create policy "derivaciones: eliminar (municipalidad)"
  on derivaciones for delete
  using (rol_actual() = 'municipalidad');
