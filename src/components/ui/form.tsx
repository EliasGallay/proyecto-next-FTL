'use client'

import * as React from 'react'
import { Controller, FormProvider, get, useFormContext, type ControllerProps, type FieldPath, type FieldValues } from 'react-hook-form'
import { cn } from '@/lib/utils'
import { Label } from './label'

export const Form = FormProvider
const FormFieldContext = React.createContext<{ name: string } | undefined>(undefined)

export function FormField<TFieldValues extends FieldValues, TName extends FieldPath<TFieldValues>>(props: ControllerProps<TFieldValues, TName>) {
  return <FormFieldContext.Provider value={{ name: props.name }}><Controller {...props} /></FormFieldContext.Provider>
}

export function FormItem({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) { return <div className={cn('space-y-2', className)} {...props} /> }
export function FormLabel({ className, ...props }: React.ComponentProps<typeof Label>) { return <Label className={cn(className)} {...props} /> }
export function FormControl({ children }: { children: React.ReactNode }) { return <>{children}</> }
export function FormDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) { return <p className={cn('text-sm text-foreground-secondary', className)} {...props} /> }
export function FormMessage({ className, children }: React.HTMLAttributes<HTMLParagraphElement>) {
  const field = React.useContext(FormFieldContext)
  const { formState } = useFormContext()
  const message = field ? get(formState.errors, field.name)?.message : undefined
  if (!message && !children) return null
  return <p className={cn('text-sm font-medium text-danger', className)}>{message?.toString() ?? children}</p>
}
