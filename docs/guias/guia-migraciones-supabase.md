# Guía de Migraciones con Supabase

## Lo más importante antes de empezar: la base de datos vive afuera

Cuando trabajás con Supabase, **la base de datos no está en tu proyecto**. Está en los servidores de Supabase, en la nube. Tu proyecto de Next.js se conecta a ella por internet igual que se conectaría a cualquier API externa.

Esto tiene una consecuencia práctica que suele confundir al principio:

> Cuando modificás código en tu proyecto y recargás el navegador, los cambios se ven de inmediato. Cuando modificás la base de datos, tenés que ir al **dashboard de Supabase** a verificar que el cambio se aplicó — el proyecto no te lo muestra solo.

El dashboard de Supabase está en `https://app.supabase.com`. Desde ahí podés ver las tablas, ejecutar SQL, revisar los datos y verificar que todo esté como esperás. Usarlo seguido, especialmente al principio, es parte del flujo de trabajo.

---

## Dos formas de modificar la base de datos

### Opción A — SQL Editor en el dashboard (directa)

Entrás al dashboard, vas a **SQL Editor**, escribís el SQL y lo ejecutás. Es la forma más simple y es perfectamente válida, especialmente para aprender y para proyectos en desarrollo.

**Cuándo usarla:** cuando estás explorando, probando cambios, o recién aprendiendo el flujo.

### Opción B — Supabase CLI con archivos de migración (recomendada)

Los cambios se escriben en archivos `.sql` dentro del proyecto y se aplican con un comando. El CLI lleva registro de qué cambios ya fueron aplicados.

**Cuándo usarla:** cuando trabajás en equipo, cuando necesitás reproducir el schema en otro entorno, o cuando el proyecto crece y necesitás tener un historial claro de qué cambió y cuándo.

> **Para este proyecto:** podés usar el SQL Editor directamente por ahora. El CLI es una buena práctica a incorporar cuando el flujo básico ya esté claro.

---

## ¿Qué es una migración?

Una **migración** es un archivo SQL que describe un cambio en la base de datos (crear una tabla, agregar una columna, modificar un índice, etc.). El CLI de Supabase lleva un registro de qué migraciones ya fueron aplicadas, para que nunca se ejecuten dos veces.

Ventajas frente a modificar el schema manualmente desde el dashboard:
- Los cambios quedan versionados en Git junto al código.
- Todo el equipo puede reproducir el mismo schema.
- Se puede saber exactamente qué se aplicó y cuándo.

---

## Requisitos previos

### 1. Instalar el CLI de Supabase

```bash
npm install supabase --save-dev
```

Verificá que quedó instalado:

```bash
npx supabase --version
```

### 2. Inicializar el proyecto local

Solo hay que hacerlo **una vez** por repositorio:

```bash
npx supabase init
```

Esto crea el directorio `supabase/` con la siguiente estructura:

```
supabase/
├── config.toml          ← configuración del proyecto
└── migrations/          ← aquí van los archivos .sql
```

> Commiteá `supabase/config.toml` y `supabase/migrations/` en Git.

### 3. Vincular con tu proyecto en Supabase Cloud

```bash
npx supabase link --project-ref <tu-project-ref>
```

El `project-ref` es el ID que aparece en la URL del dashboard:
`https://app.supabase.com/project/<project-ref>`

El CLI te va a pedir la contraseña de la base de datos (la creaste al configurar el proyecto).

### 4. (Opcional) Importar el schema actual

Si el proyecto ya tiene tablas creadas desde el dashboard y querés generar migraciones que representen ese estado:

```bash
npx supabase db pull
```

Esto genera un archivo `supabase/migrations/<timestamp>_remote_schema.sql` con todo el schema actual.

---

## Arrancar el CLI en un proyecto que ya tiene schema

Este es el caso de **este proyecto**: la migración inicial (`src/migrations/migration_001_schema.sql`) fue ejecutada a mano en el SQL Editor del dashboard. Las tablas ya existen en Supabase, pero el CLI no sabe nada de ellas.

### Por qué no alcanza con mover el archivo a `supabase/migrations/`

Mover el SQL a `supabase/migrations/` y correr `db push` va a intentar ejecutarlo de nuevo — y va a fallar porque las tablas ya existen. El CLI no compara el SQL con el estado de la base: simplemente ejecuta los archivos que todavía no están registrados en su tabla interna.

### La diferencia de fondo

| | `src/migrations/` | `supabase/migrations/` |
|---|---|---|
| Quién lo ejecuta | Vos, a mano, en el dashboard | El CLI automáticamente |
| Registro de aplicados | Ninguno | Tabla `supabase_migrations` en la BD |
| Comandos disponibles | Ninguno | `db push`, `migration list`, `db pull` |
| Sincronización del equipo | Manual | `db push` al clonar |

