'use client'

import { useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowRight, Eye, EyeOff, LoaderCircle } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'

const schema = z
  .object({
    password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmPassword'],
  })
export type NuevaContrasenaFormValues = z.infer<typeof schema>

export function NuevaContrasenaForm({
  onSubmit,
  pending = false,
  error = '',
  disabled = false,
}: {
  onSubmit?: (values: NuevaContrasenaFormValues) => void
  pending?: boolean
  error?: string
  disabled?: boolean
}) {
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const form = useForm<NuevaContrasenaFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { password: '', confirmPassword: '' },
  })

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit((values) => onSubmit?.(values))} className="mt-8 space-y-5">
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel htmlFor="nueva-password">Nueva contraseña</FormLabel>
              <FormControl>
                <div className="relative">
                  <Input
                    id="nueva-password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    className="pr-11"
                    disabled={disabled}
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
                    disabled={disabled}
                  >
                    {showPassword ? <EyeOff /> : <Eye />}
                  </Button>
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="confirmPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel htmlFor="nueva-password-confirm">Confirmá la contraseña</FormLabel>
              <FormControl>
                <div className="relative">
                  <Input
                    id="nueva-password-confirm"
                    type={showConfirm ? 'text' : 'password'}
                    autoComplete="new-password"
                    className="pr-11"
                    disabled={disabled}
                    {...field}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="absolute top-0.5 right-0.5 text-foreground-secondary hover:text-primary-600"
                    aria-label={showConfirm ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                    aria-pressed={showConfirm}
                    onClick={() => setShowConfirm((v) => !v)}
                    disabled={disabled}
                  >
                    {showConfirm ? <EyeOff /> : <Eye />}
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

        <Button type="submit" size="lg" className="group mt-2 w-full" disabled={pending || disabled}>
          {pending
            ? <><LoaderCircle className="motion-safe:animate-spin" aria-hidden />Guardando...</>
            : <>Guardar contraseña<ArrowRight className="transition-transform duration-200 group-hover:translate-x-0.75 motion-reduce:transition-none" aria-hidden /></>
          }
        </Button>
      </form>
    </Form>
  )
}
