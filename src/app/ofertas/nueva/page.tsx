'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function NuevaOfertaPage() {
  const router = useRouter()
  const [titulo, setTitulo] = useState('')
  const [empresaNombre, setEmpresaNombre] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [estado, setEstado] = useState('activa')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error } = await supabase.from('ofertas').insert({
      titulo,
      empresa_nombre: empresaNombre,
      descripcion,
      estado,
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    router.push('/ofertas')
  }

  return (
    <main className="min-h-screen p-8 bg-gray-50">
      <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-md p-8">
        <h1 className="text-xl font-semibold text-gray-800 mb-6">Nueva oferta</h1>

        {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            placeholder="Título del puesto"
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            required
            className="border border-gray-200 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
          <input
            placeholder="Nombre de la empresa"
            value={empresaNombre}
            onChange={(e) => setEmpresaNombre(e.target.value)}
            required
            className="border border-gray-200 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
          <textarea
            placeholder="Descripción del puesto, requisitos, condiciones…"
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            required
            className="border border-gray-200 rounded-lg p-3 text-sm min-h-[140px] resize-y focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
          <select
            value={estado}
            onChange={(e) => setEstado(e.target.value)}
            className="border border-gray-200 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            <option value="activa">Activa</option>
            <option value="borrador">Borrador</option>
            <option value="cerrada">Cerrada</option>
          </select>

          <div className="flex gap-3 justify-end mt-2">
            <button
              type="button"
              onClick={() => router.back()}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="bg-teal-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-teal-700 disabled:opacity-50 transition-colors"
            >
              {loading ? 'Guardando…' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </main>
  )
}
