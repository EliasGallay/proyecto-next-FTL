'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowRight, LoaderCircle } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'

const schema = z.object({
  email: z.string().email('Ingresá un email válido'),
})
export type RecuperarContrasenaFormValues = z.infer<typeof schema>

export function RecuperarContrasenaForm({
  onSubmit,
  pending = false,
  error = '',
}: {
  onSubmit?: (values: RecuperarContrasenaFormValues) => void
  pending?: boolean
  error?: string
}) {
  const form = useForm<RecuperarContrasenaFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '' },
  })

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit((values) => onSubmit?.(values))} className="mt-8 space-y-5">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel htmlFor="recuperar-email">Email</FormLabel>
              <FormControl>
                <Input id="recuperar-email" type="email" autoComplete="email" {...field} />
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
            ? <><LoaderCircle className="motion-safe:animate-spin" aria-hidden />Enviando...</>
            : <>Enviar enlace<ArrowRight className="transition-transform duration-200 group-hover:translate-x-0.75 motion-reduce:transition-none" aria-hidden /></>
          }
        </Button>
      </form>
    </Form>
  )
}
