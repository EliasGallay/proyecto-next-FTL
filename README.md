# Portal Municipal de Empleo

Aplicación web para la gestión de ofertas laborales. Construida con **Next.js 16**, **React 19** y **TypeScript**.

---

## Requisitos previos

- [Node.js](https://nodejs.org/) versión 18 o superior
- Git

---

## Instalación y primer arranque

```bash
# 1. Clonar el repositorio
git clone <url-del-repositorio>
cd proyecto-prueba

# 2. Instalar dependencias
npm install

# 3. Iniciar el servidor de desarrollo
npm run dev
```

Abrí el navegador en [http://localhost:3000](http://localhost:3000). Cada vez que guardes un archivo, la página se actualiza automáticamente.

### Otros comandos

```bash
npm run build   # Compilar para producción
npm run start   # Correr la versión compilada
npm run lint    # Verificar errores de código
```

---

## Conceptos clave de Next.js

### App Router — una carpeta es una ruta

Todo lo que esté dentro de `src/app/` se convierte en una ruta de la aplicación. La regla es simple: **la estructura de carpetas define las URLs**.

```
src/app/
├── page.tsx           →  http://localhost:3000/
├── ofertas/
│   └── page.tsx       →  http://localhost:3000/ofertas
└── admin/
    └── page.tsx       →  http://localhost:3000/admin
```

El archivo siempre se llama `page.tsx` y debe exportar una función por defecto que retorne JSX.

```tsx
// src/app/ofertas/page.tsx
export default function OfertasPage() {
  return <h1>Listado de ofertas</h1>;
}
```

### Server Components vs Client Components

Por defecto, todos los componentes en Next.js son **Server Components**: se renderizan en el servidor y no tienen acceso a APIs del navegador (`useState`, `useEffect`, eventos del DOM, etc.).

Cuando necesitás usar esas APIs, agregás `"use client"` al inicio del archivo:

```tsx
"use client";

import { useState } from "react";

export default function Contador() {
  const [n, setN] = useState(0);
  return <button onClick={() => setN(n + 1)}>{n}</button>;
}
```

**Regla práctica:** empezá sin `"use client"`. Solo lo agregás cuando el componente necesita estado, efectos o interacción del usuario. Podés ver un ejemplo real en `src/app/saludo/page.tsx`.

### Route Handlers — APIs dentro del proyecto

Las rutas de API se definen con un archivo `route.ts`. La carpeta `api/` dentro de `src/app/` es convención, pero no obligatoria.

```
src/app/api/saludo/route.ts  →  GET http://localhost:3000/api/saludo
```

```ts
// src/app/api/saludo/route.ts
export async function GET() {
  return Response.json({ mensaje: "Hola" });
}
```

Podés ver cómo `src/app/saludo/page.tsx` consume esa API con un `fetch`.

### Navegación entre páginas — componente `<Link>`

Para navegar entre páginas **no uses `<a href="...">`**. En Next.js eso hace un reload completo del browser y descarta todo el estado de la app.

Usá el componente `<Link>` de `next/link`:

```tsx
import Link from "next/link";

export default function NavBar() {
  return (
    <nav>
      <Link href="/">Inicio</Link>
      <Link href="/ofertas">Ofertas</Link>
      <Link href="/admin">Admin</Link>
    </nav>
  );
}
```

`<Link>` hace navegación del lado del cliente: cambia la URL y renderiza la nueva página sin recargar el browser. También puede recibir cualquier prop HTML válida de `<a>` (como `className`).

Para navegar desde código (por ejemplo después de enviar un formulario), usá el hook `useRouter` de `next/navigation`:

```tsx
"use client";

import { useRouter } from "next/navigation";

export default function FormularioOferta() {
  const router = useRouter();

  function handleSubmit() {
    // ... guardar datos
    router.push("/ofertas"); // redirige al listado
  }

  return <button onClick={handleSubmit}>Guardar</button>;
}
```

### Rutas dinámicas

Una carpeta con nombre entre corchetes crea un parámetro en la URL:

```
src/app/ofertas/[id]/page.tsx  →  /ofertas/1  /ofertas/42  /ofertas/abc
```

En Next.js 16, **`params` es una Promise** — hay que esperarla con `await`:

```tsx
// src/app/ofertas/[id]/page.tsx
interface Props {
  params: Promise<{ id: string }>;
}

export default async function OfertaDetallePage({ params }: Props) {
  const { id } = await params; // obligatorio el await en Next.js 16
  return <h1>Oferta #{id}</h1>;
}
```

---

## Rutas del proyecto

| URL | Archivo | Descripción |
|-----|---------|-------------|
| `/` | `src/app/page.tsx` | Página principal |
| `/ofertas` | `src/app/ofertas/page.tsx` | Listado de ofertas laborales |
| `/ofertas/[id]` | `src/app/ofertas/[id]/page.tsx` | Detalle de una oferta (ruta dinámica) |
| `/empresa` | `src/app/empresa/page.tsx` | Dashboard para empresas |
| `/admin` | `src/app/admin/page.tsx` | Dashboard de administración |
| `/saludo` | `src/app/saludo/page.tsx` | Ejemplo de Client Component con fetch |
| `/api/saludo` | `src/app/api/saludo/route.ts` | Endpoint de ejemplo |

---

## Estructura de carpetas

```
src/
├── app/                        # Rutas de la aplicación
│   ├── api/                    # Route Handlers (endpoints de la API)
│   │   └── saludo/
│   │       └── route.ts        # GET /api/saludo
│   ├── admin/
│   │   └── page.tsx            # /admin
│   ├── empresa/
│   │   └── page.tsx            # /empresa
│   ├── ofertas/
│   │   ├── page.tsx            # /ofertas
│   │   └── [id]/
│   │       └── page.tsx        # /ofertas/:id
│   ├── saludo/
│   │   └── page.tsx            # /saludo
│   ├── globals.css             # Estilos globales + variables de color
│   ├── layout.tsx              # Layout raíz: envuelve todas las páginas
│   └── page.tsx                # /
├── components/
│   └── ui/                     # Componentes de interfaz (Button, Input, Calendar…)
├── hooks/                      # Custom hooks reutilizables
│   └── useOferta.ts            # Ejemplo: fetch de una oferta por id
└── lib/
    └── utils.ts                # Utilidades compartidas (función cn())
```

### El layout raíz

`src/app/layout.tsx` envuelve **todas** las páginas. Es el lugar para agregar elementos que aparecen en toda la app (navegación, footer, providers globales).

En Next.js 16 se usa el tipo `LayoutProps`:

```tsx
import type { LayoutProps } from "next";

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
```

---

## Estilos

El proyecto usa **Tailwind CSS v4**. Las clases se aplican directamente en el JSX:

```tsx
<button className="bg-blue-600 text-white px-4 py-2 rounded">
  Enviar
</button>
```

No existe un archivo `tailwind.config.js`. La configuración vive en `src/app/globals.css`, que también define las variables de color del proyecto:

```css
:root {
  --teal: #0f5b53;    /* color principal */
  --ink: #1b2926;     /* texto */
  --paper: #f8f8f4;   /* fondo */
  --muted: #6e7772;   /* texto secundario */
  --line: #d8ddd7;    /* bordes */
}
```

Usá estas variables en CSS con `var(--teal)` cuando necesites los colores del diseño.

---

## Componentes UI (shadcn)

El proyecto usa [shadcn/ui](https://ui.shadcn.com/), una colección de componentes listos para usar. Los componentes ya instalados están en `src/components/ui/`.

Para agregar un componente nuevo:

```bash
npx shadcn add button
npx shadcn add input
npx shadcn add dialog
```

El componente se copia en `src/components/ui/` y podés modificarlo libremente.

Para usarlo en una página:

```tsx
import { Button } from "@/components/ui/button";

export default function MiPagina() {
  return <Button>Enviar solicitud</Button>;
}
```

El alias `@/` siempre apunta a la carpeta `src/`, por lo que `@/components/ui/button` es lo mismo que `src/components/ui/button`.

---

## Hooks

Un **custom hook** es una función que empieza con `use` y encapsula lógica que usa APIs de React (`useState`, `useEffect`, etc.). Sirven para sacar esa lógica fuera del componente y poder reutilizarla.

**Cuándo crear un hook:** cuando un componente mezcla lógica de datos con lógica de presentación, o cuando la misma lógica aparece en más de un lugar.

El proyecto incluye `src/hooks/useOferta.ts` como punto de partida:

```ts
// src/hooks/useOferta.ts
export function useOferta(id: string) {
  const [data, setData] = useState<Oferta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/ofertas/${id}`)
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  return { data, loading, error };
}
```

Para usarlo en un Client Component:

```tsx
"use client";

import { useOferta } from "@/hooks/useOferta";

export default function DetalleOferta({ id }: { id: string }) {
  const { data, loading, error } = useOferta(id);

  if (loading) return <p>Cargando...</p>;
  if (error) return <p>Error: {error}</p>;
  return <p>Oferta #{data?.id}</p>;
}
```

A medida que construyas la API (`/api/ofertas/[id]`), extendé la interfaz `Oferta` en el hook para que refleje los campos reales que devuelve el servidor.

---

## HTTP: verbos y códigos de estado

### Verbos HTTP

El verbo indica **qué operación** se quiere hacer sobre un recurso. En los Route Handlers de Next.js, cada verbo se exporta como una función con su nombre:

| Verbo | Uso | Ejemplo de ruta |
|-------|-----|-----------------|
| `GET` | Leer un recurso o una lista | `GET /api/ofertas` |
| `POST` | Crear un recurso nuevo | `POST /api/ofertas` |
| `PUT` | Reemplazar un recurso completo | `PUT /api/ofertas/42` |
| `PATCH` | Modificar campos específicos | `PATCH /api/ofertas/42` |
| `DELETE` | Eliminar un recurso | `DELETE /api/ofertas/42` |

```ts
// src/app/api/ofertas/route.ts
export async function GET() {
  // devuelve la lista de ofertas
  return Response.json([]);
}

export async function POST(request: Request) {
  const body = await request.json(); // datos enviados por el cliente
  // crear la oferta con los datos de body...
  return Response.json({ id: "nueva" }, { status: 201 });
}
```

```ts
// src/app/api/ofertas/[id]/route.ts
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  // actualizar campos de la oferta id...
  return Response.json({ id, ...body });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  // eliminar oferta id...
  return new Response(null, { status: 204 });
}
```

### Códigos de estado HTTP

El código de estado le dice al cliente **qué pasó** con su pedido. Se divide en rangos:

#### 2xx — Éxito

| Código | Nombre | Cuándo usarlo |
|--------|--------|---------------|
| `200` | OK | Respuesta exitosa general (GET, PATCH, PUT) |
| `201` | Created | Se creó un recurso nuevo (POST) |
| `204` | No Content | Éxito sin cuerpo de respuesta (DELETE) |

#### 4xx — Error del cliente

El cliente envió algo incorrecto. No es un bug del servidor.

| Código | Nombre | Cuándo usarlo |
|--------|--------|---------------|
| `400` | Bad Request | Los datos enviados son inválidos o incompletos |
| `401` | Unauthorized | No hay sesión iniciada |
| `403` | Forbidden | Hay sesión, pero sin permisos para esa acción |
| `404` | Not Found | El recurso no existe |
| `409` | Conflict | Conflicto con el estado actual (ej: email duplicado) |

#### 5xx — Error del servidor

Algo falló en el servidor. El cliente hizo todo bien.

| Código | Nombre | Cuándo usarlo |
|--------|--------|---------------|
| `500` | Internal Server Error | Error inesperado en el servidor |

#### Cómo devolver un código específico

```ts
// 201 con cuerpo
return Response.json({ id: "nueva" }, { status: 201 });

