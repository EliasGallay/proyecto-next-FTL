# Guía de Variables de Entorno

## Qué son las variables de entorno

Son valores de configuración que viven fuera del código — claves de API, URLs, contraseñas — que cambian según el entorno (tu máquina, la de otro alumno, producción en Vercel).

En lugar de hardcodear estos valores en el código:

```ts
// ❌ Nunca hacer esto
const supabase = createClient('https://abc123.supabase.co', 'eyJhbGc...')
```

Se leen desde variables de entorno:

```ts
// ✅ Correcto
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
)
```

---

## Archivos de entorno en este proyecto

```
.env.local       ← tus variables locales, nunca va a Git
.env.example     ← plantilla con los nombres de las variables, sin valores reales
```

`.env.local` está en el `.gitignore` — nadie más ve tus claves. `.env.example` sí va a Git y sirve para que cualquier persona que clone el repo sepa qué variables necesita configurar.

---

## Variables de este proyecto

```env
# URL de tu proyecto en Supabase
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co

# Clave pública (anon key) — va al navegador, RLS la protege
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Service role key — SOLO en el servidor, nunca al navegador
SUPABASE_SECRET_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# URL base de la app — usada en links de emails (confirmación, reset de contraseña)
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

Dónde encontrar cada valor en el dashboard de Supabase:
- `SUPABASE_URL` y ambas keys: **Project Settings → API**
- `SITE_URL`: la escribís vos (en local es siempre `http://localhost:3000`)

---

## Pública vs privada — la regla del prefijo

El prefijo `NEXT_PUBLIC_` le dice a Next.js que esa variable puede incluirse en el bundle que se envía al navegador.

| Variable | Prefijo | Va al navegador | Puede verla el usuario |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Sí | Sí | Sí |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Sí | Sí | Sí |
| `SUPABASE_SECRET_KEY` | No | No | No |
| `NEXT_PUBLIC_SITE_URL` | Sí | Sí | Sí |

La `PUBLISHABLE_KEY` es pública a propósito — RLS protege los datos. La `SECRET_KEY` **nunca** lleva `NEXT_PUBLIC_` porque saltea RLS y expuesta sería un agujero de seguridad crítico.

---

## Configurar el entorno local

1. Copiar el archivo de ejemplo:

```bash
cp .env.example .env.local
```

2. Abrir `.env.local` y completar con los valores reales de tu proyecto en Supabase.

3. Reiniciar el servidor de desarrollo si ya estaba corriendo — Next.js solo lee las variables al arrancar:

```bash
npm run dev
```

---

## Configurar en Vercel (producción)

Las variables de `.env.local` no se suben a Git y Vercel no las conoce. Hay que cargarlas manualmente.

1. Ir al proyecto en **vercel.com**
2. **Settings → Environment Variables**
3. Agregar cada variable con su valor:

| Variable | Entorno |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Production, Preview, Development |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Production, Preview, Development |
| `SUPABASE_SECRET_KEY` | Production, Preview, Development |
| `NEXT_PUBLIC_SITE_URL` | **Production**: `https://tu-dominio.vercel.app` |

> `NEXT_PUBLIC_SITE_URL` tiene un valor distinto en producción — tiene que ser la URL real del deploy, no `localhost`.

4. Después de agregar las variables, hacer un nuevo deploy para que tomen efecto.

---

## Errores comunes

### `process.env.NEXT_PUBLIC_SUPABASE_URL` es `undefined`

- Verificar que el archivo se llama exactamente `.env.local` (con el punto adelante)
- Verificar que la variable tiene el prefijo correcto
- Reiniciar el servidor de desarrollo

### Las variables funcionan en local pero no en Vercel

Las variables no están cargadas en Vercel. Ir a **Settings → Environment Variables** y verificar que todas estén cargadas y con los valores correctos.

### El link del email de confirmación lleva a `localhost` en producción

`NEXT_PUBLIC_SITE_URL` tiene el valor `http://localhost:3000` en la variable de Vercel. Actualizarla con la URL real del deploy.

### `SUPABASE_SECRET_KEY` aparece en el código del cliente

Se agregó el prefijo `NEXT_PUBLIC_` por error. Quitarlo y hacer un nuevo deploy. Rotar la service role key desde **Project Settings → API** si ya estuvo expuesta.
