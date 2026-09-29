# Prompt 04 — Módulo de autenticación

```
Eres un desarrollador senior de Next.js 16 trabajando en el "Portal Municipal de Empleo".

<context>
Tenemos Next.js 16 con App Router, TypeScript, los clientes de Supabase configurados y el esquema de base de datos aplicado. Las tablas relevantes son:

- `usuarios` (id, nombre, apellido, telefono, rol)
- `postulantes` (usuario_id, dni, cv_url)
- `empresas` (usuario_id, razon_social, cuit, rubro)

Roles posibles: `postulante`, `empresa`, `municipalidad`. El rol `municipalidad` se asigna manualmente — nunca desde el formulario de registro.
</context>

<instructions>
Implementar el módulo de autenticación completo:
1. Login con email y contraseña — redirige a `/inicio` si es exitoso.
2. Registro de postulante — nombre, apellido, DNI, teléfono, email, contraseña.
3. Registro de empresa — razón social, CUIT, rubro, nombre, apellido, teléfono, email, contraseña.
4. Logout — cierra sesión y redirige a `/auth/login`.
5. Página post-registro — informa que se envió un email de confirmación.

Rutas: `/auth/login`, `/auth/registro`, `/auth/verificar-email`.
La lógica va en `src/app/auth/actions.ts` como Server Actions.
</instructions>

<rules>
- El registro son tres pasos con rollback manual. Si cualquier paso falla, se deshace lo anterior llamando a `supabaseAdmin.auth.admin.deleteUser()`.
- Usar `supabaseAdmin` para los inserts de perfil post-registro porque el usuario recién creado no tiene sesión activa aún (está esperando confirmar el email), entonces RLS bloquearía el insert.
- El patrón de retorno de todos los Server Actions es `{ ok: true } | { ok: false; error: string }`.
- Nunca exponer errores técnicos de la base de datos al usuario — traducirlos a mensajes comprensibles.
- El código Postgres `23505` significa violación de unique constraint (valor duplicado).
</rules>

<examples>
<example>
// Flujo de registro — tres pasos con rollback
const { data: authData, error } = await supabase.auth.signUp({ email, password })
if (error || !authData.user) return { ok: false, error: 'No se pudo crear la cuenta' }

const userId = authData.user.id

const { error: errorUsuario } = await supabaseAdmin
  .from('usuarios')
  .insert({ id: userId, nombre, apellido, telefono, rol: 'postulante' })

if (errorUsuario) {
  await supabaseAdmin.auth.admin.deleteUser(userId)  // rollback
  if (errorUsuario.code === '23505') return { ok: false, error: 'Ya existe una cuenta con ese email' }
  return { ok: false, error: 'No se pudo crear el perfil' }
}

const { error: errorPostulante } = await supabaseAdmin
  .from('postulantes')
  .insert({ usuario_id: userId, dni })

if (errorPostulante) {
  await supabaseAdmin.auth.admin.deleteUser(userId)  // rollback
  if (errorPostulante.code === '23505') return { ok: false, error: 'Ya existe una cuenta con ese DNI' }
  return { ok: false, error: 'No se pudo crear el perfil' }
}

return { ok: true }
</example>
</examples>

<output>
- `src/app/auth/actions.ts` — Server Actions: `login`, `registrarPostulante`, `registrarEmpresa`, `logout`
- Páginas bajo `src/app/auth/`: login, registro (con tabs postulante/empresa), verificar-email
- Componentes de formulario bajo `src/components/auth/` con validación (zod): DNI 7-8 dígitos, CUIT formato XX-XXXXXXXX-X, contraseña mínimo 8 caracteres, confirmar email y contraseña
</output>
```
