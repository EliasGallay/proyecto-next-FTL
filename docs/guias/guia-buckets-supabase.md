# Guía de Buckets en Supabase Storage

## Qué es un bucket

Un **bucket** es el contenedor raíz donde se guardan los archivos en Supabase Storage. Funciona como una carpeta de primer nivel: dentro de un bucket podés tener archivos directamente o subcarpetas con más archivos.

Cada bucket tiene su propia configuración de acceso (público o privado), límite de tamaño de archivo y tipos de archivo permitidos.

```
Storage
├── curricula/               ← bucket privado
│   ├── <user-id-1>/
│   │   └── 1696000000000.pdf
│   └── <user-id-2>/
│       └── 1696000000001.docx
└── logos/                   ← bucket público
    ├── empresa-abc.png
    └── empresa-xyz.jpg
```

---

## Bucket público vs. privado

| | Público | Privado |
|---|---|---|
| Acceso a los archivos | Cualquiera con la URL directa | Solo con URL firmada (con vencimiento) |
| Cuándo usarlo | Imágenes, logos, assets que no son sensibles | Documentos personales (CVs, contratos) |
| Cómo se accede desde código | `getPublicUrl()` | `createSignedUrl()` |
| RLS | Opcional (el acceso público ya lo cubre) | Necesario para controlar quién puede firmar URLs |

> En este proyecto el bucket `curricula` es **privado**: un CV es un documento personal y no debe ser accesible con una URL pública directa.

---

## Crear un bucket

### Desde el dashboard

**Storage → New bucket**

| Campo | Descripción |
|---|---|
| **Name** | Nombre del bucket (en minúsculas, sin espacios) |
| **Public bucket** | Marcar solo para assets públicos |
| **File size limit** | Tamaño máximo por archivo (en bytes) |
| **Allowed MIME types** | Lista de tipos aceptados, separados por coma |

### Desde SQL (recomendado para el proyecto)

Los buckets pueden crearse en el mismo archivo de migración que define las políticas RLS, así todo queda versionado en Git.

```sql
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'curricula',
  'curricula',
  false,                    -- privado
  5242880,                  -- 5 MB en bytes (5 * 1024 * 1024)
  array[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
ON CONFLICT (id) DO NOTHING;
```

El `ON CONFLICT (id) DO NOTHING` hace que la migración sea idempotente: si el bucket ya existe, no falla.

---

## Estructura de archivos dentro del bucket

No hay una estructura obligatoria, pero la convención de este proyecto es:

```
<bucket>/
  <usuario_id>/
    <timestamp>.<ext>
```

Por ejemplo:
```
curricula/
  a1b2c3d4-e5f6-7890-abcd-ef1234567890/
    1696000000000.pdf
```

### Por qué usar el `usuario_id` como carpeta

Las políticas RLS de Storage usan la función `storage.foldername(name)` para extraer segmentos del path:

```sql
-- Extrae el primer segmento del path
(storage.foldername(name))[1]  -- devuelve el user_id

-- Ejemplo: para el path 'abc-123/1696000000000.pdf'
-- (storage.foldername(name))[1] devuelve 'abc-123'
```

Usar el `usuario_id` como primer segmento permite escribir políticas RLS que restringen el acceso por usuario sin tener que consultar otra tabla.

### Por qué usar timestamp en lugar de nombre fijo

Si se usara un nombre fijo (`curriculum.pdf`), reemplazar el archivo requeriría `upsert: true`. Con timestamp:
- Cada versión del archivo tiene su propio path.
- El archivo anterior puede borrarse de forma explícita.
- No hay colisiones si dos uploads ocurren casi al mismo tiempo.

---

## Políticas RLS del bucket

Los buckets tienen RLS igual que las tablas. Sin políticas configuradas, ninguna operación está permitida — ni siquiera para usuarios autenticados.

Las políticas se definen sobre `storage.objects`.

### Subir archivos (INSERT)

```sql
CREATE POLICY "curricula: postulante sube su cv"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'curricula'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
    AND rol_actual() = 'postulante'
  );
```

