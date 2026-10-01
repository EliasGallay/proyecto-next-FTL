'use client'

import { useTransition, useState, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { UserPlus } from 'lucide-react'
import { RegistroPostulanteForm, type RegistroPostulanteValues } from '@/components/auth/registro-postulante-form'
import { RegistroEmpresaForm, type RegistroEmpresaValues } from '@/components/auth/registro-empresa-form'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { registrarPostulante, registrarEmpresa } from '../actions'

function AnimatedHeight({ children, className }: { children: React.ReactNode; className?: string }) {
  const outerRef = useRef<HTMLDivElement>(null)
  const innerRef = useRef<HTMLDivElement>(null)

  const sync = useCallback(() => {
    if (outerRef.current && innerRef.current) {
      outerRef.current.style.height = `${innerRef.current.scrollHeight}px`
    }
  }, [])

  useEffect(() => {
    const inner = innerRef.current
    if (!inner) return
    const ro = new ResizeObserver(sync)
    ro.observe(inner)
    sync()
    return () => ro.disconnect()
  }, [sync])

  return (
    <div
      ref={outerRef}
      className={`overflow-hidden motion-safe:transition-[height] motion-safe:duration-300 motion-safe:ease-in-out${className ? ` ${className}` : ''}`}
    >
      <div ref={innerRef}>{children}</div>
    </div>
  )
}

export default function RegistroPage() {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState('')

  function handlePostulante(values: RegistroPostulanteValues) {
    setError('')
    startTransition(async () => {
      const result = await registrarPostulante(values)
      if (!result.ok) setError(result.error ?? 'Error inesperado')
      else router.push('/auth/verificar-email')
    })
  }

  function handleEmpresa(values: RegistroEmpresaValues) {
    setError('')
    startTransition(async () => {
      const result = await registrarEmpresa(values)
      if (!result.ok) setError(result.error ?? 'Error inesperado')
      else router.push('/auth/verificar-email')
    })
  }

  return (
    <div className="relative w-full max-w-xl overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10 shadow-elevated motion-safe:animate-enter-from-below motion-safe:[animation-delay:120ms]">
      <div className="p-6 sm:p-8">
        <div className="flex items-start gap-4">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary-100 text-primary-600 sm:size-12">
            <UserPlus className="size-5 sm:size-6" aria-hidden />
          </span>
          <div className="flex min-w-0 flex-col gap-1 pt-0.5">
            <h2 className="text-2xl leading-8 font-semibold tracking-tight text-foreground">Crear cuenta</h2>
            <p className="text-sm text-muted-foreground">Elegí tu tipo de cuenta para comenzar.</p>
          </div>
        </div>

        <AnimatedHeight className="mt-6">
          <Tabs defaultValue="postulante" className="flex-col" onValueChange={() => setError('')}>
            <TabsList className="h-10 w-full">
              <TabsTrigger value="postulante" className="flex-1">Soy postulante</TabsTrigger>
              <TabsTrigger value="empresa" className="flex-1">Soy empresa</TabsTrigger>
            </TabsList>
            <TabsContent value="postulante">
              <RegistroPostulanteForm onSubmit={handlePostulante} pending={pending} error={error} />
            </TabsContent>
            <TabsContent value="empresa">
              <RegistroEmpresaForm onSubmit={handleEmpresa} pending={pending} error={error} />
            </TabsContent>
          </Tabs>
        </AnimatedHeight>
      </div>
    </div>
  )
}
