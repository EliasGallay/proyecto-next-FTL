# Prompt 04 — Autenticación

```
Tenemos el esquema de base de datos listo en Supabase. Ahora necesito que los usuarios puedan registrarse y hacer login.

El registro es distinto según el rol:
- El postulante ingresa nombre, apellido, DNI, teléfono, email y contraseña.
- La empresa ingresa razón social, CUIT, rubro, y los datos del responsable (nombre, apellido, teléfono, email, contraseña).
- El rol municipalidad no se puede registrar desde la app — se asigna manualmente.

Después del login, el usuario llega a un dashboard según su rol. Si no está logueado no puede acceder al dashboard.

Usamos Next.js con App Router y Supabase para la autenticación. ¿Cómo encarás esto? ¿Qué archivos necesito crear y qué tengo que tener en cuenta antes de implementarlo?
```
