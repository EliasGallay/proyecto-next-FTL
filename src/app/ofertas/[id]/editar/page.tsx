'use client'
import { use, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function EditarOfertaPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const router = useRouter()
  const [titulo, setTitulo] = useState('')
  const [empresaNombre, setEmpresaNombre] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [estado, setEstado] = useState('activa')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    supabase
      .from('ofertas')
      .select('*')
      .eq('id', id)
      .single()
      .then(({ data }) => {
        if (data) {
          setTitulo(data.titulo)
          setEmpresaNombre(data.empresa_nombre)
          setDescripcion(data.descripcion)
          setEstado(data.estado)
        }
        setLoading(false)
      })
  }, [id])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)

    const { error } = await supabase
      .from('ofertas')
      .update({ titulo, empresa_nombre: empresaNombre, descripcion, estado })
      .eq('id', id)

    if (error) {
      setError(error.message)
      setSaving(false)
      return
    }

    router.push('/ofertas')
  }

  if (loading) {
    return (
      <main className="min-h-screen p-8 bg-gray-50">
        <p className="text-gray-400 text-sm">Cargando...</p>
      </main>
    )
  }

  return (
    <main className="min-h-screen p-8 bg-gray-50">
      <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-md p-8">
        <h1 className="text-xl font-semibold text-gray-800 mb-6">Editar oferta</h1>

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
              disabled={saving}
              className="bg-teal-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-teal-700 disabled:opacity-50 transition-colors"
            >
              {saving ? 'Guardando…' : 'Guardar cambios'}
            </button>
          </div>
        </form>
      </div>
    </main>
  )
}
