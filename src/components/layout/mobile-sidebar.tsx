'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { Menu, X, LogOut, UserRound } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import escudo from '@/assets/brand/escudo-funes-blanco.png'
import { logout } from '@/app/auth/actions'

const ROL_LABEL: Record<string, string> = {
  postulante: 'Postulante',
  empresa: 'Empresa',
  municipalidad: 'Municipalidad',
}

type Props = {
  usuario: { nombre: string; apellido: string; rol: string } | null
}

export function MobileSidebar({ usuario }: Props) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    const onKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open])

  return (
    <>
      <header className="flex shrink-0 items-center justify-between border-b border-white/10 bg-sidebar px-4 py-3 lg:hidden">
        <div className="flex items-center gap-2.5">
          <Image src={escudo} alt="" width={28} height={28} className="shrink-0" />
          <span className="text-sm font-bold text-sidebar-foreground">Portal de Empleo</span>
        </div>
        <button
          onClick={() => setOpen(true)}
          className="flex size-9 items-center justify-center rounded-md text-sidebar-muted transition-colors hover:bg-sidebar-hover hover:text-sidebar-foreground"
          aria-label="Abrir menú"
          aria-expanded={open}
        >
          <Menu className="size-5" aria-hidden />
        </button>
      </header>

      <div
        aria-hidden
        onClick={() => setOpen(false)}
        className={cn(
          'fixed inset-0 z-40 bg-black/50 transition-opacity duration-300 lg:hidden',
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        )}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Menú de navegación"
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-sidebar lg:hidden',
          'motion-safe:transition-transform motion-safe:duration-300 motion-safe:ease-in-out',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex items-center justify-between px-5 py-5">
          <div className="flex items-center gap-3">
            <Image src={escudo} alt="" width={32} height={32} className="shrink-0" />
            <div className="flex flex-col">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-sidebar-muted">
                Portal de Empleo
              </span>
              <span className="truncate text-sm font-bold leading-tight text-sidebar-foreground">
                Municipalidad de Funes
              </span>
            </div>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="flex size-8 items-center justify-center rounded-md text-sidebar-muted transition-colors hover:bg-sidebar-hover hover:text-sidebar-foreground"
            aria-label="Cerrar menú"
          >
            <X className="size-4" aria-hidden />
          </button>
        </div>

        <div className="mx-5 h-px bg-white/10" />

        <nav className="flex-1 px-3 py-4" />

        <div className="border-t border-white/10 p-4">
          {usuario && (
            usuario.rol === 'postulante' ? (
              <Link
                href="/perfil"
                onClick={() => setOpen(false)}
                title="Ver mi perfil"
                className="mb-3 block min-h-11 rounded-md px-2 py-1.5 transition-colors hover:bg-sidebar-hover"
              >
                <UsuarioInfo usuario={usuario} />
              </Link>
            ) : (
              <div className="mb-3 px-2">
                <UsuarioInfo usuario={usuario} />
              </div>
            )
          )}
          <form action={logout}>
            <button
              type="submit"
              className="flex w-full items-center gap-3 rounded-md px-2 py-1.5 text-sm text-sidebar-muted transition-colors hover:bg-sidebar-hover hover:text-sidebar-foreground"
            >
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white/10 ring-1 ring-white/20">
                <LogOut className="size-4" aria-hidden />
              </span>
              Cerrar sesión
            </button>
          </form>
        </div>
      </div>
    </>
  )
}

function UsuarioInfo({ usuario }: { usuario: NonNullable<Props['usuario']> }) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-sidebar-foreground ring-1 ring-white/20">
        <UserRound className="size-5" aria-hidden />
      </span>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-sidebar-foreground">
          {usuario.nombre} {usuario.apellido}
        </p>
        <p className="mt-0.5 text-xs text-sidebar-muted">
          {ROL_LABEL[usuario.rol] ?? usuario.rol}
        </p>
      </div>
    </div>
  )
}