### El flujo correcto para este proyecto

```bash
# 1. Instalar el CLI e inicializar (si no está hecho)
npm install supabase --save-dev
npx supabase init

# 2. Vincular con el proyecto remoto
npx supabase link --project-ref <tu-project-ref>

# 3. Generar una migración desde el estado actual del remoto
npx supabase db pull
```

El `db pull` genera un archivo en `supabase/migrations/` que representa todo el schema que ya existe. El CLI lo registra como "ya aplicado" — no lo vuelve a ejecutar. A partir de ahí, cualquier cambio nuevo va en un archivo nuevo con `migration new`.

```bash
# 4. Commitear la migración generada
git add supabase/migrations/
git commit -m "chore: importa schema existente al CLI de Supabase"
```

El archivo en `src/migrations/` puede quedar como referencia histórica o borrarse — ya no cumple ninguna función una vez que el CLI está configurado.

---

## Comandos esenciales

| Comando | Qué hace |
|---|---|
| `npx supabase migration new <nombre>` | Crea un archivo de migración vacío |
| `npx supabase db push` | Aplica las migraciones pendientes al proyecto remoto |
| `npx supabase db pull` | Descarga el schema actual del remoto como migración |
| `npx supabase migration list` | Lista todas las migraciones y su estado |

---

## Flujo de trabajo paso a paso

### Paso 1 — Crear la migración

```bash
npx supabase migration new agregar_campo_telefono
```

Esto genera un archivo como:

```
supabase/migrations/20260929143000_agregar_campo_telefono.sql
```

El nombre tiene un **timestamp** al inicio para que las migraciones se apliquen en orden.

### Paso 2 — Escribir el SQL

Abrí el archivo generado y escribí el cambio:

```sql
-- Agrega el campo teléfono a la tabla usuarios
ALTER TABLE usuarios
ADD COLUMN telefono TEXT;
```

Algunas reglas:
- Las migraciones deben ser **idempotentes** cuando sea posible (usar `IF NOT EXISTS`, `IF EXISTS`).
- No borres ni modifiques migraciones que ya fueron aplicadas al remoto.
- Una migración por cambio lógico, no mezcles cosas sin relación.

### Paso 3 — Aplicar al proyecto remoto

```bash
npx supabase db push
```

El CLI muestra qué migraciones va a aplicar antes de ejecutarlas y pide confirmación.

### Paso 4 — Commitear

```bash
git add supabase/migrations/
git commit -m "feat: agrega campo telefono a usuarios"
```

---

## Ejemplos de SQL frecuentes

### Crear una tabla

```sql
CREATE TABLE IF NOT EXISTS postulaciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  oferta_id UUID NOT NULL REFERENCES ofertas(id) ON DELETE CASCADE,
  usuario_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mensaje TEXT,
  creado_en TIMESTAMPTZ DEFAULT NOW()
);
```

### Agregar una columna

```sql
ALTER TABLE ofertas
ADD COLUMN IF NOT EXISTS destacada BOOLEAN DEFAULT FALSE;
```

### Crear un índice

```sql
CREATE INDEX IF NOT EXISTS idx_postulaciones_oferta
ON postulaciones(oferta_id);
```

### Habilitar Row Level Security

```sql
ALTER TABLE postulaciones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "usuarios pueden ver sus postulaciones"
ON postulaciones
FOR SELECT
USING (auth.uid() = usuario_id);
```

---

## Errores comunes

### `Error: Local migration files do not match remote database`

El schema remoto tiene cambios que no están representados en archivos locales (probablemente alguien modificó algo desde el dashboard).

**Solución:** correr `npx supabase db pull` para sincronizar, revisar el archivo generado y commitearlo.

---

### `ERROR: relation "tabla" already exists`

La tabla ya existe en el remoto, probablemente por una migración anterior o por haberla creado manualmente.

**Solución:** usar `CREATE TABLE IF NOT EXISTS` en lugar de `CREATE TABLE`.

---

### `supabase: command not found`

El CLI no está instalado globalmente o no está en el PATH.

**Solución:** usar siempre el prefijo `npx`:

```bash
npx supabase <comando>
```

---

### La migración se aplicó pero el código no ve los cambios

El cliente de Supabase en el frontend usa los tipos generados. Si modificaste el schema, regenerá los tipos:

```bash
npx supabase gen types typescript --project-id <project-ref> > src/types/database.types.ts
```

---

## Reglas del proyecto

- **Nunca** modificar migraciones ya commiteadas y pusheadas.
- **Siempre** crear una nueva migración para cada cambio de schema.
- Los archivos en `supabase/migrations/` van en Git — son parte del código.
- No usar el dashboard de Supabase para modificar el schema en producción sin reflejarlo en una migración.
