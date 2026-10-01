# Por qué cada módulo del CLAUDE.md

> El CLAUDE.md es el documento de instrucciones que la IA lee antes de tocar cualquier cosa del proyecto.
> Cada sección existe porque sin ella la IA hace algo específico y problemático.
> Este documento explica el problema que resuelve cada regla.

---

## Qué es el CLAUDE.md

Cuando la IA trabaja en un proyecto, llega sin ningún contexto. No sabe qué stack usa el proyecto, qué convenciones hay, qué está prohibido hacer. El CLAUDE.md es el briefing que recibe antes de empezar — como las instrucciones que le darías a alguien nuevo en el equipo.

Pero hay una diferencia importante con un humano: la IA hace exactamente lo que entiende, con mucha velocidad y sin dudar. Si no se le dice que no haga algo, lo hace. Por eso cada regla en el CLAUDE.md existe como respuesta a un comportamiento concreto que la IA tendría si no se la corrigiera.

---

## Commands (Comandos)

```bash
npm run dev
npm run build
npm run lint
```

**El problema que resuelve:**
La IA ejecuta comandos cuando valida su propio trabajo. Sin una lista explícita, puede inventar comandos que no existen (`npm run test`, `npm run start:dev`) o usar la sintaxis incorrecta para este proyecto en particular.

**Por qué importa:**
Un comando inventado falla silenciosamente o da un error confuso. Si la IA sabe exactamente qué comandos tiene disponibles, puede validar su trabajo de forma confiable.

**La línea `No test runner is currently configured`** también es intencional: le dice a la IA que no busque ni corra tests que no existen.

---

## Architecture — Routes y Route Groups

**El problema que resuelve:**
Sin el mapa de rutas, la IA puede:
- Crear un archivo en la ubicación incorrecta (`src/pages/` en lugar de `src/app/`)
- Suponer que una ruta existe cuando no existe
- Generar una estructura de carpetas que rompe el App Router
- Usar una ruta dinámica con una convención de nombres inventada

**Por qué importa:**
En Next.js App Router, la estructura de carpetas **es** el sistema de rutas. Un archivo en el lugar equivocado no es "código incorrecto" que da un error claro — simplemente no existe como ruta o rompe silenciosamente el layout.

**La regla `Do not invent new architectural patterns`:**
La IA tiene tendencia a "mejorar" el proyecto aplicando patrones que conoce de otros proyectos. Esta regla le dice que si ya existe una forma de hacer algo en el proyecto, esa es la forma correcta — no inventar una variante nueva.

---

## Next.js 16

**El problema que resuelve:**
La IA fue entrenada con datos hasta cierta fecha. Next.js 15 y 16 introdujeron cambios que rompen patrones que antes funcionaban. Si la IA usa su "memoria" de Next.js 13/14, puede generar código que no funciona en este proyecto.

**Por qué importa:**
La IA no sabe qué versión tiene el proyecto a menos que se lo digamos. Y si lo sabe, puede seguir usando patrones viejos porque los tiene más "aprendidos".

### Los breaking changes específicos que se mencionan:

**`params` es una Promise:**
En Next.js 16, los parámetros de rutas dinámicas son asíncronos. Antes se usaban directamente:
```ts
// Next.js 14 (viejo)
export default function Page({ params }: { params: { id: string } }) {
  const { id } = params  // sincrónico
}

// Next.js 16 (correcto)
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params  // asíncrono
}
```
Si la IA no sabe esto, genera el patrón viejo y la página no funciona.

**`LayoutProps<"/">`:**
El tipo para las props de un layout cambió. La IA generaría el tipo manual (`{ children: ReactNode }`) que es incorrecto en esta versión.

**La instrucción de leer `node_modules/next/dist/docs/`:**
Le dice a la IA que si tiene dudas sobre Next.js, lea la documentación que viene instalada con el paquete — no use su memoria. Es como decirle "consultá el manual del auto que tenés, no el del modelo del año pasado".

---

## Server Components y Client Components

**El problema que resuelve:**
La IA tiene mucho más "entrenamiento" con código React clásico (Client Components, hooks, estado) que con Server Components. Su instinto natural es agregar `'use client'` y usar `useState`/`useEffect` para todo, porque eso es lo que predomina en su dataset de entrenamiento.

**Por qué importa:**
Convertir componentes en Client Components innecesariamente significa:
- JavaScript extra que se descarga en el browser
- Pérdida de la capacidad de consultar la base de datos directamente
- Renderizado más lento
- Arquitectura más compleja sin beneficio

**La regla del boundary mínimo:**
La tendencia concreta de la IA es: "este botón necesita un `onClick`, entonces hago toda la página `'use client'`". La instrucción le dice que el botón sea el Client Component, no la página entera.

---

