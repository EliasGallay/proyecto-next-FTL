import Link from 'next/link'
import { MailCheck } from 'lucide-react'

export default function VerificarEmailPage() {
  return (
    <div className="relative w-full max-w-md overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10 shadow-elevated motion-safe:animate-enter-from-below motion-safe:[animation-delay:120ms]">
      <div className="p-6 sm:p-8">
        <div className="flex items-start gap-4">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary-100 text-primary-600 sm:size-12">
            <MailCheck className="size-5 sm:size-6" aria-hidden />
          </span>
          <div className="flex min-w-0 flex-col gap-1 pt-0.5">
            <h2 className="text-2xl leading-8 font-semibold tracking-tight text-foreground">Revisá tu correo</h2>
            <p className="text-sm text-muted-foreground">Te enviamos un enlace de confirmación.</p>
          </div>
        </div>

        <div className="mt-6 space-y-3 rounded-lg bg-primary-50 px-4 py-4 text-sm text-primary-800">
          <p>Abrí el email que te enviamos y hacé clic en el enlace para activar tu cuenta.</p>
          <p className="text-primary-700">Si no lo encontrás, revisá la carpeta de spam.</p>
        </div>

        <div className="mt-6">
          <Link href="/auth/login" className="flex h-8 w-full items-center justify-center rounded-lg border border-input text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
            Volver al inicio de sesión
          </Link>
        </div>
      </div>
    </div>
  )
}
