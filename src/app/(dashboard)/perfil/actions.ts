'use server'

import { createSupabaseServerClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { revalidatePath } from 'next/cache'
import { CV_MAX_BYTES } from './cv-limites'

const CV_BUCKET = 'curricula'
const CV_ALLOWED_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
])
const CV_ALLOWED_EXTS = new Set(['pdf', 'doc', 'docx'])

type ActionResult = { ok: true } | { ok: false; error: string }

function nombreSeguro(nombre: string) {
  const base = nombre.replace(/\.[^.]+$/, '')
  const limpio = base
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
  return limpio || 'cv'
}

export async function actualizarPerfil(formData: FormData): Promise<ActionResult> {
  try {
    const supabase = await createSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { ok: false, error: 'No autenticado' }

    const { data: usuarioRol } = await supabase.from('usuarios').select('rol').eq('id', user.id).single()
    if (usuarioRol?.rol !== 'postulante') return { ok: false, error: 'Acción no disponible para tu tipo de cuenta' }

    const nombre = (formData.get('nombre') as string | null)?.trim() ?? ''
    const apellido = (formData.get('apellido') as string | null)?.trim() ?? ''
    const telefono = (formData.get('telefono') as string | null)?.trim() ?? ''
    const dni = (formData.get('dni') as string | null)?.trim() ?? ''

    if (!nombre || !apellido || !telefono || !dni) {
      return { ok: false, error: 'Todos los campos son obligatorios' }
    }

    const { error: errorUsuario } = await supabase
      .from('usuarios')
      .update({ nombre, apellido, telefono })
      .eq('id', user.id)

    if (errorUsuario) return { ok: false, error: 'No se pudieron actualizar los datos personales' }

    const { error: errorPostulante } = await supabase
      .from('postulantes')
      .update({ dni })
      .eq('usuario_id', user.id)

    if (errorPostulante) {
      if (errorPostulante.code === '23505') {
        return { ok: false, error: 'Ese DNI ya está registrado en otra cuenta' }
      }
      return { ok: false, error: 'No se pudo actualizar el DNI' }
    }

    revalidatePath('/perfil')
    return { ok: true }
  } catch {
    return { ok: false, error: 'Error inesperado al actualizar el perfil' }
  }
}

export async function subirCv(formData: FormData): Promise<ActionResult> {
  try {
    const supabase = await createSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { ok: false, error: 'No autenticado' }

    const { data: usuarioRol } = await supabase.from('usuarios').select('rol').eq('id', user.id).single()
    if (usuarioRol?.rol !== 'postulante') return { ok: false, error: 'Acción no disponible para tu tipo de cuenta' }

    const archivo = formData.get('cv') as File | null
    if (!archivo || archivo.size === 0) return { ok: false, error: 'Seleccioná un archivo' }
    if (archivo.size > CV_MAX_BYTES) return { ok: false, error: 'El archivo no puede superar 5 MB' }

    const ext = archivo.name.split('.').pop()?.toLowerCase() ?? ''
    if (!CV_ALLOWED_TYPES.has(archivo.type) || !CV_ALLOWED_EXTS.has(ext)) {
      return { ok: false, error: 'Solo se aceptan archivos PDF, DOC o DOCX' }
    }

    // Paso 1: subir nuevo archivo (antes de tocar la DB)
    // El nombre original va en el path para poder mostrarlo en el perfil sin agregar columnas
    const nuevoPath = `${user.id}/${Date.now()}-${nombreSeguro(archivo.name)}.${ext}`
    const bytes = await archivo.arrayBuffer()
    const { error: uploadError } = await supabaseAdmin.storage
      .from(CV_BUCKET)
      .upload(nuevoPath, bytes, { contentType: archivo.type, upsert: false })

    if (uploadError) return { ok: false, error: 'No se pudo subir el archivo. Intentá de nuevo.' }

    // Paso 2: leer el path anterior (para borrarlo después)
    const { data: postulante } = await supabase
      .from('postulantes')
      .select('cv_url')
      .eq('usuario_id', user.id)
      .single()

    const pathAnterior = postulante?.cv_url ?? null

    // Paso 3: actualizar cv_url en la DB
    const { error: updateError } = await supabase
      .from('postulantes')
      .update({ cv_url: nuevoPath })
      .eq('usuario_id', user.id)

    if (updateError) {
      // Rollback: borrar el archivo recién subido para que cv_url siga siendo válido
      await supabaseAdmin.storage.from(CV_BUCKET).remove([nuevoPath])
      return { ok: false, error: 'No se pudo guardar el CV. El archivo fue eliminado.' }
    }

    // Paso 4: borrar archivo anterior (best-effort)
    if (pathAnterior) {
      await supabaseAdmin.storage.from(CV_BUCKET).remove([pathAnterior])
    }

    revalidatePath('/perfil')
    return { ok: true }
  } catch {
    return { ok: false, error: 'Error inesperado al subir el CV' }
  }
}

export async function eliminarCv(): Promise<ActionResult> {
  try {
    const supabase = await createSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { ok: false, error: 'No autenticado' }

    const { data: usuarioRol } = await supabase.from('usuarios').select('rol').eq('id', user.id).single()
    if (usuarioRol?.rol !== 'postulante') return { ok: false, error: 'Acción no disponible para tu tipo de cuenta' }

    const { data: postulante } = await supabase
      .from('postulantes')
      .select('cv_url')
      .eq('usuario_id', user.id)
      .single()

    if (!postulante?.cv_url) return { ok: false, error: 'No hay CV cargado para eliminar' }

    const { error: storageError } = await supabaseAdmin.storage
      .from(CV_BUCKET)
      .remove([postulante.cv_url])

    if (storageError) return { ok: false, error: 'No se pudo eliminar el archivo del almacenamiento' }

    const { error: updateError } = await supabase
      .from('postulantes')
      .update({ cv_url: null })
      .eq('usuario_id', user.id)

    if (updateError) {
      return { ok: false, error: 'El archivo fue eliminado pero no se pudo actualizar el perfil' }
    }

    revalidatePath('/perfil')
    return { ok: true }
  } catch {
    return { ok: false, error: 'Error inesperado al eliminar el CV' }
  }
}
