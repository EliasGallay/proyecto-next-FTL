'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

type Oferta = {
  id: string
  titulo: string
  empresa_nombre: string
  estado: string
  created_at: string
}

const ESTADO_COLOR: Record<string, string> = {
  activa: 'bg-green-100 text-green-700',
  cerrada: 'bg-gray-100 text-gray-500',
  borrador: 'bg-yellow-100 text-yellow-700',
}

export default function OfertasPage() {
  const [ofertas, setOfertas] = useState<Oferta[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('ofertas')
      .select('*')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setOfertas(data ?? [])
        setLoading(false)
      })
  }, [])

  async function eliminar(id: string) {
    await supabase.from('ofertas').delete().eq('id', id)
    setOfertas((prev) => prev.filter((o) => o.id !== id))
  }

  return (
    <main className="min-h-screen p-8 bg-gray-50">
      <div className="max-w-3xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-semibold text-gray-800">Ofertas laborales</h1>
          <Link
            href="/ofertas/nueva"
            className="bg-teal-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-teal-700 transition-colors"
          >
            + Nueva oferta
          </Link>
        </div>

        {loading && <p className="text-gray-400 text-sm">Cargando...</p>}

        {!loading && ofertas.length === 0 && (
          <p className="text-gray-400 text-sm">No hay ofertas cargadas todavía.</p>
        )}

        <ul className="flex flex-col gap-3">
          {ofertas.map((oferta) => (
            <li
              key={oferta.id}
              className="bg-white rounded-xl shadow-sm p-5 flex justify-between items-start"
            >
              <div>
                <p className="font-medium text-gray-800">{oferta.titulo}</p>
                <p className="text-sm text-gray-500 mt-0.5">{oferta.empresa_nombre}</p>
                <span
                  className={`mt-2 inline-block text-xs px-2 py-0.5 rounded-full font-mono ${ESTADO_COLOR[oferta.estado]}`}
                >
                  {oferta.estado}
                </span>
              </div>
              <div className="flex gap-4 items-center">
                <Link
                  href={`/ofertas/${oferta.id}/editar`}
                  className="text-sm text-blue-600 hover:underline"
                >
                  Editar
                </Link>
                <button
                  onClick={() => eliminar(oferta.id)}
                  className="text-sm text-red-500 hover:underline"
                >
                  Eliminar
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </main>
  )
}
