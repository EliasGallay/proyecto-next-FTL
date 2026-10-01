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

const R = () => <span className="ml-0.5 text-danger" aria-hidden>*</span>

const schema = z.object({
  nombre:          z.string().min(2, 'Ingresá tu nombre'),
  apellido:        z.string().min(2, 'Ingresá tu apellido'),
  email:           z.string().email('Email inválido'),
  confirmar_email: z.string().email('Email inválido'),
  dni:             z.string().regex(/^\d{7,8}$/, 'DNI inválido (7 u 8 dígitos)'),
  telefono:        z.string().regex(/^[\d\s\+\-\(\)]{8,20}$/, 'Teléfono inválido'),
  password:        z.string().min(8, 'Mínimo 8 caracteres'),
  confirmar:       z.string(),
}).refine(d => d.email === d.confirmar_email, {
  message: 'Los emails no coinciden',
  path: ['confirmar_email'],
}).refine(d => d.password === d.confirmar, {
  message: 'Las contraseñas no coinciden',
  path: ['confirmar'],
})

export type RegistroPostulanteValues = z.infer<typeof schema>

export function RegistroPostulanteForm({
  onSubmit,
  pending = false,
  error = '',
}: {
  onSubmit?: (values: RegistroPostulanteValues) => void
  pending?: boolean
  error?: string
}) {
  const [showPassword, setShowPassword] = useState(false)
  const form = useForm<RegistroPostulanteValues>({
    resolver: zodResolver(schema),
    defaultValues: { nombre: '', apellido: '', email: '', confirmar_email: '', dni: '', telefono: '', password: '', confirmar: '' },
  })

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(values => onSubmit?.(values))} className="mt-6 space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField control={form.control} name="nombre" render={({ field }) => (
            <FormItem>
              <FormLabel>Nombre<R /></FormLabel>
              <FormControl><Input autoComplete="given-name" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="apellido" render={({ field }) => (
            <FormItem>
              <FormLabel>Apellido<R /></FormLabel>
              <FormControl><Input autoComplete="family-name" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField control={form.control} name="email" render={({ field }) => (
            <FormItem>
              <FormLabel>Email<R /></FormLabel>
              <FormControl><Input type="email" autoComplete="email" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="confirmar_email" render={({ field }) => (
            <FormItem>
              <FormLabel>Confirmar email<R /></FormLabel>
              <FormControl><Input type="email" autoComplete="off" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField control={form.control} name="dni" render={({ field }) => (
            <FormItem>
              <FormLabel>DNI<R /></FormLabel>
              <FormControl><Input inputMode="numeric" placeholder="12345678" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="telefono" render={({ field }) => (
            <FormItem>
              <FormLabel>Teléfono<R /></FormLabel>
              <FormControl><Input type="tel" autoComplete="tel" placeholder="11 2345 6789" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField control={form.control} name="password" render={({ field }) => (
            <FormItem>
              <FormLabel>Contraseña<R /></FormLabel>
              <FormControl>
                <div className="relative">
                  <Input type={showPassword ? 'text' : 'password'} autoComplete="new-password" className="pr-11" {...field} />
                  <Button type="button" variant="ghost" size="icon-sm"
                    className="absolute top-0.5 right-0.5 text-foreground-secondary hover:text-primary-600"
                    aria-label={showPassword ? 'Ocultar' : 'Mostrar'}
                    aria-pressed={showPassword}
                    onClick={() => setShowPassword(v => !v)}>
                    {showPassword ? <EyeOff /> : <Eye />}
                  </Button>
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="confirmar" render={({ field }) => (
            <FormItem>
              <FormLabel>Confirmar contraseña<R /></FormLabel>
              <FormControl>
                <div className="relative">
                  <Input type={showPassword ? 'text' : 'password'} autoComplete="new-password" className="pr-11" {...field} />
                  <Button type="button" variant="ghost" size="icon-sm"
                    className="absolute top-0.5 right-0.5 text-foreground-secondary hover:text-primary-600"
                    aria-label={showPassword ? 'Ocultar' : 'Mostrar'}
                    aria-pressed={showPassword}
                    onClick={() => setShowPassword(v => !v)}>
                    {showPassword ? <EyeOff /> : <Eye />}
                  </Button>
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </div>

        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-danger">{error}</p>
        )}

        <Button type="submit" size="lg" className="group mt-2 w-full" disabled={pending}>
          {pending
            ? <><LoaderCircle className="motion-safe:animate-spin" aria-hidden />Creando cuenta...</>
            : <>Crear cuenta<ArrowRight className="transition-transform duration-200 group-hover:translate-x-0.75 motion-reduce:transition-none" aria-hidden /></>
          }
        </Button>

        <p className="text-center text-sm text-foreground-secondary">
          ¿Ya tenés cuenta?{' '}
          <Link href="/auth/login" className="font-semibold text-primary-600 hover:text-primary-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 rounded-sm">
            Iniciá sesión
          </Link>
        </p>
      </form>
    </Form>
  )
}
