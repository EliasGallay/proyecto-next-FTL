# Perfil Postulante — Datos Personales y Currículum Vitae

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir que un postulante autenticado actualice sus datos personales y suba/elimine su currículum vitae desde una nueva página `/perfil` dentro del dashboard.

**Architecture:** Nueva ruta `(dashboard)/perfil` compuesta por un Server Component que obtiene los datos del usuario y genera la URL firmada del CV; dos Client Components (`PerfilForm`, `CvUpload`) que consumen Server Actions para mutaciones. El bucket privado `curricula` en Supabase Storage almacena los archivos; `postulantes.cv_url` guarda la clave de objeto (no una URL pública). El orden de operaciones en el upload protege contra desincronización: (1) subir nuevo → (2) actualizar DB → (3) borrar viejo; con rollback del archivo si falla el paso 2.

**Tech Stack:** Next.js 16 App Router, Supabase Storage + PostgreSQL, react-hook-form + zod, Tailwind CSS v4, lucide-react

**Spec:** Conversación del 2026-09-30 — módulo usuario/postulante con carga de CV e integración Supabase Storage

## Global Constraints

- Next.js 16: `params` es Promise — siempre `await params`; `LayoutProps<"/">` de `next`
- Preferir Server Components; `"use client"` solo cuando se necesite estado, efectos, eventos o APIs del browser
- `supabaseAdmin` (`src/lib/supabase-admin.ts`) solo para ops que bypasean RLS; verificar identidad del usuario (`getUser()`) antes de cualquier uso del admin client
- `createSupabaseServerClient()` (`src/lib/supabase-server.ts`) para ops en contexto de sesión del usuario autenticado
- Tailwind CSS v4 — sin `tailwind.config.*`; usar CSS custom properties del `:root` definidas en `globals.css` (p.ej. `bg-surface`, `text-foreground`, `bg-primary-600`)
- Mobile-first: base 375 px → escalar con `sm:` / `md:` / `lg:`; touch targets ≥ 44×44 px
- Server Actions en `src/app/<ruta>/actions.ts` con `"use server"` al tope del archivo
- Migraciones en `src/migrations/migration_NNN_<descripcion>.sql` — no modificar migraciones ya aplicadas
- Sin test runner: validar con `npm run lint` y `npm run build`
- Nunca hacer commit sin instrucción explícita del usuario

## Review Focus

1. **Acceso sin autenticación** — cada Server Action debe llamar `supabase.auth.getUser()` y retornar `{ ok: false, error: ... }` si `user` es `null`, antes de cualquier operación de DB o storage.
2. **Falsificación de tipo de archivo** — `archivo.type` es controlado por el browser y puede ser falso. Validar tanto el MIME type como la extensión del nombre del archivo en la Server Action. El bucket tiene `allowed_mime_types` configurado como defensa adicional.
3. **Conflicto de DNI único (código `23505`)** — si el DNI ingresado ya pertenece a otro usuario, el error de la DB debe traducirse a un mensaje claro, no genérico.
4. **cv_url desincronizada tras fallo de DB** — el orden crítico es: (1) upload → (2) actualizar DB → (3) borrar viejo. Si el paso 2 falla, la Server Action debe borrar el archivo recién subido (rollback) para que `cv_url` en DB siga apuntando al archivo anterior válido.
5. **Acceso no autorizado por rol** — la página `/perfil` debe redirigir a `/inicio` si el rol del usuario no es `postulante`; las Server Actions no deben confiar en que solo postulantes llamen a estas funciones.

---

## File Map

| Acción | Archivo |
|--------|---------|
| Crear  | `src/migrations/migration_006_storage_cv.sql` |
| Crear  | `src/app/(dashboard)/perfil/actions.ts` |
| Crear  | `src/app/(dashboard)/perfil/perfil-form.tsx` |
| Crear  | `src/app/(dashboard)/perfil/cv-upload.tsx` |
| Crear  | `src/app/(dashboard)/perfil/page.tsx` |
| Modificar | `src/components/layout/sidebar.tsx` |
| Modificar | `src/components/layout/mobile-sidebar.tsx` |

---

### Task 1: Migración — Bucket de Storage y Políticas RLS

**Files:**
- Crear: `src/migrations/migration_006_storage_cv.sql`

