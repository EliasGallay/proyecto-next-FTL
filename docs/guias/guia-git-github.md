# Guía de Git y GitHub — Flujo de trabajo del proyecto

## Las tres ramas del proyecto

```
main
  └── develop
        └── feature/nombre-de-la-feature
```

| Rama | Para qué sirve |
|---|---|
| `main` | Código en producción. Nunca se toca directamente. |
| `develop` | Integración. Acá se juntan todas las features terminadas. |
| `feature/...` | Una rama por cada feature o tarea. Se crea desde `develop` y se mergea a `develop`. |

**Regla:** nunca trabajar directamente en `main` ni en `develop`. Todo el trabajo va en una rama `feature/`.

---

## Flujo completo paso a paso

### 1. Antes de empezar — actualizarse

Antes de crear una nueva rama, asegurarse de tener el último estado de `develop`:

```bash
git checkout develop
git pull origin develop
```

### 2. Crear una rama para la feature

```bash
git checkout -b feature/nombre-descriptivo
```

El nombre debe describir qué hace la feature, en kebab-case:

```bash
git checkout -b feature/login-registro
git checkout -b feature/listado-ofertas
git checkout -b feature/postulacion-oferta
git checkout -b feature/perfil-postulante
```

### 3. Trabajar y hacer commits

A medida que avanzás, commitear en pasos lógicos — no esperar a tener todo listo para hacer un solo commit gigante.

```bash
git add src/app/auth/login/page.tsx src/app/auth/actions.ts
git commit -m "feat: agrega formulario de login"

git add src/app/auth/registro/page.tsx
git commit -m "feat: agrega formulario de registro con selector de rol"
```

### 4. Subir la rama al repositorio remoto

La primera vez que subís la rama:

```bash
git push -u origin feature/login-registro
```

Las veces siguientes alcanza con:

```bash
git push
```

### 5. Abrir un Pull Request en GitHub

1. Ir al repositorio en GitHub
2. GitHub muestra un banner "Compare & pull request" — hacer click
3. Verificar que la base sea `develop` (no `main`)
4. Completar el título y la descripción
5. Asignar un reviewer si corresponde
6. Click en **Create pull request**

### 6. Review y merge

El reviewer revisa el código y aprueba o pide cambios. Una vez aprobado, se hace el merge a `develop`.

### 7. Después del merge — limpiar

```bash
git checkout develop
git pull origin develop
git branch -d feature/login-registro
```

---

## Cómo escribir buenos commits

El mensaje de un commit debe explicar **qué** cambió, en tiempo presente:

```bash
# ✅ Buenos mensajes
git commit -m "feat: agrega página de detalle de oferta"
git commit -m "fix: corrige validación del formulario de registro"
git commit -m "chore: agrega variables de entorno al .env.example"

# ❌ Mensajes que no sirven
git commit -m "cambios"
git commit -m "arreglé cosas"
git commit -m "wip"
git commit -m "asdfgh"
```

### Prefijos convencionales

| Prefijo | Cuándo usarlo |
|---|---|
| `feat:` | Nueva funcionalidad |
| `fix:` | Corrección de un bug |
| `docs:` | Cambios en documentación |
| `chore:` | Configuración, dependencias, archivos que no son código de app |
| `refactor:` | Cambio de código que no agrega ni corrige nada |

---

## Qué va y qué no va en Git

### Nunca commitear

- `.env.local` — tiene las claves de Supabase. Ya está en `.gitignore`, pero verificar que no aparezca en `git status`
- `node_modules/` — se regenera con `npm install`
- Archivos de sistema (`.DS_Store` en Mac, `Thumbs.db` en Windows)

### Siempre commitear

- `src/` — todo el código de la app
- `supabase/migrations/` — los archivos SQL son parte del proyecto
- `.env.example` — la plantilla sin valores reales
- `docs/` — las guías

---

## Situaciones frecuentes

### Me olvidé de crear una rama y trabajé directo en `develop`

```bash
# 1. Crear la rama con los cambios actuales
git checkout -b feature/mi-feature

# 2. Volver develop al estado del remoto
git checkout develop
git reset --hard origin/develop

# 3. Seguir trabajando en la nueva rama
git checkout feature/mi-feature
```

### Hay conflictos al hacer el PR

Pasa cuando otro desarrollador modificó los mismos archivos. Para resolverlo:

```bash
# Desde la rama feature, traer los últimos cambios de develop
git checkout feature/mi-feature
git merge develop
```

Git va a marcar los conflictos en los archivos afectados:

```
<<<<<<< HEAD
tu versión del código
=======
versión de develop
>>>>>>> develop
```

Editar el archivo dejando la versión correcta (puede ser una, la otra, o una combinación), guardar, y:

```bash
git add archivo-con-conflicto.tsx
git commit -m "fix: resuelve conflicto con develop"
git push
```

### Quiero deshacer el último commit (que no está pusheado)

```bash
git reset --soft HEAD~1
```

Esto deshace el commit pero deja los archivos modificados listos para volver a commitear.

### Ver el estado actual

```bash
git status          # archivos modificados, staged, untracked
git log --oneline   # historial de commits
git branch          # en qué rama estoy
```

---

## Resumen del flujo en un vistazo

```
1. git checkout develop
2. git pull origin develop
3. git checkout -b feature/nombre
4. ... trabajar, hacer commits ...
5. git push -u origin feature/nombre
6. Abrir PR en GitHub → base: develop
7. Review → merge
8. git checkout develop && git pull
```