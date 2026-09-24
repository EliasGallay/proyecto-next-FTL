-- ============================================================
-- Portal Municipal de Empleo — Migración inicial
-- Ejecutar en Supabase Dashboard → SQL Editor
-- ============================================================
--
-- ⚠️  CONFIGURACIÓN DE RLS PARA ESTA IMPLEMENTACIÓN
-- ------------------------------------------------------------
-- Esta rama implementa un CRUD básico de ofertas SIN autenticación.
-- Para que las operaciones desde el cliente funcionen, RLS debe
-- estar deshabilitado en la tabla `ofertas`.
--
-- Cómo deshabilitarlo en Supabase Dashboard:
--   Table Editor → ofertas → RLS disabled
--   (o ejecutar: ALTER TABLE ofertas DISABLE ROW LEVEL SECURITY;)
--
-- Tablas que requieren RLS deshabilitado en esta implementación:
--   - ofertas       → SELECT, INSERT, UPDATE, DELETE desde el cliente
--
-- Tablas donde RLS puede permanecer habilitado (no se usan en el CRUD):
--   - usuarios, empresas, postulantes, categorias, postulante_categorias
--   - oferta_categorias, postulaciones, derivaciones
--
-- ⚠️  IMPORTANTE: antes de agregar autenticación, volver a habilitar
-- RLS en `ofertas` y definir políticas por rol (ver rama
-- feat/supabase-integration → migration_002_rls_policies.sql).
-- ============================================================

-- ------------------------------------------------------------
-- EXTENSIONES
-- ------------------------------------------------------------
create extension if not exists "pgcrypto";

-- ------------------------------------------------------------
-- TIPOS ENUMERADOS
-- ------------------------------------------------------------
create type estado_oferta      as enum ('borrador', 'activa', 'cerrada');
create type estado_postulacion as enum ('recibida', 'en_revision', 'derivada', 'rechazada_municipalidad');
create type estado_empresa     as enum ('pendiente', 'en_proceso', 'contratado', 'rechazado');
create type rol_usuario        as enum ('postulante', 'empresa', 'municipalidad');

-- ------------------------------------------------------------
-- USUARIOS
-- id coincide con auth.users.id de Supabase
-- ------------------------------------------------------------
create table usuarios (
  id         uuid primary key,
  nombre     text        not null,
  apellido   text        not null,
  dni        text        not null unique,
  email      text        not null unique,
  rol        rol_usuario not null,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- EMPRESAS
-- ------------------------------------------------------------
create table empresas (
  id           uuid primary key default gen_random_uuid(),
  usuario_id   uuid        not null unique references usuarios(id) on delete cascade,
  razon_social text        not null default '',
  cuit         text        not null default '' unique,
  descripcion  text,
  created_at   timestamptz not null default now()
);

-- ------------------------------------------------------------
-- POSTULANTES
-- ------------------------------------------------------------
create table postulantes (
  id         uuid primary key default gen_random_uuid(),
  usuario_id uuid        not null unique references usuarios(id) on delete cascade,
  cv_url     text,
  telefono   text,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- CATEGORÍAS LABORALES
-- ------------------------------------------------------------
create table categorias (
  id     uuid primary key default gen_random_uuid(),
  nombre text not null unique
);

-- ------------------------------------------------------------
-- RELACIÓN POSTULANTE ↔ CATEGORÍAS  (N:M)
-- ------------------------------------------------------------
create table postulante_categorias (
  postulante_id uuid not null references postulantes(id) on delete cascade,
  categoria_id  uuid not null references categorias(id)  on delete cascade,
  primary key (postulante_id, categoria_id)
);

-- ------------------------------------------------------------
-- OFERTAS LABORALES
-- empresa_nombre como texto libre (sin FK a empresas)
-- ------------------------------------------------------------
create table ofertas (
  id             uuid          primary key default gen_random_uuid(),
  empresa_nombre text          not null,
  titulo         text          not null,
  descripcion    text          not null,
  estado         estado_oferta not null default 'activa',
  created_at     timestamptz   not null default now()
);

-- ------------------------------------------------------------
-- RELACIÓN OFERTA ↔ CATEGORÍAS  (N:M)
-- ------------------------------------------------------------
create table oferta_categorias (
  oferta_id    uuid not null references ofertas(id)    on delete cascade,
  categoria_id uuid not null references categorias(id) on delete cascade,
  primary key (oferta_id, categoria_id)
);

-- ------------------------------------------------------------
-- POSTULACIONES
-- unique(oferta_id, postulante_id) previene doble postulación
-- ------------------------------------------------------------
create table postulaciones (
  id            uuid               primary key default gen_random_uuid(),
  oferta_id     uuid               not null references ofertas(id)     on delete cascade,
  postulante_id uuid               not null references postulantes(id) on delete cascade,
  estado        estado_postulacion not null default 'recibida',
  created_at    timestamptz        not null default now(),
  unique (oferta_id, postulante_id)
);

-- ------------------------------------------------------------
-- DERIVACIONES
-- ------------------------------------------------------------
create table derivaciones (
  id                       uuid           primary key default gen_random_uuid(),
  postulacion_id           uuid           not null unique references postulaciones(id) on delete cascade,
  municipalidad_usuario_id uuid           not null references usuarios(id),
  nota_municipalidad       text,
  estado_empresa           estado_empresa not null default 'pendiente',
  nota_empresa             text,
  created_at               timestamptz    not null default now(),
  updated_at               timestamptz    not null default now()
);

-- ------------------------------------------------------------
-- DATOS INICIALES — categorías laborales
-- ------------------------------------------------------------
insert into categorias (nombre) values
  ('Administración'),
  ('Comercio y Ventas'),
  ('Construcción'),
  ('Educación'),
  ('Gastronomía'),
  ('Informática y Tecnología'),
  ('Logística y Transporte'),
  ('Salud'),
  ('Seguridad'),
  ('Servicios Generales')
on conflict (nombre) do nothing;