**Interfaces:**
- Produce: bucket `curricula` (privado, 5 MB, PDF/DOC/DOCX) en Supabase Storage con políticas de acceso por `usuario_id`

- [ ] **Step 1: Crear el archivo de migración**

Contenido completo de `src/migrations/migration_006_storage_cv.sql`:

```sql
-- ============================================================
-- Portal Municipal de Empleo — Migración 006
-- Ejecutar en Supabase Dashboard → SQL Editor
-- ============================================================
-- Crea el bucket privado "curricula" para almacenar CVs y
-- define las políticas RLS de storage.objects.
--
-- Depende de: migration_004_rls.sql (función rol_actual())
-- ============================================================

-- ------------------------------------------------------------
-- Bucket privado para currículums vitae
-- file_size_limit: 5 MB; solo PDF y formatos Word
-- ------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'curricula',
  'curricula',
  false,
  5242880,
  array[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
on conflict (id) do nothing;

-- ------------------------------------------------------------
-- RLS en storage.objects para el bucket "curricula"
-- Estructura de path: {usuario_id}/{timestamp}.{ext}
-- (storage.foldername(name))[1] extrae el primer segmento del path
-- ------------------------------------------------------------

-- El postulante puede subir archivos a su propia carpeta
create policy "curricula: postulante sube su cv"
  on storage.objects for insert
  with check (
    bucket_id = 'curricula'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
    and rol_actual() = 'postulante'
  );

-- El postulante lee sus propios archivos; la municipalidad lee todos
create policy "curricula: leer cv"
  on storage.objects for select
  using (
    bucket_id = 'curricula'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or rol_actual() = 'municipalidad'
    )
  );

-- El postulante puede eliminar sus propios archivos
create policy "curricula: postulante elimina su cv"
  on storage.objects for delete
  using (
    bucket_id = 'curricula'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
```

- [ ] **Step 2: Aplicar la migración**

Abrir Supabase Dashboard → SQL Editor, pegar el contenido del archivo y ejecutar. Verificar que no haya errores.

Confirmar en Supabase Dashboard → Storage que el bucket `curricula` aparece como privado.

---

### Task 2: Server Actions — Actualizar Perfil y Gestión de CV

**Files:**
- Crear: `src/app/(dashboard)/perfil/actions.ts`

**Interfaces:**
- Consume: `createSupabaseServerClient()` de `@/lib/supabase-server`, `supabaseAdmin` de `@/lib/supabase-admin`
- Produce:
  - `actualizarPerfil(formData: FormData): Promise<ActionResult>`
  - `subirCv(formData: FormData): Promise<ActionResult>`
  - `eliminarCv(): Promise<ActionResult>`
  - donde `ActionResult = { ok: true } | { ok: false; error: string }`

- [ ] **Step 1: Crear `src/app/(dashboard)/perfil/actions.ts`**

