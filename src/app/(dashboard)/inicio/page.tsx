import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase-server'

const ROL_LABEL: Record<string, string> = {
  postulante: 'Postulante',
  empresa: 'Empresa',
  municipalidad: 'Municipalidad',
}

export default async function InicioPage() {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: usuario } = await supabase
    .from('usuarios')
    .select('nombre, apellido, rol')
    .eq('id', user.id)
    .single()

  return (
    <div className="rounded-xl bg-surface p-6 shadow-card">
      <h1 className="text-2xl font-semibold text-foreground">
        Bienvenido, {usuario?.nombre} {usuario?.apellido}
      </h1>
      <div className="mt-2">
        <span className="inline-flex items-center rounded-full bg-primary-100 px-2.5 py-0.5 text-xs font-medium text-primary-600">
          {ROL_LABEL[usuario?.rol ?? ''] ?? usuario?.rol}
        </span>
      </div>
      <p className="mt-4 text-sm text-foreground-secondary">
        Seleccioná una opción del menú para continuar.
      </p>
    </div>
  )
}
