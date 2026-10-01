'use client'

import { useTransition } from 'react'
import type { FileRejection } from 'react-dropzone'
import { FileText, Trash2, Upload, LoaderCircle } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dropzone, DropzoneEmptyState } from '@/components/kibo-ui/dropzone'
import { cn } from '@/lib/utils'
import { subirCv, eliminarCv } from './actions'
import { CV_MAX_BYTES } from './cv-limites'

const CV_ACCEPT = {
  'application/pdf': ['.pdf'],
  'application/msword': ['.doc'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
}

function mensajeRechazo(rechazos: FileRejection[]) {
  const codigo = rechazos[0]?.errors[0]?.code
  if (codigo === 'file-too-large') return 'El archivo no puede superar 5 MB'
  if (codigo === 'file-invalid-type') return 'Solo se aceptan archivos PDF, DOC o DOCX'
  if (codigo === 'too-many-files') return 'Subí un solo archivo'
  return 'No se pudo cargar el archivo'
}

type Props = {
  cvUrl: string | null
  cv: { nombre: string; fecha: string | null } | null
}

export function CvUpload({ cvUrl, cv }: Props) {
  const [subiendo, startSubida] = useTransition()
  const [eliminando, startEliminacion] = useTransition()
  const ocupado = subiendo || eliminando

  function handleUpload(archivos: File[]) {
    const archivo = archivos[0]
    if (!archivo) return

    const fd = new FormData()
    fd.append('cv', archivo)

    startSubida(async () => {
      try {
        const result = await subirCv(fd)
        if (result.ok) toast.success('CV subido correctamente')
        else toast.error(result.error)
      } catch {
        // Next.js rechaza el request antes de llegar a la acción si supera bodySizeLimit
        toast.error('No se pudo subir el archivo. Verificá que no supere 5 MB.')
      }
    })
  }

  function handleEliminar() {
    startEliminacion(async () => {
      try {
        const result = await eliminarCv()
        if (result.ok) toast.success('CV eliminado')
        else toast.error(result.error)
      } catch {
        toast.error('Error inesperado al eliminar el CV')
      }
    })
  }

  return (
    <div className="space-y-4">
      {cv ? (
        <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface-muted p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-primary-100 text-primary-600">
              <FileText className="size-5" aria-hidden />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-foreground" title={cv.nombre}>
                {cv.nombre}
              </p>
              <p className="text-xs text-foreground-secondary">
                {cv.fecha ? `Subido el ${cv.fecha}` : 'CV cargado'}
                {cvUrl && (
                  <>
                    {' · '}
                    <a
                      href={cvUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-primary-600 hover:underline"
                    >
                      Ver
                    </a>
                  </>
                )}
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            disabled={ocupado}
            onClick={handleEliminar}
            className="min-h-11 gap-2 text-danger hover:text-danger"
          >
            {eliminando ? (
              <>
                <LoaderCircle className="size-4 motion-safe:animate-spin" aria-hidden />
                Eliminando...
              </>
            ) : (
              <>
                <Trash2 className="size-4" aria-hidden />
                Eliminar CV
              </>
            )}
          </Button>
        </div>
      ) : (
        <p className="text-sm text-foreground-secondary">No tenés CV cargado todavía.</p>
      )}

      <Dropzone
        accept={CV_ACCEPT}
        maxSize={CV_MAX_BYTES}
        maxFiles={1}
        disabled={ocupado}
        onDrop={handleUpload}
        onDropRejected={(rechazos) => toast.error(mensajeRechazo(rechazos))}
        className={cn(
          'min-h-40 rounded-xl border-2 border-dashed border-border bg-surface-muted p-6 whitespace-normal sm:p-8',
          'hover:border-primary-400 hover:bg-primary-50',
          'data-[drag-active=true]:border-primary-500 data-[drag-active=true]:bg-primary-50 data-[drag-active=true]:ring-0',
          'disabled:opacity-60'
        )}
      >
        <DropzoneEmptyState>
          <div className="flex flex-col items-center justify-center gap-2 text-center">
            <div className="flex size-11 items-center justify-center rounded-full bg-primary-100 text-primary-600">
              {subiendo ? (
                <LoaderCircle className="size-5 motion-safe:animate-spin" aria-hidden />
              ) : (
                <Upload className="size-5" aria-hidden />
              )}
            </div>
            <p className="text-sm font-medium text-foreground">
              {subiendo ? 'Subiendo...' : cv ? 'Reemplazar CV' : 'Subí tu CV'}
            </p>
            <p className="text-xs text-foreground-secondary">
              Arrastrá el archivo acá o tocá para elegirlo
            </p>
            <p className="text-xs text-foreground-muted">PDF, DOC o DOCX — máximo 5 MB</p>
          </div>
        </DropzoneEmptyState>
      </Dropzone>
    </div>
  )
}