- `bucket_id = 'curricula'` — la política aplica solo a este bucket.
- `(storage.foldername(name))[1] = auth.uid()::text` — el primer segmento del path debe ser el ID del usuario autenticado. Un usuario no puede subir archivos a la carpeta de otro.
- `rol_actual() = 'postulante'` — solo postulantes pueden subir CVs (función definida en la migración de RLS).

### Leer archivos (SELECT)

```sql
CREATE POLICY "curricula: leer cv"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'curricula'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR rol_actual() = 'municipalidad'
    )
  );
```

El postulante puede leer sus propios archivos. La municipalidad puede leer todos.

### Eliminar archivos (DELETE)

```sql
CREATE POLICY "curricula: postulante elimina su cv"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'curricula'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
```

Solo el postulante dueño del archivo puede eliminarlo.

> Las políticas de `storage.objects` usan `WITH CHECK` para INSERT (condición sobre los datos entrantes) y `USING` para SELECT/DELETE (condición sobre los datos existentes).

---

## Acceder a archivos

### Bucket privado — URL firmada

Para mostrar o descargar un archivo de un bucket privado, se genera una URL firmada desde el servidor. La URL tiene un tiempo de expiración.

```ts
// Server Component o Server Action
const { data } = await supabaseAdmin.storage
  .from('curricula')
  .createSignedUrl(cvPath, 3600) // expira en 1 hora

const urlFirmada = data?.signedUrl ?? null
```

Se usa `supabaseAdmin` (con service role) para generar la URL firmada, porque el admin client bypasea RLS — la verificación de quién puede acceder ya ocurrió en el Server Component antes de generar la URL.

> No guardar la URL firmada en la base de datos: vence y quedará desactualizada. Guardar el path (`<user-id>/<timestamp>.pdf`) y generar la URL al momento de mostrarla.

### Bucket público — URL directa

```ts
const { data } = supabase.storage
  .from('logos')
  .getPublicUrl('empresa-abc.png')

const urlPublica = data.publicUrl
```

---

## Límites y tipos de archivo

Se configuran al crear el bucket:

| Propiedad | SQL | Descripción |
|---|---|---|
| `file_size_limit` | Número en bytes | `5242880` = 5 MB |
| `allowed_mime_types` | Array de strings | `array['application/pdf', 'image/png']` |

Si se intenta subir un archivo que supera el límite o con un tipo no permitido, Supabase rechaza la operación antes de que llegue a las políticas RLS.

Aun así, **validar en la Server Action** antes de intentar el upload:

```ts
const CV_MAX_BYTES = 5 * 1024 * 1024
const CV_ALLOWED_TYPES = new Set(['application/pdf', 'application/msword', ...])
const CV_ALLOWED_EXTS = new Set(['pdf', 'doc', 'docx'])

if (archivo.size > CV_MAX_BYTES) return { ok: false, error: 'El archivo no puede superar 5 MB' }

const ext = archivo.name.split('.').pop()?.toLowerCase() ?? ''
if (!CV_ALLOWED_TYPES.has(archivo.type) || !CV_ALLOWED_EXTS.has(ext)) {
  return { ok: false, error: 'Solo se aceptan archivos PDF, DOC o DOCX' }
}
```

`archivo.type` (el MIME type) viene del browser y puede ser manipulado. Validar también la extensión del nombre del archivo como defensa adicional.

---

## Modificar un bucket existente

```sql
UPDATE storage.buckets
SET
  file_size_limit = 10485760,  -- aumentar a 10 MB
  allowed_mime_types = array['application/pdf']  -- restringir solo a PDF
WHERE id = 'curricula';
```

Si el bucket fue creado desde el dashboard y querés agregar estos límites después, podés ejecutarlo en el SQL Editor o en una nueva migración.

---

## Reglas del proyecto

- Crear los buckets vía migración SQL, no solo desde el dashboard, para que queden versionados en Git.
- Usar siempre `ON CONFLICT (id) DO NOTHING` para que la migración sea idempotente.
- Definir políticas RLS inmediatamente después de crear el bucket en el mismo archivo de migración.
- Guardar en la base de datos solo el **path** del archivo, nunca la URL firmada.
- Validar tipo y tamaño en la Server Action antes del upload, aunque el bucket también tenga límites configurados.
- Usar `supabaseAdmin` solo en Server Actions y Server Components para operaciones que requieran bypasear RLS (como `createSignedUrl`).
