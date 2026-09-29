'use client'

import { useTransition, useState } from 'react'
import { useRouter } from 'next/navigation'
import { LogIn } from 'lucide-react'
import { LoginForm, type LoginFormValues } from '@/components/auth/login-form'
import { login } from '../actions'

export default function LoginPage() {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState('')

  function handleSubmit(values: LoginFormValues) {
    setError('')
    startTransition(async () => {
      const result = await login(values.email, values.password)
      if (!result.ok) setError(result.error ?? 'Error inesperado')
      else router.push('/inicio')
    })
  }

  return (
    <div className="relative w-full max-w-lg overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10 shadow-elevated motion-safe:animate-enter-from-below motion-safe:[animation-delay:120ms]">
      <div className="p-6 sm:p-8">
        <div className="flex items-start gap-4">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary-100 text-primary-600 sm:size-12">
            <LogIn className="size-5 sm:size-6" aria-hidden />
          </span>
          <div className="flex min-w-0 flex-col gap-1 pt-0.5">
            <h2 className="text-2xl leading-8 font-semibold tracking-tight text-foreground">Iniciar sesión</h2>
            <p className="text-sm text-muted-foreground">Accedé con tus credenciales para continuar.</p>
          </div>
        </div>
        <LoginForm onSubmit={handleSubmit} pending={pending} error={error} />
      </div>
    </div>
  )
}