// 404 con mensaje de error
return Response.json({ error: "Oferta no encontrada" }, { status: 404 });

// 204 sin cuerpo
return new Response(null, { status: 204 });
```

---

## Variables de entorno

Las variables de entorno guardan configuración que no debe estar en el código fuente: URLs de bases de datos, claves de APIs, secretos, etc.

Creá un archivo `.env.local` en la raíz del proyecto (este archivo **no se sube a git**):

```bash
# .env.local
DATABASE_URL=postgresql://usuario:contraseña@localhost:5432/empleo
API_SECRET_KEY=mi-clave-secreta
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Regla de prefijos

| Prefijo | Dónde se puede leer | Cuándo usarlo |
|---------|--------------------|--------------:|
| Sin prefijo | Solo en el servidor (Route Handlers, Server Components) | Secretos, credenciales |
| `NEXT_PUBLIC_` | En el servidor y en el cliente | Valores que el browser puede ver |

Las variables **sin** `NEXT_PUBLIC_` nunca llegan al browser. Si un Client Component intenta leerlas, obtiene `undefined`.

### Cómo leerlas en el código

```ts
// Route Handler o Server Component — variables privadas y públicas
const dbUrl = process.env.DATABASE_URL;
const appUrl = process.env.NEXT_PUBLIC_APP_URL;
```

