import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { PerfilForm } from './perfil-form'
import { CvUpload } from './cv-upload'

const CV_BUCKET = 'curricula'

// Paths con formato `<usuario>/<timestamp>-<nombre>.<ext>`; los subidos antes no tienen nombre
function datosCv(path: string) {
  const archivo = path.split('/').pop() ?? ''
  const match = archivo.match(/^(\d+)(?:-(.+))?\.(\w+)$/)
  if (!match) return { nombre: archivo, fecha: null }

  const [, timestamp, nombre, ext] = match
  const fecha = new Date(Number(timestamp)).toLocaleDateString('es-AR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'America/Argentina/Buenos_Aires',
  })
  return { nombre: `${nombre ?? 'curriculum'}.${ext}`, fecha }
}

export default async function PerfilPage() {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: usuario } = await supabase
    .from('usuarios')
    .select('nombre, apellido, telefono, rol')
    .eq('id', user.id)
    .single()

  if (usuario?.rol !== 'postulante') redirect('/inicio')

  const { data: postulante } = await supabase
    .from('postulantes')
    .select('dni, cv_url')
    .eq('usuario_id', user.id)
    .single()

  let cvFirmadaUrl: string | null = null
  let cv: { nombre: string; fecha: string | null } | null = null
  if (postulante?.cv_url) {
    cv = datosCv(postulante.cv_url)
    const { data } = await supabaseAdmin.storage
      .from(CV_BUCKET)
      .createSignedUrl(postulante.cv_url, 3600)
    cvFirmadaUrl = data?.signedUrl ?? null
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Mi perfil</h1>
        <p className="mt-1 text-sm text-foreground-secondary">
          Tus datos personales y tu currículum vitae.
        </p>
      </div>

      <section className="rounded-xl bg-surface p-4 shadow-card sm:p-6">
        <h2 className="mb-4 text-base font-semibold text-foreground">Datos personales</h2>
        <PerfilForm
          defaultValues={{
            nombre: usuario?.nombre ?? '',
            apellido: usuario?.apellido ?? '',
            telefono: usuario?.telefono ?? '',
            dni: postulante?.dni ?? '',
          }}
        />
      </section>

      <section className="rounded-xl bg-surface p-4 shadow-card sm:p-6">
        <h2 className="mb-4 text-base font-semibold text-foreground">Currículum vitae</h2>
        <CvUpload cvUrl={cvFirmadaUrl} cv={cv} />
      </section>
    </div>
  )
}
