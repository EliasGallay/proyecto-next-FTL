# 001 — `proxy.ts` en lugar de `middleware.ts`

## Contexto

En Next.js 13–15, la protección de rutas se implementaba en un archivo llamado `middleware.ts` exportando una función `middleware`. En Next.js 16, este archivo fue **deprecado y renombrado**.

## Decisión

Usamos `src/proxy.ts` exportando una función llamada `proxy`.

```ts
// ✅ Correcto en Next.js 16
export async function proxy(request: NextRequest) { ... }
```

```ts
// ❌ Deprecado — Next.js mostrará advertencia
export async function middleware(request: NextRequest) { ... }
```

## Por qué

Next.js 16 renombró el archivo para distinguirlo del "middleware" de Express.js y dejar en claro que actúa como un proxy de red que intercepta requests antes de que lleguen a la app. La funcionalidad es idéntica; solo cambian el nombre del archivo y el de la función exportada.

## Dónde vive

`src/proxy.ts` — al mismo nivel que `src/app/`.

## Qué hace hoy en este proyecto

Intercepta cada request antes de que llegue a una página. Si no hay sesión activa, redirige a `/auth/login`. Si el usuario ya tiene sesión e intenta entrar a `/auth/login` o `/auth/registro`, lo redirige a `/`. Las rutas bajo `/auth/verificar-email` y `/auth/recuperar-contrasena` quedan accesibles sin sesión confirmada.

## Referencia

`node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md`
