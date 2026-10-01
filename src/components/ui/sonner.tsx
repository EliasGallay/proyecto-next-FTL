"use client"

import { Toaster as Sonner, type ToasterProps } from "sonner"
import { CheckIcon, InfoIcon, TriangleAlertIcon, XIcon, Loader2Icon } from "lucide-react"
import { cn } from "@/lib/utils"

function ToastIcon({ className, children }: { className: string; children: React.ReactNode }) {
  return (
    <span className={cn("flex size-7 items-center justify-center rounded-full text-white", className)}>
      {children}
    </span>
  )
}

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="light"
      richColors
      className="toaster group"
      icons={{
        success: (
          <ToastIcon className="bg-primary-600">
            <CheckIcon className="size-4" strokeWidth={3} />
          </ToastIcon>
        ),
        info: (
          <ToastIcon className="bg-primary-500">
            <InfoIcon className="size-4" strokeWidth={2.5} />
          </ToastIcon>
        ),
        warning: (
          <ToastIcon className="bg-amber-500">
            <TriangleAlertIcon className="size-4" strokeWidth={2.5} />
          </ToastIcon>
        ),
        error: (
          <ToastIcon className="bg-danger">
            <XIcon className="size-4" strokeWidth={3} />
          </ToastIcon>
        ),
        loading: (
          <Loader2Icon className="size-4 animate-spin text-primary-600" />
        ),
      }}
      style={
        {
          "--normal-bg": "var(--color-surface)",
          "--normal-text": "var(--color-foreground)",
          "--normal-border": "var(--color-border)",
          "--success-bg": "var(--color-primary-50)",
          "--success-text": "var(--color-primary-700)",
          "--success-border": "var(--color-primary-400)",
          "--info-bg": "var(--color-primary-50)",
          "--info-text": "var(--color-primary-700)",
          "--info-border": "var(--color-primary-400)",
          "--warning-bg": "var(--color-amber-50)",
          "--warning-text": "var(--color-amber-800)",
          "--warning-border": "var(--color-amber-300)",
          "--error-bg": "var(--color-red-50)",
          "--error-text": "var(--color-red-700)",
          "--error-border": "var(--color-red-200)",
          "--border-radius": "var(--radius-lg)",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          // Sonner aplica sus estilos con selectores de atributo, por eso los overrides llevan `!`
          toast: "cn-toast gap-3! py-3.5! shadow-elevated! border-l-4!",
          icon: "size-7! m-0!",
          title: "font-semibold! text-sm!",
          description: "opacity-90",
          success: "border-l-primary-600!",
          info: "border-l-primary-500!",
          warning: "border-l-amber-500!",
          error: "border-l-danger!",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
