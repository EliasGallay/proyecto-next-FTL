# 003 — Server Components y Server Actions en lugar de Route Handlers para uso interno

## Contexto

En Next.js existe la tentación de crear endpoints en `app/api/` para todo: leer datos, crear registros, actualizar estado. Esto reproduce el patrón clásico de una API REST separada, pero en una app Next.js que consume sus propios datos genera una vuelta innecesaria: el servidor llama a sí mismo por HTTP.

## Decisión

- **Leer datos** → Server Component (llama directo a Supabase, sin fetch).
- **Mutaciones desde el cliente** → Server Action en `actions.ts`.
- **`app/api/` solo para consumidores externos** (webhooks, integraciones, otras apps).

## Cuándo usar cada uno

| Escenario | Solución |
|---|---|
| Mostrar lista de ofertas en una página | Server Component |
| Formulario que crea una oferta | Server Action |
| Webhook de Supabase o pago externo | Route Handler (`app/api/`) |
| Endpoint consumido por una app mobile | Route Handler (`app/api/`) |

## Por qué

Un Server Component corre en el servidor y puede llamar a Supabase directamente — no hace falta una capa HTTP intermedia. Un Server Action también corre en el servidor y se invoca desde el cliente sin exponer una URL pública.

Crear un Route Handler solo para que un Server Action lo llame desde la misma app añade latencia, una URL pública innecesaria y código extra sin ningún beneficio.

## Patrón a evitar

```
UI → Server Action → fetch("/api/ofertas") → Route Handler → Supabase
```

## Patrón correcto

```
UI → Server Action → Supabase
página → Server Component → Supabase
cliente externo → Route Handler → Supabase
```

## Referencia

`CLAUDE.md` — sección "Server Actions vs Route Handlers".
