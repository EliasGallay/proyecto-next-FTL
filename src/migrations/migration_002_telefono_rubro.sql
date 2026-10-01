-- ============================================================
-- Portal Municipal de Empleo — Migración 002
-- Ejecutar en Supabase Dashboard → SQL Editor
-- ============================================================

-- Teléfono de contacto en el registro de usuario (postulante y empresa)
alter table usuarios add column telefono text not null default '';
alter table usuarios alter column telefono drop default;

-- Rubro de actividad de la empresa
alter table empresas add column rubro text not null default '';
alter table empresas alter column rubro drop default;
