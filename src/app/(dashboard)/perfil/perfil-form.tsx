'use client'

import { useState, useTransition } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { LoaderCircle, Pencil, Save } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { actualizarPerfil } from './actions'

const schema = z.object({
  nombre: z.string().min(1, 'El nombre es obligatorio').max(100),
  apellido: z.string().min(1, 'El apellido es obligatorio').max(100),
  telefono: z.string().min(8, 'El teléfono debe tener al menos 8 caracteres').max(20),
  dni: z.string().regex(/^\d{7,8}$/, 'El DNI debe tener 7 u 8 dígitos'),
})

type PerfilFormValues = z.infer<typeof schema>

type Props = {
  defaultValues: PerfilFormValues
}

export function PerfilForm({ defaultValues }: Props) {
  const [editando, setEditando] = useState(false)
  const [isPending, startTransition] = useTransition()

  const form = useForm<PerfilFormValues>({
    resolver: zodResolver(schema),
    defaultValues,
  })

  function onSubmit(values: PerfilFormValues) {
    const fd = new FormData()
    fd.append('nombre', values.nombre)
    fd.append('apellido', values.apellido)
    fd.append('telefono', values.telefono)
    fd.append('dni', values.dni)

    startTransition(async () => {
      try {
        const result = await actualizarPerfil(fd)
        if (result.ok) {
          form.reset(values)
          setEditando(false)
          toast.success('Datos actualizados correctamente')
        } else {
          toast.error(result.error)
        }
      } catch {
        toast.error('Error inesperado al actualizar el perfil')
      }
    })
  }

  function handleEditar() {
    setEditando(true)
  }

  function handleCancelar() {
    form.reset(defaultValues)
    setEditando(false)
  }

  if (!editando) {
    return (
      <div className="space-y-4">
        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Dato label="Nombre" valor={defaultValues.nombre} />
          <Dato label="Apellido" valor={defaultValues.apellido} />
          <Dato label="Teléfono" valor={defaultValues.telefono} />
          <Dato label="DNI" valor={defaultValues.dni} />
        </dl>

        <Button type="button" variant="outline" onClick={handleEditar} className="min-h-11 gap-2">
            <Pencil className="size-4" aria-hidden />
            Editar
          </Button>
        </div>
      )
    }

    return (
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="nombre"
              render={({ field }) => (
                <FormItem>
                  <FormLabel htmlFor="perfil-nombre">Nombre</FormLabel>
                  <FormControl>
                    <Input id="perfil-nombre" autoComplete="given-name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="apellido"
              render={({ field }) => (
                <FormItem>
                  <FormLabel htmlFor="perfil-apellido">Apellido</FormLabel>
                  <FormControl>
                    <Input id="perfil-apellido" autoComplete="family-name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="telefono"
            render={({ field }) => (
              <FormItem>
                <FormLabel htmlFor="perfil-telefono">Teléfono</FormLabel>
                <FormControl>
                  <Input id="perfil-telefono" type="tel" autoComplete="tel" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="dni"
            render={({ field }) => (
              <FormItem>
                <FormLabel htmlFor="perfil-dni">DNI</FormLabel>
                <FormControl>
                  <Input id="perfil-dni" inputMode="numeric" maxLength={8} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex flex-col-reverse gap-3 sm:flex-row">
            <Button
              type="button"
              variant="outline"
              disabled={isPending}
              onClick={handleCancelar}
              className="min-h-11"
            >
              Cancelar
          </Button>
          <Button type="submit" disabled={isPending} className="min-h-11 gap-2">
          {isPending ? (
            <>
              <LoaderCircle className="size-4 motion-safe:animate-spin" aria-hidden />
              Guardando...
            </>
          ) : (
            <>
              <Save className="size-4" aria-hidden />
              Guardar cambios
            </>
          )}
          </Button>
        </div>
      </form>
    </Form>
  )
}

function Dato({ label, valor }: { label: string; valor: string }) {
  return (
    <div>
      <dt className="text-xs font-medium text-foreground-secondary">{label}</dt>
      <dd className="mt-1 text-sm text-foreground">{valor || '—'}</dd>
    </div>
  )
}