## Route Handlers / REST API

**El problema que resuelve:**
Cuando la IA no tiene instrucciones específicas, tiende a crear una API REST clásica por reflejo: un archivo `route.ts` por cada recurso, con métodos GET/POST/PUT/DELETE. Eso es lo que dominaba antes de que existieran los Server Actions.

**Por qué importa:**
Para una app Next.js que consume sus propios datos, los Route Handlers son una vuelta innecesaria: el servidor llama a sí mismo por HTTP. Es más lento, más código, y expone URLs públicas que no necesitan existir.

**La lista explícita de cuándo SÍ usar Route Handlers:**
La IA necesita una lista concreta de casos para saber cuándo el Route Handler es la herramienta correcta: webhooks externos, integraciones con otras apps, APIs públicas. Sin la lista, aplica la herramienta equivocada por defecto.

**`Do not put substantial reusable business logic directly in route.ts`:**
La IA tiende a poner todo en el archivo del handler. Esta regla le dice que el handler es solo la puerta de entrada HTTP — la lógica real va en otro lado para poder reutilizarla.

---

## Server Actions

**El problema que resuelve:**
Dos problemas distintos:

**1. Nombres de archivos inventados:**
Sin la convención explícita, la IA puede crear `mutations.ts`, `server.ts`, `handlers.ts`, `api.ts`. Cada desarrollador encuentra una convención diferente en el proyecto. La regla dice: se llama `actions.ts`, siempre.

**2. El antipatrón Server Action → Route Handler:**
La tendencia natural de la IA, cuando tiene que hacer una mutación, es:
```
UI → Server Action → fetch("/api/recurso") → Route Handler → Supabase
```
Le parece "prolijo" separar el HTTP del servidor. El CLAUDE.md le muestra explícitamente el antipatrón y el patrón correcto:
```
UI → Server Action → Supabase (directo)
```

---

## Server-side security

**El problema que resuelve:**
Este es uno de los módulos más importantes. La IA puede generar código funcionalmente correcto pero inseguro de una forma muy específica: confiar en valores que vienen del cliente para tomar decisiones de autorización.

**El ejemplo concreto:**

```ts
// ❌ Lo que la IA podría generar sin esta instrucción
export async function actualizarOferta(formData: FormData) {
  const userId = formData.get('userId')  // viene del cliente — puede ser falsificado
  const rol = formData.get('rol')        // viene del cliente — puede ser falsificado
  
  if (rol === 'empresa') {
    await supabase.from('ofertas').update(...)
  }
}

// ✅ Lo correcto
export async function actualizarOferta(formData: FormData) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()  // del servidor, no falsificable
  
  const { data: usuario } = await supabase
    .from('usuarios').select('rol').eq('id', user.id).single()  // del servidor
  
  if (usuario?.rol === 'empresa') { ... }
}
```

**Por qué la IA hace esto:**
No por malicia — simplemente genera el código más "simple" que resuelve el problema funcional. La seguridad requiere saber qué puede ser falsificado y qué no. Sin la instrucción explícita, la IA no lo considera.

**La regla de no exponer secretos al cliente:**
La IA puede llegar a poner `SUPABASE_SECRET_KEY` en un Client Component por error. Esta regla lo hace explícito.

---

## Supabase

**El problema que resuelve:**
Hay dos clientes de Supabase con comportamientos radicalmente diferentes. La IA, sin instrucciones, puede:
- Usar `supabaseAdmin` (que bypasea RLS) donde debería usar el cliente servidor
- Usar el cliente browser en un Server Component (donde las cookies no funcionan)
- Bypassear RLS "para simplificar" cuando hay un problema de permisos

**La regla explícita de cada cliente:**
- `supabaseAdmin` → solo para lo que RLS bloquearía legítimamente (ej: crear el perfil durante el registro antes de que el usuario confirme su email)
- `createSupabaseServerClient()` → para todo lo demás en el servidor

**`Do not bypass Row Level Security as a shortcut`:**
Cuando la IA encuentra un error de RLS durante el desarrollo, la solución "más fácil" es usar el cliente admin. Esta regla le dice que RLS no es el problema — la política probablemente falta o está mal escrita.

**Migraciones:**
La regla de no modificar migraciones ya aplicadas y de no tocar estructuras no relacionadas con la tarea existe porque la IA puede "mejorar" el schema de paso cuando solo se le pidió agregar una columna.

---

## Responsive design

**El problema que resuelve:**
La IA diseña para desktop por defecto. Cuando genera un layout, pone `px-10`, `max-w-3xl mx-auto`, tablas anchas, sidebars fijos — todo asumiendo una pantalla grande. En mobile esto se rompe.

