'use server'

import { createSupabaseServerClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { redirect } from 'next/navigation'

export async function login(email: string, password: string) {
  try {
    const supabase = await createSupabaseServerClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) return { ok: false, error: 'Email o contraseña incorrectos' }
    return { ok: true }
  } catch {
    return { ok: false, error: 'Error inesperado al iniciar sesión' }
  }
}

export async function registrarPostulante(data: {
  nombre: string
  apellido: string
  dni: string
  telefono: string
  email: string
  password: string
}) {
  try {
    const supabase = await createSupabaseServerClient()

    const { data: authData, error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
    })

    if (error || !authData.user) {
      return { ok: false, error: error?.message ?? 'No se pudo crear la cuenta' }
    }

    const userId = authData.user.id

    const { error: errorUsuario } = await supabaseAdmin
      .from('usuarios')
      .insert({ id: userId, nombre: data.nombre, apellido: data.apellido, telefono: data.telefono, rol: 'postulante' })

    if (errorUsuario) {
      await supabaseAdmin.auth.admin.deleteUser(userId)
      if (errorUsuario.code === '23505') {
        return { ok: false, error: 'Ya existe una cuenta con ese email' }
      }
      return { ok: false, error: 'No se pudo crear el perfil' }
    }

    const { error: errorPostulante } = await supabaseAdmin
      .from('postulantes')
      .insert({ usuario_id: userId, dni: data.dni })

    if (errorPostulante) {
      await supabaseAdmin.auth.admin.deleteUser(userId)
      if (errorPostulante.code === '23505') {
        return { ok: false, error: 'Ya existe una cuenta con ese DNI' }
      }
      return { ok: false, error: 'No se pudo crear el perfil' }
    }

    return { ok: true }
  } catch {
    return { ok: false, error: 'Error inesperado al crear la cuenta' }
  }
}

export async function registrarEmpresa(data: {
  razon_social: string
  cuit: string
  rubro: string
  nombre: string
  apellido: string
  telefono: string
  email: string
  password: string
}) {
  try {
    const supabase = await createSupabaseServerClient()

    const { data: authData, error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
    })

    if (error || !authData.user) {
      return { ok: false, error: error?.message ?? 'No se pudo crear la cuenta' }
    }

    const userId = authData.user.id

    const { error: errorUsuario } = await supabaseAdmin
      .from('usuarios')
      .insert({ id: userId, nombre: data.nombre, apellido: data.apellido, telefono: data.telefono, rol: 'empresa' })

    if (errorUsuario) {
      await supabaseAdmin.auth.admin.deleteUser(userId)
      if (errorUsuario.code === '23505') {
        return { ok: false, error: 'Ya existe una cuenta con ese email o DNI' }
      }
      return { ok: false, error: 'No se pudo crear el perfil' }
    }

    const { error: errorEmpresa } = await supabaseAdmin
      .from('empresas')
      .insert({ usuario_id: userId, razon_social: data.razon_social, cuit: data.cuit, rubro: data.rubro })

    if (errorEmpresa) {
      await supabaseAdmin.auth.admin.deleteUser(userId)
      if (errorEmpresa.code === '23505') {
        return { ok: false, error: 'Ya existe una empresa registrada con ese CUIT' }
      }
      return { ok: false, error: 'No se pudo crear el perfil de empresa' }
    }

    return { ok: true }
  } catch {
    return { ok: false, error: 'Error inesperado al crear la cuenta' }
  }
}

export async function logout() {
  const supabase = await createSupabaseServerClient()
  await supabase.auth.signOut()
  redirect('/auth/login')
}
