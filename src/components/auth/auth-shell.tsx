import type { ReactNode } from 'react'
import Image from 'next/image'
import { Briefcase, ClipboardCheck, Send, type LucideIcon } from 'lucide-react'
import escudoFunes from '@/assets/brand/escudo-funes-blanco.png'
import { Badge } from '@/components/ui/badge'

const highlights: { icon: LucideIcon; title: string; description: string }[] = [
  { icon: Briefcase,      title: 'Ofertas laborales', description: 'Buscá empleos disponibles en el municipio' },
  { icon: Send,           title: 'Postulaciones',     description: 'Aplicá a las ofertas que te interesan' },
  { icon: ClipboardCheck, title: 'Seguimiento',       description: 'Consultá el estado de tus postulaciones' },
]

function InstitutionalPanel() {
  return (
    <section className="relative flex flex-col overflow-hidden bg-sidebar px-6 py-5 text-sidebar-foreground motion-safe:animate-enter-from-left lg:px-14 lg:py-12 lg:short:py-8 xl:px-20">
      <div className="relative z-10 flex items-center gap-4">
        <Image src={escudoFunes} alt="Escudo del Gobierno de la Ciudad de Funes" width={64} height={64} priority className="size-12 shrink-0 lg:size-16" />
        <span className="flex flex-col">
          <span className="text-sm leading-5 font-bold tracking-wide uppercase">Municipalidad de Funes</span>
          <span className="text-sm leading-5 text-sidebar-muted">Portal de Empleo</span>
        </span>
      </div>

      <div className="relative z-10 my-auto hidden max-w-md flex-col py-10 lg:flex lg:short:py-6">
        <Badge className="w-fit border border-sidebar-muted/20 bg-sidebar-hover text-sidebar-foreground">Bolsa de Empleo</Badge>
        <h1 className="mt-6 text-5xl leading-tight font-bold lg:short:mt-4 lg:short:text-4xl">Encontrá tu próximo trabajo</h1>
        <p className="mt-4 text-lg leading-7 text-sidebar-muted lg:short:mt-3 lg:short:text-base lg:short:leading-6">Conectamos postulantes con empleadores de forma ágil y transparente.</p>
        <ul className="mt-10 flex flex-col gap-5 lg:short:mt-6 lg:short:gap-3">
          {highlights.map(({ icon: Icon, title, description }) => (
            <li key={title} className="flex items-center gap-4">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-sidebar-hover text-primary-400">
                <Icon className="size-5" aria-hidden />
              </span>
              <span className="flex flex-col">
                <span className="text-base leading-6 font-semibold">{title}</span>
                <span className="text-sm leading-5 text-sidebar-muted">{description}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>

      <p className="relative z-10 hidden border-t border-sidebar-muted/15 pt-5 text-xs leading-4 text-sidebar-muted lg:block">
        Gobierno de la Ciudad de Funes · Desde 1875
        <br />
        <span className="text-sidebar-muted/60">Desarrollado por estudiantes del Funes Tech Lab · Beex.dev</span>
      </p>

      <div aria-hidden className="pointer-events-none absolute -right-32 -bottom-40 hidden size-136 lg:block">
        <div className="absolute inset-0 rounded-full border border-sidebar-muted/10" />
        <div className="absolute inset-16 rounded-full border border-sidebar-muted/10" />
        <Image src={escudoFunes} alt="" width={352} height={352} className="absolute inset-24 size-88 opacity-5 motion-safe:animate-drift" />
      </div>
    </section>
  )
}

export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <main className="flex min-h-dvh flex-col bg-page lg:grid lg:h-dvh lg:grid-cols-[46fr_54fr]">
      <InstitutionalPanel />
      <section className="relative flex flex-1 flex-col items-center overflow-x-hidden overflow-y-auto px-4 py-10 sm:px-8">
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="absolute -top-40 -right-32 size-120 rounded-full bg-primary-50 motion-safe:animate-drift" />
          <div className="absolute -bottom-32 -left-24 size-96 rounded-full border border-primary-100" />
          <div className="absolute -bottom-12 -left-4 size-56 rounded-full border border-primary-100" />
        </div>
        <div className="relative z-10 my-auto w-full flex justify-center">
          {children}
        </div>
      </section>
    </main>
  )
}
