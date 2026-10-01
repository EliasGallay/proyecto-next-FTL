# Guía de Supabase Storage

## Qué es Supabase Storage

Supabase Storage es el servicio para guardar archivos: imágenes, PDFs, documentos. En este proyecto se usa principalmente para los CVs de los postulantes (`cv_url` en la tabla `postulantes`).

Los archivos se organizan en **buckets** — carpetas raíz que agrupan archivos por tipo o propósito. Cada bucket tiene su propia configuración de acceso.

---

## Crear un bucket

Desde el dashboard de Supabase: **Storage → New bucket**

| Campo | Valor para CVs |
|---|---|
| **Name** | `cvs` |
| **Public bucket** | No (privado) |

Un bucket **privado** significa que los archivos no son accesibles con una URL pública directa — hay que generar una URL firmada con tiempo de expiración. Eso es lo correcto para CVs, que no deben ser públicos.

Si en algún momento necesitás un bucket para imágenes públicas (logos de empresa, por ejemplo), ahí sí conviene marcarlo como público.

---

## Políticas de Storage (RLS)

Al igual que las tablas, los buckets tienen RLS. Sin políticas, nadie puede subir ni leer archivos.

En el dashboard: **Storage → Policies → New policy**

### Política: postulantes pueden subir su propio CV

```sql
CREATE POLICY "postulantes pueden subir su cv"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'cvs'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
```

Esta política obliga a que cada archivo se guarde dentro de una carpeta con el ID del usuario (`<user-id>/curriculum.pdf`). Así un postulante no puede pisar el CV de otro.

### Política: postulantes pueden leer su propio CV

```sql
CREATE POLICY "postulantes pueden leer su cv"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'cvs'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
```

### Política: empresas y municipalidad pueden leer CVs

```sql
CREATE POLICY "empresas pueden leer cvs"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'cvs'
  AND EXISTS (
    SELECT 1 FROM public.usuarios
    WHERE id = auth.uid()
      AND rol IN ('empresa', 'municipalidad')
  )
);
```

---

## Subir un archivo

La subida siempre ocurre desde el **cliente** (el navegador), porque es el usuario quien tiene el archivo en su dispositivo.

```tsx
// src/app/perfil/SubirCV.tsx
'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'

export function SubirCV({ userId }: { userId: string }) {
  const [subiendo, setSubiendo] = useState(false)
  const [error, setError] = useState('')

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0]
    if (!archivo) return

    // Validar tipo y tamaño antes de subir
    if (archivo.type !== 'application/pdf') {
      setError('Solo se aceptan archivos PDF')
      return
    }
    if (archivo.size > 5 * 1024 * 1024) {
      setError('El archivo no puede superar 5 MB')
      return
    }

    setSubiendo(true)
    setError('')

    // La ruta sigue el patrón <user-id>/curriculum.pdf
    // Así cada usuario tiene su propia carpeta en el bucket
    const ruta = `${userId}/curriculum.pdf`

    const { error: errorSubida } = await supabase.storage
      .from('cvs')
      .upload(ruta, archivo, {
        upsert: true, // sobreescribe si ya existe un CV anterior
      })

    if (errorSubida) {
      setError(errorSubida.message)
    }

    setSubiendo(false)
  }

  return (
    <div>
      <label className="cursor-pointer text-sm text-teal-600 underline">
        {subiendo ? 'Subiendo...' : 'Subir CV (PDF, máx. 5 MB)'}
        <input
          type="file"
          accept=".pdf"
          onChange={handleChange}
          disabled={subiendo}
          className="hidden"
        />
      </label>
      {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
    </div>
  )
}
```

---

## Guardar la URL en la base de datos

Después de subir el archivo, hay que guardar la ruta en la tabla `postulantes` para poder recuperarla después.

La "ruta" que se guarda en la base de datos no es la URL completa — es el path dentro del bucket (`<user-id>/curriculum.pdf`). La URL real se genera al momento de mostrarla.