```ts
// Client Component — solo variables NEXT_PUBLIC_
const appUrl = process.env.NEXT_PUBLIC_APP_URL;
```

### Archivos por entorno

| Archivo | Commiteado | Cuándo aplica |
|---------|-----------|--------------|
| `.env.local` | No | Desarrollo local |
| `.env` | Sí (solo defaults seguros) | Todos los entornos |
| `.env.production` | Depende | Solo en producción |

Para compartir el esquema de variables con el equipo sin exponer valores reales, podés crear un `.env.example` commiteado con los nombres de las variables pero sin sus valores:

```bash
# .env.example
DATABASE_URL=
API_SECRET_KEY=
NEXT_PUBLIC_APP_URL=
```

---

## Control de versiones con Git

### `.gitignore` — qué no se sube al repositorio

El archivo `.gitignore` en la raíz del proyecto le indica a Git qué archivos y carpetas ignorar. El proyecto ya tiene uno configurado con las exclusiones necesarias para Next.js:

| Entrada | Por qué se ignora |
|---------|------------------|
| `node_modules/` | Dependencias instaladas localmente — cada uno las instala con `npm install` |
| `.next/` | Archivos generados por el servidor de desarrollo y el build |
| `.env*` | Archivos de entorno — pueden contener contraseñas y claves |
| `*.tsbuildinfo` | Caché de compilación de TypeScript |