```typescript
'use server'

import { createSupabaseServerClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { revalidatePath } from 'next/cache'

const CV_BUCKET = 'curricula'
const CV_MAX_BYTES = 5 * 1024 * 1024
const CV_ALLOWED_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
])
const CV_ALLOWED_EXTS = new Set(['pdf', 'doc', 'docx'])

type ActionResult = { ok: true } | { ok: false; error: string }

export async function actualizarPerfil(formData: FormData): Promise<ActionResult> {
  try {
    const supabase = await createSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { ok: false, error: 'No autenticado' }

    const nombre = (formData.get('nombre') as string | null)?.trim() ?? ''
    const apellido = (formData.get('apellido') as string | null)?.trim() ?? ''
    const telefono = (formData.get('telefono') as string | null)?.trim() ?? ''
    const dni = (formData.get('dni') as string | null)?.trim() ?? ''

    if (!nombre || !apellido || !telefono || !dni) {
      return { ok: false, error: 'Todos los campos son obligatorios' }
    }

    const { error: errorUsuario } = await supabase
      .from('usuarios')
      .update({ nombre, apellido, telefono })
      .eq('id', user.id)

    if (errorUsuario) return { ok: false, error: 'No se pudieron actualizar los datos personales' }

    const { error: errorPostulante } = await supabase
      .from('postulantes')
      .update({ dni })
      .eq('usuario_id', user.id)

    if (errorPostulante) {
      if (errorPostulante.code === '23505') {
        return { ok: false, error: 'Ese DNI ya está registrado en otra cuenta' }
      }
      return { ok: false, error: 'No se pudo actualizar el DNI' }
    }

    revalidatePath('/perfil')
    return { ok: true }
  } catch {
    return { ok: false, error: 'Error inesperado al actualizar el perfil' }
  }
}

export async function subirCv(formData: FormData): Promise<ActionResult> {
  try {
    const supabase = await createSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { ok: false, error: 'No autenticado' }

    const archivo = formData.get('cv') as File | null
    if (!archivo || archivo.size === 0) return { ok: false, error: 'Seleccioná un archivo' }
    if (archivo.size > CV_MAX_BYTES) return { ok: false, error: 'El archivo no puede superar 5 MB' }

    const ext = archivo.name.split('.').pop()?.toLowerCase() ?? ''
    if (!CV_ALLOWED_TYPES.has(archivo.type) || !CV_ALLOWED_EXTS.has(ext)) {
      return { ok: false, error: 'Solo se aceptan archivos PDF, DOC o DOCX' }
    }

    // Paso 1: subir nuevo archivo (antes de tocar la DB)
    const nuevoPath = `${user.id}/${Date.now()}.${ext}`
    const bytes = await archivo.arrayBuffer()
    const { error: uploadError } = await supabaseAdmin.storage
      .from(CV_BUCKET)
      .upload(nuevoPath, bytes, { contentType: archivo.type, upsert: false })

    if (uploadError) return { ok: false, error: 'No se pudo subir el archivo. Intentá de nuevo.' }

    // Paso 2: leer el path anterior (para borrarlo después)
    const { data: postulante } = await supabase
      .from('postulantes')
      .select('cv_url')
      .eq('usuario_id', user.id)
      .single()

    const pathAnterior = postulante?.cv_url ?? null

    // Paso 3: actualizar cv_url en la DB
    const { error: updateError } = await supabase
      .from('postulantes')
      .update({ cv_url: nuevoPath })
      .eq('usuario_id', user.id)

    if (updateError) {
      // Rollback: borrar el archivo recién subido para que cv_url siga siendo válido
      await supabaseAdmin.storage.from(CV_BUCKET).remove([nuevoPath])
      return { ok: false, error: 'No se pudo guardar el CV. El archivo fue eliminado.' }
    }

    // Paso 4: borrar archivo anterior (best-effort)
    if (pathAnterior) {
      await supabaseAdmin.storage.from(CV_BUCKET).remove([pathAnterior])
    }

    revalidatePath('/perfil')
    return { ok: true }
  } catch {
    return { ok: false, error: 'Error inesperado al subir el CV' }
  }
}

export async function eliminarCv(): Promise<ActionResult> {
  try {
    const supabase = await createSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { ok: false, error: 'No autenticado' }

    const { data: postulante } = await supabase
      .from('postulantes')
      .select('cv_url')
      .eq('usuario_id', user.id)
      .single()

    if (!postulante?.cv_url) return { ok: false, error: 'No hay CV cargado para eliminar' }

    const { error: storageError } = await supabaseAdmin.storage
      .from(CV_BUCKET)
      .remove([postulante.cv_url])

    if (storageError) return { ok: false, error: 'No se pudo eliminar el archivo del almacenamiento' }

    const { error: updateError } = await supabase
      .from('postulantes')
      .update({ cv_url: null })
      .eq('usuario_id', user.id)

    if (updateError) {
      return { ok: false, error: 'El archivo fue eliminado pero no se pudo actualizar el perfil' }
    }

    revalidatePath('/perfil')
    return { ok: true }
  } catch {
    return { ok: false, error: 'Error inesperado al eliminar el CV' }
  }
}
```

- [ ] **Step 2: Verificar tipos con la build**

```bash
npm run build
```

Esperado: sin errores de TypeScript relacionados con `actions.ts`.

---

### Task 3: Formulario de Datos Personales (Client Component)

**Files:**
- Crear: `src/app/(dashboard)/perfil/perfil-form.tsx`

**Interfaces:**
- Consume: `actualizarPerfil` de `./actions`
- Props: `defaultValues: { nombre: string; apellido: string; telefono: string; dni: string }`
- Produce: componente `PerfilForm` que llama `actualizarPerfil` y muestra feedback al usuario

- [ ] **Step 1: Crear `src/app/(dashboard)/perfil/perfil-form.tsx`**