**La regla mobile-first:**
Le dice que el punto de partida es 320px de ancho, y las variaciones para pantallas más grandes se agregan con `sm:`, `md:`, `lg:`. Es el orden inverso al que la IA elegiría naturalmente.

**Los 44×44px de touch targets:**
Sin esta regla, la IA puede generar botones de 24px de alto que en mobile son imposibles de tocar con el dedo.

**`Test every new screen at 375px`:**
Le da un criterio concreto y verificable. Sin él, "mobile-first" queda como un concepto abstracto que la IA declara cumplir sin realmente verificar.

---

## Styling y Design System

**El problema que resuelve:**
Sin un sistema de diseño documentado, la IA inventa valores: `text-blue-600` en lugar del azul del sistema, `rounded-lg` donde debería ir `rounded-xl`, `shadow-md` en lugar del token correcto. El resultado es visual inconsistente.

**La regla de leer el Design System antes de tocar UI:**
La IA tiene acceso al archivo `DESIGN_SYSTEM_Portal_Municipal_Empleo.md` con los tokens exactos del proyecto. La instrucción le dice que lo lea antes de implementar cualquier cambio visual.

**`Do not scatter hardcoded design-system colors`:**
La IA puede poner `bg-teal-600` directamente en 20 componentes distintos. Si el color del sistema cambia, hay que encontrar y cambiar los 20. Los tokens CSS (`bg-primary`) resuelven esto.

**`Do not redesign unrelated screens`:**
Si se le pide cambiar un botón, la IA puede decidir "de paso" mejorar el layout de la página entera. Esta regla le dice que el alcance es exactamente lo que se pidió.

---

## UI Components

**El problema que resuelve:**
La IA tiende a crear componentes nuevos en lugar de buscar si ya existe uno. El resultado es duplicación: cuatro implementaciones distintas de un botón en el mismo proyecto.

**El proceso de verificación explícito:**
La instrucción le dice exactamente en qué orden buscar antes de crear algo nuevo:
1. ¿Existe en el proyecto?
2. ¿Lo tiene shadcn/ui?
3. ¿Se puede resolver con composición?

Solo si ninguna de las tres opciones aplica, crear algo nuevo.

**Por qué shadcn/ui con Base UI y no Radix:**
La IA conoce la versión clásica de shadcn (con Radix UI). Este proyecto usa `base-nova` con Base UI React. Sin la aclaración, la IA puede generar componentes con la API de Radix que no funcionan aquí.

---

## Scope Discipline (Alcance)

**El problema que resuelve:**
Este es uno de los módulos más importantes y uno de los comportamientos más frecuentes de la IA: hacer más de lo que se pidió.

**Lo que la IA hace sin esta regla:**
- Se le pide cambiar el color de un botón → cambia el botón, refactoriza el componente, mueve archivos, agrega validación que no se pidió
- Se le pide arreglar un bug → arregla el bug y "de paso" reorganiza toda la carpeta
- Se le pide agregar un campo → agrega el campo y actualiza 5 archivos "relacionados" que no estaban en el scope

**Por qué es un problema:**
Cada cambio extra es un riesgo. Puede romper algo que funcionaba. Puede generar más código que revisar. Puede tomar decisiones de arquitectura sin consultar.

**`Stop and report the ambiguity`:**
Si implementando algo la IA se da cuenta de que hay una decisión ambigua (¿qué pasa si el usuario no tiene rol? ¿se redirige o se muestra un error?), la instrucción le dice que pare y pregunte — no que elija silenciosamente.

---

## Dependencies

**El problema que resuelve:**
La IA instala paquetes por comodidad. Necesita formatear una fecha → instala `date-fns`. Necesita validar un formulario → instala `yup` aunque el proyecto ya use `zod`. Necesita hacer una query → instala `axios` aunque `fetch` funciona perfectamente.

**Por qué importa:**
Cada dependencia es deuda: hay que mantenerla, actualizarla cuando tiene vulnerabilidades, y justificar su existencia. Además puede crear conflictos con lo que ya está instalado.

**La regla concreta:**
Antes de instalar algo, verificar que lo que ya está en el proyecto no puede resolver el mismo problema.

---

## Code Comments

**El problema que resuelve:**
La IA comenta todo lo que escribe, por reflejo. El resultado es ruido:

```ts
// ❌ Lo que la IA genera naturalmente
// Get the user
const { data: { user } } = await supabase.auth.getUser()

// Check if user exists
if (!user) redirect('/auth/login')

// Get the profile
const { data: usuario } = await supabase.from('usuarios')...
```

Esos comentarios no agregan información. El código ya dice lo que hace.

**Cuándo sí comentar:**
La instrucción le da casos concretos donde un comentario tiene valor: cuando el "por qué" no es obvio. El proyecto tiene un ejemplo real en `proxy.ts`:

