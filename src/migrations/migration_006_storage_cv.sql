-- ============================================================
-- Portal Municipal de Empleo — Migración 006
-- Ejecutar en Supabase Dashboard → SQL Editor
-- ============================================================
-- Crea el bucket privado "curricula" para almacenar CVs y
-- define las políticas RLS de storage.objects.
--
-- Depende de: migration_004_rls.sql (función rol_actual())
-- ============================================================

-- ------------------------------------------------------------
-- Bucket privado para currículums vitae
-- file_size_limit: 5 MB; solo PDF y formatos Word
-- ------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'curricula',
  'curricula',
  false,
  5242880,
  array[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
on conflict (id) do nothing;

-- ------------------------------------------------------------
-- RLS en storage.objects para el bucket "curricula"
-- Estructura de path: {usuario_id}/{timestamp}.{ext}
-- (storage.foldername(name))[1] extrae el primer segmento del path
-- ------------------------------------------------------------

-- El postulante puede subir archivos a su propia carpeta
create policy "curricula: postulante sube su cv"
  on storage.objects for insert
  with check (
    bucket_id = 'curricula'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
    and rol_actual() = 'postulante'
  );

-- El postulante lee sus propios archivos; la municipalidad lee todos
create policy "curricula: leer cv"
  on storage.objects for select
  using (
    bucket_id = 'curricula'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or rol_actual() = 'municipalidad'
    )
  );

-- El postulante puede eliminar sus propios archivos
create policy "curricula: postulante elimina su cv"
  on storage.objects for delete
  using (
    bucket_id = 'curricula'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