Para agregar nuevas entradas, editá el archivo `.gitignore` directamente:

```bash
# ignorar una carpeta
/mi-carpeta/

# ignorar un tipo de archivo
*.log

# ignorar un archivo específico
notas-personales.txt
```

**Regla:** si un archivo contiene credenciales, es generado automáticamente, o es específico de tu máquina, va en `.gitignore`.

---

### Flujo de trabajo con ramas

El repositorio usa dos tipos de ramas:

- **`main`** — código estable. Lo que está acá debe funcionar siempre. Nadie trabaja directamente sobre esta rama.
- **`feature/nombre-de-la-tarea`** — una rama por cada funcionalidad o tarea. Se crea a partir de `main`, se trabaja ahí, y cuando está lista se integra de vuelta.

#### Crear y trabajar en una rama feature

```bash
# 1. Asegurate de estar en main y tenerlo actualizado
git checkout main
git pull origin main

# 2. Crear la rama feature
git checkout -b feature/listado-ofertas

# 3. Trabajar, guardar cambios
git status                         # ver qué archivos cambiaron
git add src/app/ofertas/page.tsx   # agregar archivos específicos
git add .                          # o agregar todos los cambios

# 4. Hacer un commit
git commit -m "feat: agrega listado de ofertas"

# 5. Subir la rama al repositorio remoto
git push origin feature/listado-ofertas
```

#### Integrar la rama en main (Pull Request)

Una vez que la funcionalidad está completa y revisada:

```bash
# Opción A: merge directo (en equipos pequeños o sin revisión)
git checkout main
git merge feature/listado-ofertas
git push origin main

# Opción B: Pull Request (recomendada en equipo)
# Subís la rama con git push, abrís un PR en GitHub/GitLab,
# un compañero la revisa, y se mergea desde la interfaz.
```

Después de mergear, podés borrar la rama feature:

```bash
git branch -d feature/listado-ofertas           # borra local
git push origin --delete feature/listado-ofertas # borra remoto
```

#### Resumen del ciclo completo

```
main ──────────────────────────────────────► main (estable)
       │                          │
       └─► feature/mi-tarea ──────┘
           (trabajás acá)    (merge al terminar)
```

#### Mensajes de commit

Usá el formato `tipo: descripción` para que el historial sea legible:

| Tipo | Cuándo usarlo |
|------|--------------|
| `feat:` | Nueva funcionalidad |
| `fix:` | Corrección de un bug |
| `style:` | Cambios de estilos o formato |
| `refactor:` | Cambios internos sin afectar comportamiento |
| `docs:` | Cambios en documentación |

```bash
git commit -m "feat: agrega formulario de postulación"
git commit -m "fix: corrige error 404 en ruta de detalle"
git commit -m "docs: actualiza README con sección de hooks"
```

---

## Diferencias con tutoriales de versiones anteriores de Next.js

Si encontrás ejemplos en internet, tené en cuenta que **Next.js 16 tiene cambios incompatibles** con versiones anteriores:

| Concepto | Versiones anteriores | Next.js 16 (este proyecto) |
|----------|---------------------|---------------------------|
| Parámetros de ruta dinámica | `params.id` directo | `const { id } = await params` |
| Tipo del layout | `{ children: ReactNode }` | `LayoutProps<"/ruta">` de `"next"` |
| Configuración de Tailwind | `tailwind.config.js` | Solo `globals.css` |

Cuando algo no funcione como dice un tutorial, revisá la documentación local incluida en el proyecto:

```
node_modules/next/dist/docs/
```
