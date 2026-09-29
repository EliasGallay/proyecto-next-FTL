'use client'

import { useState } from 'react'
import Link from 'next/link'
import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowRight, Eye, EyeOff, LoaderCircle } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'

const loginFormSchema = z.object({
  email: z.string().email('Ingresá un email válido'),
  password: z.string().min(1, 'La contraseña es obligatoria'),
})
export type LoginFormValues = z.infer<typeof loginFormSchema>

export function LoginForm({
  onSubmit,
  pending = false,
  error = '',
}: {
  onSubmit?: (values: LoginFormValues) => void
  pending?: boolean
  error?: string
}) {
  const [showPassword, setShowPassword] = useState(false)
  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: { email: '', password: '' },
  })

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit((values) => onSubmit?.(values))} className="mt-8 space-y-5">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel htmlFor="login-email">Email</FormLabel>
              <FormControl>
                <Input id="login-email" type="email" autoComplete="email" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <div className="flex items-center justify-between gap-3">
                <FormLabel htmlFor="login-password">Contraseña</FormLabel>
                <Link
                  href="/auth/recuperar-contrasena"
                  className="rounded-sm text-sm font-semibold text-primary-600 hover:text-primary-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                >
                  ¿Olvidaste tu contraseña?
                </Link>
              </div>
              <FormControl>
                <div className="relative">
                  <Input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    className="pr-11"
                    {...field}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="absolute top-0.5 right-0.5 text-foreground-secondary hover:text-primary-600"
                    aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                    aria-pressed={showPassword}
                    onClick={() => setShowPassword((v) => !v)}
                  >
                    {showPassword ? <EyeOff /> : <Eye />}
                  </Button>
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {error && (
          <p className="text-sm font-medium text-danger bg-red-50 px-3 py-2 rounded-lg">{error}</p>
        )}

        <Button type="submit" size="lg" className="group mt-2 w-full" disabled={pending}>
          {pending
            ? <><LoaderCircle className="motion-safe:animate-spin" aria-hidden />Ingresando...</>
            : <>Ingresar<ArrowRight className="transition-transform duration-200 group-hover:translate-x-0.75 motion-reduce:transition-none" aria-hidden /></>
          }
        </Button>

        <p className="text-center text-sm text-foreground-secondary">
          ¿No tenés cuenta?{' '}
          <Link
            href="/auth/registro"
            className="font-semibold text-primary-600 hover:text-primary-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 rounded-sm"
          >
            Registrate
          </Link>
        </p>
      </form>
    </Form>
  )
}