```typescript
'use client'

import { useState, useTransition } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { LoaderCircle, Save } from 'lucide-react'
import { useForm } from 'react-hook-form'
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
  const [mensaje, setMensaje] = useState<{ tipo: 'exito' | 'error'; texto: string } | null>(null)
  const [isPending, startTransition] = useTransition()

  const form = useForm<PerfilFormValues>({
    resolver: zodResolver(schema),
    defaultValues,
  })

  function onSubmit(values: PerfilFormValues) {
    setMensaje(null)
    const fd = new FormData()
    fd.append('nombre', values.nombre)
    fd.append('apellido', values.apellido)
    fd.append('telefono', values.telefono)
    fd.append('dni', values.dni)

    startTransition(async () => {
      const result = await actualizarPerfil(fd)
      setMensaje(
        result.ok
          ? { tipo: 'exito', texto: 'Datos actualizados correctamente' }
          : { tipo: 'error', texto: result.error }
      )
    })
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

        {mensaje && (
          <p
            className={`rounded-lg px-3 py-2 text-sm font-medium ${
              mensaje.tipo === 'exito'
                ? 'bg-primary-50 text-primary-700'
                : 'bg-red-50 text-danger'
            }`}
          >
            {mensaje.texto}
          </p>
        )}

        <Button type="submit" disabled={isPending} className="gap-2">
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
      </form>
    </Form>
  )
}
```

- [ ] **Step 2: Verificar tipos**

```bash
npm run build
```

Esperado: sin errores en `perfil-form.tsx`.

---

### Task 4: Componente de Carga de CV (Client Component)

**Files:**
- Crear: `src/app/(dashboard)/perfil/cv-upload.tsx`

**Interfaces:**
- Consume: `subirCv`, `eliminarCv` de `./actions`
- Props:
  - `cvUrl: string | null` — URL firmada generada server-side (o `null` si no hay CV)
  - `tieneCv: boolean` — indica si hay un CV cargado en DB
- Produce: componente `CvUpload` con file input, estado del CV actual, botones de subir y eliminar

- [ ] **Step 1: Crear `src/app/(dashboard)/perfil/cv-upload.tsx`**

```typescript
'use client'

import { useRef, useState, useTransition } from 'react'
import { FileText, Trash2, Upload, LoaderCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { subirCv, eliminarCv } from './actions'

type Props = {
  cvUrl: string | null
  tieneCv: boolean
}

export function CvUpload({ cvUrl, tieneCv }: Props) {
  const [mensaje, setMensaje] = useState<{ tipo: 'exito' | 'error'; texto: string } | null>(null)
  const [isPending, startTransition] = useTransition()
  const inputRef = useRef<HTMLInputElement>(null)

  function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0]
    if (!archivo) return

    setMensaje(null)
    const fd = new FormData()
    fd.append('cv', archivo)

    startTransition(async () => {
      const result = await subirCv(fd)
      setMensaje(
        result.ok
          ? { tipo: 'exito', texto: 'CV subido correctamente' }
          : { tipo: 'error', texto: result.error }
      )
      if (inputRef.current) inputRef.current.value = ''
    })
  }

  function handleEliminar() {
    setMensaje(null)
    startTransition(async () => {
      const result = await eliminarCv()
      setMensaje(
        result.ok
          ? { tipo: 'exito', texto: 'CV eliminado' }
          : { tipo: 'error', texto: result.error }
      )
    })
  }

  return (
    <div className="space-y-4">
      {tieneCv && cvUrl ? (
        <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface-muted p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <FileText className="size-5 shrink-0 text-primary-600" aria-hidden />
            <div>
              <p className="text-sm font-medium text-foreground">CV cargado</p>
              <a
                href={cvUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-primary-600 hover:underline"
              >
                Descargar / ver
              </a>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isPending}
            onClick={handleEliminar}
            className="gap-2 text-danger hover:text-danger"
          >
            {isPending ? (
              <LoaderCircle className="size-4 motion-safe:animate-spin" aria-hidden />
            ) : (
              <Trash2 className="size-4" aria-hidden />
            )}
            Eliminar CV
          </Button>
        </div>
      ) : (
        <p className="text-sm text-foreground-secondary">No tenés CV cargado todavía.</p>
      )}

      <div>
        <input
          ref={inputRef}
          id="cv-input"
          type="file"
          accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          className="sr-only"
          disabled={isPending}
          onChange={handleUpload}
        />
        <label
          htmlFor="cv-input"
          className={`inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-md bg-primary-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-700 ${
            isPending ? 'pointer-events-none opacity-60' : ''
          }`}
        >
          {isPending ? (
            <>
              <LoaderCircle className="size-4 motion-safe:animate-spin" aria-hidden />
              Subiendo...
            </>
          ) : (
            <>
              <Upload className="size-4" aria-hidden />
              {tieneCv ? 'Reemplazar CV' : 'Subir CV'}
            </>
          )}
        </label>
        <p className="mt-1.5 text-xs text-foreground-secondary">PDF, DOC o DOCX — máximo 5 MB</p>
      </div>

      {mensaje && (
        <p
          className={`rounded-lg px-3 py-2 text-sm font-medium ${
            mensaje.tipo === 'exito'
              ? 'bg-primary-50 text-primary-700'
              : 'bg-red-50 text-danger'
          }`}
        >
          {mensaje.texto}
        </p>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verificar tipos**

```bash
npm run build
```

Esperado: sin errores en `cv-upload.tsx`.

---

### Task 5: Página de Perfil (Server Component)

**Files:**
- Crear: `src/app/(dashboard)/perfil/page.tsx`

**Interfaces:**
- Consume: `PerfilForm` de `./perfil-form`, `CvUpload` de `./cv-upload`
- Consume: `createSupabaseServerClient()` de `@/lib/supabase-server`, `supabaseAdmin` de `@/lib/supabase-admin`
- Produce: página `/perfil` — protegida por auth, accesible solo para rol `postulante`

- [ ] **Step 1: Crear `src/app/(dashboard)/perfil/page.tsx`**

```typescript
import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { PerfilForm } from './perfil-form'
import { CvUpload } from './cv-upload'

