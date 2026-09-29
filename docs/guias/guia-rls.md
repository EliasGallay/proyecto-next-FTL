# Guía de Row Level Security (RLS)

## Qué es RLS

Row Level Security es un mecanismo de PostgreSQL (y por ende de Supabase) que controla qué filas puede ver o modificar cada usuario a nivel de base de datos.

Sin RLS, cualquier persona con la anon key puede leer y escribir cualquier tabla. Con RLS activado, cada operación pasa por políticas que definen exactamente qué está permitido.

```
Sin RLS:   request → Supabase → devuelve todo
Con RLS:   request → Supabase → evalúa políticas → devuelve solo lo permitido
```

La clave: RLS funciona aunque alguien tenga la anon key. Es la última línea de defensa de los datos.

---

## Cómo activar RLS en una tabla

Desde el SQL Editor del dashboard:

```sql
ALTER TABLE nombre_tabla ENABLE ROW LEVEL SECURITY;
```

Una vez activado, **nadie puede leer ni escribir esa tabla** hasta que exista al menos una política que lo permita. Esto incluye al usuario autenticado.

---

## Estructura de una política

```sql
CREATE POLICY "descripción legible"
ON nombre_tabla
FOR SELECT | INSERT | UPDATE | DELETE | ALL
TO PUBLIC | authenticated | anon
USING (condición)           -- para SELECT, UPDATE, DELETE
WITH CHECK (condición);     -- para INSERT, UPDATE
```

- **`USING`** — filtra qué filas pueden leerse o afectarse
- **`WITH CHECK`** — valida que los datos que se van a escribir cumplan la condición
- **`auth.uid()`** — devuelve el UUID del usuario autenticado; es `null` si no hay sesión

---

## Políticas del proyecto

### Tabla `usuarios`

```sql
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;

-- Cada usuario puede ver su propia fila
CREATE POLICY "usuarios ven su propio registro"
ON usuarios FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- Cada usuario puede actualizar su propia fila
-- (excepto el rol — eso solo lo hace municipalidad via supabaseAdmin)
CREATE POLICY "usuarios actualizan su propio registro"
ON usuarios FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- municipalidad puede ver todos los usuarios
CREATE POLICY "municipalidad ve todos los usuarios"
ON usuarios FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM usuarios
    WHERE id = auth.uid() AND rol = 'municipalidad'
  )
);
```

### Tabla `ofertas`

```sql
ALTER TABLE ofertas ENABLE ROW LEVEL SECURITY;

-- Todos (incluso sin sesión) pueden ver ofertas activas
CREATE POLICY "ofertas activas son públicas"
ON ofertas FOR SELECT
TO PUBLIC
USING (estado = 'activa');

-- Usuarios autenticados con rol empresa o municipalidad
-- pueden ver todas sus propias ofertas (incluso borradores)
CREATE POLICY "empresas ven sus propias ofertas"
ON ofertas FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM usuarios
    WHERE id = auth.uid() AND rol IN ('empresa', 'municipalidad')
  )
);

-- Solo empresa y municipalidad pueden crear ofertas
CREATE POLICY "empresas pueden crear ofertas"
ON ofertas FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM usuarios
    WHERE id = auth.uid() AND rol IN ('empresa', 'municipalidad')
  )
);

-- Solo empresa y municipalidad pueden editar ofertas
CREATE POLICY "empresas pueden editar ofertas"
ON ofertas FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM usuarios
    WHERE id = auth.uid() AND rol IN ('empresa', 'municipalidad')
  )
);

-- Solo municipalidad puede eliminar ofertas
CREATE POLICY "municipalidad puede eliminar ofertas"
ON ofertas FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM usuarios
    WHERE id = auth.uid() AND rol = 'municipalidad'
  )
);
```

### Tabla `postulantes`

```sql
ALTER TABLE postulantes ENABLE ROW LEVEL SECURITY;

-- Cada postulante ve su propio perfil
CREATE POLICY "postulantes ven su perfil"
ON postulantes FOR SELECT
TO authenticated
USING (
  usuario_id = auth.uid()
);

-- municipalidad y empresa ven todos los postulantes
CREATE POLICY "municipalidad y empresa ven postulantes"
ON postulantes FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM usuarios
    WHERE id = auth.uid() AND rol IN ('municipalidad', 'empresa')
  )
);

-- Cada postulante puede crear y actualizar su propio perfil
CREATE POLICY "postulantes crean su perfil"
ON postulantes FOR INSERT
TO authenticated
WITH CHECK (usuario_id = auth.uid());

CREATE POLICY "postulantes actualizan su perfil"
ON postulantes FOR UPDATE
TO authenticated
USING (usuario_id = auth.uid())
WITH CHECK (usuario_id = auth.uid());
```

### Tabla `empresas`

```sql
ALTER TABLE empresas ENABLE ROW LEVEL SECURITY;

-- Cada empresa ve su propio perfil
CREATE POLICY "empresas ven su perfil"
ON empresas FOR SELECT
TO authenticated
USING (usuario_id = auth.uid());

-- municipalidad ve todas las empresas
CREATE POLICY "municipalidad ve todas las empresas"
ON empresas FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM usuarios
    WHERE id = auth.uid() AND rol = 'municipalidad'
  )
);

-- Cada empresa puede crear y actualizar su propio perfil
CREATE POLICY "empresas crean su perfil"
ON empresas FOR INSERT
TO authenticated
WITH CHECK (usuario_id = auth.uid());

CREATE POLICY "empresas actualizan su perfil"
ON empresas FOR UPDATE
TO authenticated
USING (usuario_id = auth.uid())
WITH CHECK (usuario_id = auth.uid());
```

