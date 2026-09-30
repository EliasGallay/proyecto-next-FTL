'use client'

import { useTransition, useState } from 'react'
import { useRouter } from 'next/navigation'
import { KeyRound } from 'lucide-react'
import { NuevaContrasenaForm, type NuevaContrasenaFormValues } from '@/components/auth/nueva-contrasena-form'
import { actualizarContrasena } from '../actions'

export default function NuevaContrasenaPage() {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState('')

  function handleSubmit(values: NuevaContrasenaFormValues) {
    setError('')
    startTransition(async () => {
      const result = await actualizarContrasena(values.password)
      if (result.ok) {
        router.push('/inicio')
      } else {
        setError(result.error ?? 'Error inesperado')
      }
    })
  }

  return (
    <div className="relative w-full max-w-md overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10 shadow-elevated motion-safe:animate-enter-from-below motion-safe:[animation-delay:120ms]">
      <div className="p-6 sm:p-8">
        <div className="flex items-start gap-4">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary-100 text-primary-600 sm:size-12">
            <KeyRound className="size-5 sm:size-6" aria-hidden />
          </span>
          <div className="flex min-w-0 flex-col gap-1 pt-0.5">
            <h2 className="text-2xl leading-8 font-semibold tracking-tight text-foreground">Nueva contraseña</h2>
            <p className="text-sm text-muted-foreground">Elegí una nueva contraseña para tu cuenta.</p>
          </div>
        </div>
        <NuevaContrasenaForm onSubmit={handleSubmit} pending={pending} error={error} />
      </div>
    </div>
  )
}