const CV_BUCKET = 'curricula'

export default async function PerfilPage() {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: usuario } = await supabase
    .from('usuarios')
    .select('nombre, apellido, telefono, rol')
    .eq('id', user.id)
    .single()

  if (usuario?.rol !== 'postulante') redirect('/inicio')

  const { data: postulante } = await supabase
    .from('postulantes')
    .select('dni, cv_url')
    .eq('usuario_id', user.id)
    .single()

  let cvFirmadaUrl: string | null = null
  if (postulante?.cv_url) {
    const { data } = await supabaseAdmin.storage
      .from(CV_BUCKET)
      .createSignedUrl(postulante.cv_url, 3600)
    cvFirmadaUrl = data?.signedUrl ?? null
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Mi perfil</h1>
        <p className="mt-1 text-sm text-foreground-secondary">
          Actualizá tus datos personales y tu currículum vitae.
        </p>
      </div>

      <section className="rounded-xl bg-surface p-4 shadow-card sm:p-6">
        <h2 className="mb-4 text-base font-semibold text-foreground">Datos personales</h2>
        <PerfilForm
          defaultValues={{
            nombre: usuario?.nombre ?? '',
            apellido: usuario?.apellido ?? '',
            telefono: usuario?.telefono ?? '',
            dni: postulante?.dni ?? '',
          }}
        />
      </section>

      <section className="rounded-xl bg-surface p-4 shadow-card sm:p-6">
        <h2 className="mb-4 text-base font-semibold text-foreground">Currículum vitae</h2>
        <CvUpload
          cvUrl={cvFirmadaUrl}
          tieneCv={!!postulante?.cv_url}
        />
      </section>
    </div>
  )
}
```

- [ ] **Step 2: Verificar build completa**

```bash
npm run build
```

Esperado: build exitosa, nueva ruta `/perfil` aparece en el output de Next.js.

- [ ] **Step 3: Verificar la página en el browser**

```bash
npm run dev
```

Navegar a `http://localhost:3000/perfil` con una sesión de postulante:
- Los campos deben estar prellenados con los datos del usuario
- La sección de CV debe mostrar el estado correcto (con o sin CV)
- Navegar a `/perfil` con sesión de empresa o municipalidad debe redirigir a `/inicio`
- Navegar a `/perfil` sin sesión debe redirigir a `/auth/login`

---

### Task 6: Navegación — Enlace "Mi perfil" en el Sidebar

