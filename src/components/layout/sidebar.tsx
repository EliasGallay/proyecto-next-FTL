import Image from 'next/image'
import Link from 'next/link'
import { LogOut, UserRound } from 'lucide-react'
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

export function Sidebar({ usuario }: Props) {
  return (
    <aside className="hidden w-64 shrink-0 flex-col bg-sidebar lg:flex">
      <div className="flex items-center gap-3 px-5 py-6">
        <Image src={escudo} alt="" width={32} height={32} className="shrink-0" />
        <div className="flex min-w-0 flex-col">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-sidebar-muted">
            Portal de Empleo
          </span>
          <span className="truncate text-sm font-bold leading-tight text-sidebar-foreground">
            Municipalidad de Funes
          </span>
        </div>
      </div>

      <div className="mx-5 h-px bg-white/10" />

      <nav className="flex-1 px-3 py-4" />

      <div className="border-t border-white/10 p-4">
        {usuario && (
          usuario.rol === 'postulante' ? (
            <Link
              href="/perfil"
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
    </aside>
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
