-- ============================================================
-- Portal Municipal de Empleo — Schema básico
-- Ejecutar en Supabase Dashboard → SQL Editor
-- RLS debe estar deshabilitado en la tabla ofertas
-- ============================================================

create extension if not exists "pgcrypto";

create type estado_oferta as enum ('borrador', 'activa', 'cerrada');

create table ofertas (
  id             uuid          primary key default gen_random_uuid(),
  empresa_nombre text          not null,
  titulo         text          not null,
  descripcion    text          not null,
  estado         estado_oferta not null default 'activa',
  created_at     timestamptz   not null default now()
);