**Files:**
- Modificar: `src/components/layout/sidebar.tsx`
- Modificar: `src/components/layout/mobile-sidebar.tsx`

**Interfaces:**
- Consume: `usuario.rol` (ya disponible en ambos componentes vía prop)

- [ ] **Step 1: Agregar enlace en `src/components/layout/sidebar.tsx`**

Agregar `Link` a los imports existentes:

```typescript
// Agregar a los imports existentes (antes de import escudo)
import Link from 'next/link'
import { LogOut, User } from 'lucide-react'
```

Reemplazar el `<nav>` vacío con el enlace condicional:

```typescript
// Reemplazar: <nav className="flex-1 px-3 py-4" />
// Por:
<nav className="flex-1 px-3 py-4">
  {usuario?.rol === 'postulante' && (
    <Link
      href="/perfil"
      className="flex items-center gap-2.5 rounded-md px-2 py-2 text-sm text-sidebar-muted transition-colors hover:bg-sidebar-hover hover:text-sidebar-foreground"
    >
      <User className="size-4 shrink-0" aria-hidden />
      Mi perfil
    </Link>
  )}
</nav>
```

- [ ] **Step 2: Agregar enlace en `src/components/layout/mobile-sidebar.tsx`**

Agregar `Link` y `User` a los imports existentes:

```typescript
// Reemplazar la línea de imports de lucide-react
import { Menu, User, X, LogOut } from 'lucide-react'
// Agregar import de Link
import Link from 'next/link'
```

Reemplazar el `<nav>` vacío con el enlace condicional (con `onClick` para cerrar el panel):

```typescript
// Reemplazar: <nav className="flex-1 px-3 py-4" />
// Por:
<nav className="flex-1 px-3 py-4">
  {usuario?.rol === 'postulante' && (
    <Link
      href="/perfil"
      onClick={() => setOpen(false)}
      className="flex items-center gap-2.5 rounded-md px-2 py-2 text-sm text-sidebar-muted transition-colors hover:bg-sidebar-hover hover:text-sidebar-foreground"
    >
      <User className="size-4 shrink-0" aria-hidden />
      Mi perfil
    </Link>
  )}
</nav>
```

- [ ] **Step 3: Verificar lint y build**

```bash
npm run lint && npm run build
```

Esperado: sin errores ni warnings.

- [ ] **Step 4: Verificar el enlace en el browser**

Con sesión de postulante:
- El sidebar desktop muestra "Mi perfil" en la navegación
- El sidebar mobile muestra "Mi perfil"; al hacer click navega a `/perfil` y cierra el panel
- Con sesión de empresa o municipalidad, el enlace no aparece

---

### Task 7: Validación Final e Integración

**Files:** ninguno nuevo — solo validación

- [ ] **Step 1: Lint completo**

```bash
npm run lint
```

Esperado: sin errores. Si hay warnings, verificar que no estén relacionados con los archivos nuevos.

- [ ] **Step 2: Build de producción**

```bash
npm run build
```

Esperado: build exitosa. Anotar cualquier warning de Next.js para reportarlo.

- [ ] **Step 3: Flujo completo de datos personales**

Iniciar `npm run dev`, navegar a `/perfil` con cuenta de postulante:
1. Modificar nombre, apellido, teléfono o DNI y guardar → aparece mensaje de éxito
2. Refrescar la página → los valores actualizados persisten en los campos
3. Intentar guardar con DNI inválido (menos de 7 dígitos) → error de validación client-side
4. Intentar guardar con DNI de otro postulante ya registrado → error "Ese DNI ya está registrado en otra cuenta"

- [ ] **Step 4: Flujo completo de CV**

Con cuenta de postulante en `/perfil`:
1. Subir un archivo PDF de menos de 5 MB → mensaje de éxito; sección muestra "CV cargado" con link de descarga
2. Hacer click en "Descargar / ver" → el archivo se abre en una nueva pestaña
3. Subir un segundo archivo (reemplazar) → el nuevo CV reemplaza al anterior; el link apunta al archivo nuevo
4. Eliminar el CV → sección vuelve a "No tenés CV cargado todavía."
5. Intentar subir un archivo `.jpg` → error "Solo se aceptan archivos PDF, DOC o DOCX"
6. Intentar subir un archivo mayor a 5 MB → error "El archivo no puede superar 5 MB"