```tsx
'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { guardarRutaCV } from './actions'

export function SubirCV({ userId }: { userId: string }) {
  const [subiendo, setSubiendo] = useState(false)
  const [error, setError] = useState('')

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0]
    if (!archivo) return

    if (archivo.type !== 'application/pdf') {
      setError('Solo se aceptan archivos PDF')
      return
    }

    setSubiendo(true)
    setError('')

    const ruta = `${userId}/curriculum.pdf`

    const { error: errorSubida } = await supabase.storage
      .from('cvs')
      .upload(ruta, archivo, { upsert: true })

    if (errorSubida) {
      setError(errorSubida.message)
      setSubiendo(false)
      return
    }

    // Guardar la ruta en la base de datos via Server Action
    const resultado = await guardarRutaCV(ruta)
    if (!resultado.ok) setError(resultado.error)

    setSubiendo(false)
  }

  return (
    <label className="cursor-pointer text-sm text-teal-600 underline">
      {subiendo ? 'Subiendo...' : 'Subir CV'}
      <input type="file" accept=".pdf" onChange={handleChange} className="hidden" />
    </label>
  )
}
```

```ts
// src/app/perfil/actions.ts
'use server'

import { createSupabaseServerClient } from '@/lib/supabase-server'

export async function guardarRutaCV(ruta: string) {
  const supabase = await createSupabaseServerClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'No autenticado' }

  const { error } = await supabase
    .from('postulantes')
    .update({ cv_url: ruta })
    .eq('usuario_id', user.id)

  if (error) return { ok: false, error: error.message }

  return { ok: true, data: undefined }
}
```

---

## Leer un archivo (URL firmada)

Para mostrar o descargar un archivo de un bucket privado, hay que generar una **URL firmada** con tiempo de expiración.

```ts
// src/lib/storage.ts
import { createSupabaseServerClient } from './supabase-server'

export async function generarUrlCV(ruta: string): Promise<string | null> {
  const supabase = await createSupabaseServerClient()

  const { data, error } = await supabase.storage
    .from('cvs')
    .createSignedUrl(ruta, 60 * 60) // expira en 1 hora (en segundos)

  if (error || !data) return null

  return data.signedUrl
}
```

Usarla en un Server Component:

```tsx
// src/app/postulaciones/[id]/page.tsx
import { generarUrlCV } from '@/lib/storage'

export default async function DetallePostulacionPage({ params }) {
  const { id } = await params

  // ... obtener la postulación y el postulante

  const urlCV = postulante.cv_url
    ? await generarUrlCV(postulante.cv_url)
    : null

  return (
    <div>
      <h1>{postulante.nombre}</h1>
      {urlCV ? (
        <a href={urlCV} target="_blank" rel="noopener noreferrer">
          Ver CV
        </a>
      ) : (
        <p>Sin CV cargado</p>
      )}
    </div>
  )
}
```

> No guardes la URL firmada en la base de datos — vence y quedaría desactualizada. Guardá la ruta (`<user-id>/curriculum.pdf`) y generá la URL firmada al momento de mostrarla.

---

## Eliminar un archivo

```ts
// src/app/perfil/actions.ts
export async function eliminarCV() {
  const supabase = await createSupabaseServerClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'No autenticado' }

  // Obtener la ruta actual
  const { data: postulante } = await supabase
    .from('postulantes')
    .select('cv_url')
    .eq('usuario_id', user.id)
    .single()

  if (!postulante?.cv_url) return { ok: false, error: 'No hay CV cargado' }

  // Eliminar el archivo del storage
  const { error: errorStorage } = await supabase.storage
    .from('cvs')
    .remove([postulante.cv_url])

  if (errorStorage) return { ok: false, error: errorStorage.message }

  // Limpiar la referencia en la base de datos
  await supabase
    .from('postulantes')
    .update({ cv_url: null })
    .eq('usuario_id', user.id)

  return { ok: true, data: undefined }
}
```

---

## Listar archivos de un bucket

Útil para el panel de administración:

```ts
const { data: archivos } = await supabase.storage
  .from('cvs')
  .list(userId) // lista archivos dentro de la carpeta del usuario
```

---

## Resumen del flujo completo de CV

```
Postulante selecciona un PDF
  → Validación en el cliente (tipo, tamaño)
  → supabase.storage.upload() sube el archivo al bucket 'cvs'
     con la ruta '<user-id>/curriculum.pdf'
  → Server Action guarda la ruta en postulantes.cv_url
  → RLS del bucket controla quién puede leer el archivo

Empresa/municipalidad quiere ver el CV
  → Server Component lee cv_url desde la tabla postulantes
  → createSignedUrl() genera una URL temporal (1 hora)
  → Se muestra el link o se abre el PDF directamente
```