```ts
// Los Server Actions son POST con cabecera Next-Action. No redirigirlos: esperan
// una respuesta JSON y una redirección HTTP causa "unexpected response" en el cliente.
const isServerAction = request.method === 'POST' && request.headers.has('next-action')
```

Ese comentario explica un comportamiento no obvio que tomó tiempo descubrir.

**`Do not add comments stating code was generated by Claude`:**
Los comentarios son parte del repositorio y deben verse como los escribiría cualquier desarrollador del equipo.

---

## Git Rules

**El problema que resuelve:**
La IA puede hacer commits y push automáticamente cuando termina de implementar algo. Desde su perspectiva, "terminar el trabajo" incluye persistirlo. Eso es peligroso por varias razones:

- Puede commitear código que el desarrollador quería revisar primero
- Puede commitear con un mensaje que no sigue las convenciones del equipo
- Un `git push` no se puede deshacer fácilmente si había algo mal

**Las reglas explícitas:**
- "Implementar esto" NO autoriza un commit
- "Commitear esto" SÍ autoriza un commit
- Permiso para hacer commit NO implica permiso para push
- No crear, renombrar ni borrar ramas sin pedido explícito

**Los comandos destructivos prohibidos:**
`git reset --hard`, `git clean -fd`, `git checkout -- .` borran trabajo. La IA puede usarlos para "resolver" un problema (ej: un conflicto de merge) sin darse cuenta de que está descartando trabajo real del desarrollador.

---

## AI Attribution

**El problema que resuelve:**
La IA agrega atribución automáticamente cuando puede: "Generated with Claude Code" en commits, `Co-Authored-By: Claude` en mensajes de commit, comentarios en código.

**Por qué se prohíbe:**
El repositorio es del equipo de desarrollo. La forma en que se construyó es una decisión interna. Que el historial de Git refleje solo a los desarrolladores humanos es una práctica profesional estándar.

---

## Validation

**El problema que resuelve:**
La IA puede afirmar que algo "funciona" sin haberlo verificado realmente. "El código está correcto" y "el código compila y pasa el linter" son cosas distintas.

**La regla concreta:**
Antes de declarar que una implementación está completa, correr `npm run lint` y `npm run build`. Si alguno falla, no decir que terminó.

**`Do not claim a validation passed unless it was actually executed`:**
Esta regla existe porque la IA puede "razonar" que no hay errores sin ejecutar nada. La instrucción le dice que las validaciones son acciones, no deducciones.

**`Do not fix unrelated lint/build problems`:**
Si corriendo el build aparece un error en un archivo que no fue tocado, la regla dice que no lo arregle automáticamente — reportelo por separado. Así el desarrollador sabe que ese problema existía antes.

---

## Final Implementation Report

**El problema que resuelve:**
Cuando la IA termina, puede simplemente decir "listo". El desarrollador no sabe exactamente qué tocó, qué decidió, o qué quedó pendiente.

**Lo que se le pide reportar:**
1. Qué cambió
2. Qué archivos se modificaron
3. Decisiones importantes que tomó durante la implementación
4. Qué validaciones corrió
5. Resultados de esas validaciones
6. Qué quedó pendiente o bloqueado

**Por qué importa:**
El reporte final es la base para la revisión de código. Sin él, el desarrollador tiene que inferir todo esto leyendo el diff — que puede ser largo y complejo. Con el reporte, la revisión es mucho más eficiente.

---

## Resumen: el CLAUDE.md como política de equipo para la IA

El CLAUDE.md no es documentación del proyecto para humanos — es la política de trabajo que la IA tiene que seguir para ser un colaborador confiable. Cada sección existe porque:

| Módulo | Sin la regla, la IA... |
|---|---|
| Commands | Inventa comandos que no existen |
| Architecture | Crea archivos en el lugar equivocado |
| Next.js 16 | Usa APIs de versiones anteriores |
| Server/Client Components | Agrega `'use client'` innecesariamente |
| Route Handlers | Crea APIs REST donde debería usar Server Actions |
| Server Actions | Inventa nombres de archivos y crea el antipatrón |
| Security | Confía en valores del cliente para autorización |
| Supabase | Usa el cliente equivocado o bypasea RLS |
| Responsive | Diseña para desktop y rompe en mobile |
| Styling | Inventa valores y rompe la consistencia visual |
| UI Components | Duplica componentes que ya existen |
| Scope Discipline | Hace más de lo que se pidió y rompe cosas |
| Dependencies | Instala paquetes innecesarios |
| Comments | Comenta todo lo obvio, hace ruido |
| Git | Hace commits y push sin que se pida |
| AI Attribution | Agrega "Generated by Claude" en el historial |
| Validation | Declara que algo funciona sin haberlo ejecutado |
| Final Report | Termina sin explicar qué hizo |
