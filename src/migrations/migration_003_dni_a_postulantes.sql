-- ============================================================
-- Portal Municipal de Empleo — Migración 003
-- Ejecutar en Supabase Dashboard → SQL Editor
-- ============================================================

-- El DNI pertenece al perfil del postulante, no a la cuenta de usuario.
-- Los usuarios de tipo empresa se identifican con CUIT, no con DNI.
alter table postulantes add column dni text unique;
alter table usuarios    drop column dni;