### Tabla `postulaciones`

```sql
ALTER TABLE postulaciones ENABLE ROW LEVEL SECURITY;

-- Postulante ve sus propias postulaciones
CREATE POLICY "postulantes ven sus postulaciones"
ON postulaciones FOR SELECT
TO authenticated
USING (
  postulante_id IN (
    SELECT id FROM postulantes WHERE usuario_id = auth.uid()
  )
);

-- Municipalidad y empresa ven todas las postulaciones
CREATE POLICY "municipalidad y empresa ven postulaciones"
ON postulaciones FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM usuarios
    WHERE id = auth.uid() AND rol IN ('municipalidad', 'empresa')
  )
);

-- Solo postulantes pueden crear postulaciones
CREATE POLICY "postulantes pueden postularse"
ON postulaciones FOR INSERT
TO authenticated
WITH CHECK (
  postulante_id IN (
    SELECT id FROM postulantes WHERE usuario_id = auth.uid()
  )
  AND
  EXISTS (
    SELECT 1 FROM usuarios
    WHERE id = auth.uid() AND rol = 'postulante'
  )
);

-- Solo municipalidad puede actualizar el estado de una postulación
CREATE POLICY "municipalidad actualiza postulaciones"
ON postulaciones FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM usuarios
    WHERE id = auth.uid() AND rol = 'municipalidad'
  )
);
```

### Tabla `derivaciones`

```sql
ALTER TABLE derivaciones ENABLE ROW LEVEL SECURITY;

-- Municipalidad puede ver y crear derivaciones
CREATE POLICY "municipalidad gestiona derivaciones"
ON derivaciones FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM usuarios
    WHERE id = auth.uid() AND rol = 'municipalidad'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM usuarios
    WHERE id = auth.uid() AND rol = 'municipalidad'
  )
);

-- Empresa ve las derivaciones que le corresponden
CREATE POLICY "empresas ven sus derivaciones"
ON derivaciones FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM postulaciones p
    JOIN ofertas o ON o.id = p.oferta_id
    JOIN empresas e ON e.usuario_id = auth.uid()
    WHERE p.id = derivaciones.postulacion_id
  )
);

-- Empresa puede actualizar el resultado de su derivación
CREATE POLICY "empresas actualizan sus derivaciones"
ON derivaciones FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM postulaciones p
    JOIN ofertas o ON o.id = p.oferta_id
    JOIN empresas e ON e.usuario_id = auth.uid()
    WHERE p.id = derivaciones.postulacion_id
  )
);
```

### Tabla `categorias`

```sql
ALTER TABLE categorias ENABLE ROW LEVEL SECURITY;

-- Todos pueden leer categorías
CREATE POLICY "categorias son públicas"
ON categorias FOR SELECT
TO PUBLIC
USING (true);

-- Solo municipalidad puede crear o modificar categorías
CREATE POLICY "municipalidad gestiona categorias"
ON categorias FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM usuarios
    WHERE id = auth.uid() AND rol = 'municipalidad'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM usuarios
    WHERE id = auth.uid() AND rol = 'municipalidad'
  )
);
```

### Tablas de relación (`postulante_categorias`, `oferta_categorias`)

```sql
ALTER TABLE postulante_categorias ENABLE ROW LEVEL SECURITY;

CREATE POLICY "postulantes gestionan sus categorias"
ON postulante_categorias FOR ALL
TO authenticated
USING (
  postulante_id IN (
    SELECT id FROM postulantes WHERE usuario_id = auth.uid()
  )
)
WITH CHECK (
  postulante_id IN (
    SELECT id FROM postulantes WHERE usuario_id = auth.uid()
  )
);

ALTER TABLE oferta_categorias ENABLE ROW LEVEL SECURITY;

CREATE POLICY "empresas gestionan categorias de sus ofertas"
ON oferta_categorias FOR ALL
TO authenticated
USING (
  oferta_id IN (
    SELECT o.id FROM ofertas o
    JOIN empresas e ON e.usuario_id = auth.uid()
  )
)
WITH CHECK (
  oferta_id IN (
    SELECT o.id FROM ofertas o
    JOIN empresas e ON e.usuario_id = auth.uid()
  )
);
```

---

## Cómo aplicar estas políticas

Copiar cada bloque SQL en el **SQL Editor** del dashboard de Supabase y ejecutarlo. Podés ejecutar todos juntos o tabla por tabla.

Para ver las políticas activas: **Authentication → Policies** en el dashboard.

---

## Debuggear RLS

### La query devuelve vacío sin error

RLS filtró todas las filas. El usuario autenticado no cumple ninguna política de SELECT. Verificar:
1. Que el usuario tenga sesión activa
2. Que exista una política de SELECT que aplique a ese usuario
3. Que la condición de la política sea correcta

### Probar una política desde el SQL Editor

```sql
-- Simular qué ve un usuario específico
SET LOCAL role = authenticated;
SET LOCAL request.jwt.claims = '{"sub": "<uuid-del-usuario>"}';

SELECT * FROM ofertas;
```

### Deshabilitar RLS temporalmente para verificar que el problema es la política

```sql
ALTER TABLE ofertas DISABLE ROW LEVEL SECURITY;
-- probar la query
ALTER TABLE ofertas ENABLE ROW LEVEL SECURITY;
```

> Nunca dejar RLS deshabilitado en producción.
