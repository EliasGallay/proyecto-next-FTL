# 002 — Sin `email` ni `telefono` duplicados en `usuarios` / `postulantes`

## Contexto

La tabla `usuarios` fue creada con una columna `email` para facilitar búsquedas. Sin embargo, Supabase ya guarda el email en `auth.users.email` y lo expone a través de `getUser()`. Mantener las dos columnas genera riesgo de desincronización si el usuario cambia su email desde Supabase Auth.

Además, `migration_002` agregó `telefono` a `usuarios`, pero la columna `telefono` también existía en `postulantes` desde el esquema inicial (`migration_001`). El insert de registro siempre escribió en `usuarios.telefono`, dejando `postulantes.telefono` sin uso.

## Decisión

- Eliminar `usuarios.email` — el email se lee siempre de `auth.users` vía `getUser()`.
- Eliminar `postulantes.telefono` — el teléfono vive en `usuarios`, que cubre todos los roles.

Cambio aplicado en `migration_005_limpiar_duplicados.sql`.

## Por qué

Una columna duplicada entre dos tablas siempre puede quedar desincronizada. La fuente de verdad del email es `auth.users`; no tiene sentido mantener una copia. El teléfono nunca debió estar en `postulantes` una vez que `migration_002` lo agregó a `usuarios`.

## Impacto en el código

- `src/app/auth/actions.ts` — eliminado `email: data.email` de los inserts de `registrarPostulante` y `registrarEmpresa`.
- Cualquier lugar que necesite mostrar el email del usuario lo obtiene de `user.email` (retornado por `supabase.auth.getUser()`), no de la tabla `usuarios`.
