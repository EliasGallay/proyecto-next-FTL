# Clase 6 — Apunte: storage, servidores y Vercel

Apunte de la clase 6. Acá vas a encontrar **qué es cada cosa y por qué funciona así**: dónde se guardan los archivos de una aplicación web, qué es realmente un servidor y qué hace Vercel cuando publicamos el portal. Usalo para repasar lo que vimos en clase y como referencia cuando trabajes en el proyecto.

---

## 1. Storage: dónde viven los archivos

**Storage** significa "almacenamiento": un lugar para guardar archivos (PDFs, imágenes, videos, documentos) de forma permanente y segura.

### ¿Por qué no guardar los archivos en la base de datos?

Técnicamente se puede meter un PDF dentro de una tabla, pero es mala idea:

- la base de datos se vuelve enorme, lenta y cara;
- los backups tardan muchísimo;
- la base está pensada para **buscar y relacionar datos**, no para servir archivos pesados.

### ¿Y por qué no en el servidor?

- En Vercel **no se puede**: no hay disco permanente (lo vemos en detalle en la sección de Vercel).
- En un servidor propio se puede, pero si la máquina se rompe se pierden, y si tenés dos servidores, cada uno tiene archivos distintos.

### La solución: cada cosa en su lugar

```
Base de datos  → guarda el DATO:  "el CV de Juan está en curricula/abc-123/cv.pdf"
Storage        → guarda el ARCHIVO: el PDF en sí
```

> **Analogía:** la base de datos es el fichero de la biblioteca, donde cada ficha dice "este libro está en el estante 4, fila B". El storage es el depósito donde están los libros. No metés el libro adentro de la ficha: anotás dónde está.

---

## 2. Tipos de storage

Existen tres grandes tipos. En desarrollo web casi siempre se usa el tercero, pero conviene conocerlos.

### Block storage (almacenamiento en bloques)

Es **un disco**, como el SSD de tu computadora. El sistema operativo lo ve como un disco vacío y lo organiza como quiere.

- **Cómo funciona:** guarda los datos en pedacitos de tamaño fijo (bloques). Es muy rápido.
- **Se usa para:** el disco de un servidor o el lugar donde una base de datos guarda su información.
- **Ejemplos:** el disco de tu PC, AWS EBS, los discos de una VPS.
- **Limitación:** está conectado a una sola máquina por vez.

### File storage (almacenamiento de archivos)

Son **carpetas compartidas**, como una unidad de red en una oficina. Varias computadoras ven la misma estructura de carpetas y archivos.

- **Cómo funciona:** organiza todo en carpetas y subcarpetas, igual que el explorador de Windows.
- **Se usa para:** compartir archivos dentro de una organización.
- **Ejemplos:** la unidad `S:` de la oficina, un NAS, AWS EFS.
- **Limitación:** se complica cuando hay millones de archivos o usuarios repartidos por el mundo.

### Object storage (almacenamiento de objetos), el que usamos nosotros

Es como un **depósito gigante donde cada archivo tiene una etiqueta única** y se pide por esa etiqueta.

- **Cómo funciona:** cada archivo (objeto) se guarda con:
  - **el archivo en sí** (el contenido);
  - **una clave o ruta única**, por ejemplo `abc-123/1696000000000.pdf`;
  - **metadatos**: tipo de archivo, tamaño, fecha de subida.
- Los objetos se agrupan en **buckets** (baldes o contenedores).
- Se accede **por HTTP, con una URL**, no como un disco conectado.
- Escala prácticamente sin límite: millones de archivos sin problema.
- **Ejemplos:** Amazon S3 (el más conocido, y el estándar que muchos copian), Google Cloud Storage, Cloudflare R2, **Supabase Storage**.

> **Detalle importante:** en object storage las "carpetas" son una ilusión. `abc-123/cv.pdf` es en realidad un nombre largo con una barra en el medio. El panel lo muestra como carpeta para que sea más cómodo, y por eso podemos usar el primer "segmento" de la ruta (el ID del usuario) para las reglas de RLS.

### Comparación rápida

| | Block | File | Object |
|---|---|---|---|
| Se parece a... | Un disco rígido | Una carpeta compartida | Un depósito con etiquetas |
| Cómo se accede | Como disco del sistema | Navegando carpetas | Por URL / API |
| Escala | Baja (una máquina) | Media | Muy alta |
| Ideal para | Bases de datos, sistemas operativos | Archivos de oficina | Archivos de apps web (fotos, CVs, videos) |
| En nuestro proyecto | Lo usa Supabase por dentro, para Postgres | No lo usamos | **Supabase Storage** |

---

## 3. Cómo funciona Supabase Storage en el portal

Supabase Storage es **object storage**, con la ventaja de que está integrado con la autenticación y con RLS de nuestra base de datos.

### Buckets públicos vs. privados

| | Público | Privado |
|---|---|---|
| ¿Quién puede ver un archivo? | Cualquiera que tenga la URL | Solo quien tenga permiso |
| URL | Fija, nunca vence | **Firmada** y con vencimiento |
| Ejemplo | Logo de una empresa | CV de un postulante |

### ¿Qué es una URL firmada?

Es una **URL temporal que incluye un "permiso" adentro**. El servidor revisa que el usuario tenga derecho a ver el archivo, genera la URL con una firma y un vencimiento (por ejemplo, 60 segundos) y se la da al navegador.

> **Analogía:** es como una entrada de cine. Te la dan en la boletería después de verificar que pagaste, sirve para una función y después no vale más. Si alguien la copia al otro día, no entra.

¿Por qué no usar una URL fija para los CVs? Porque un CV tiene datos personales (DNI, teléfono, dirección). Si la URL fuera pública y alguien la reenviara, cualquiera podría verlo para siempre.

### El recorrido completo de un CV

```
1. El postulante elige su PDF en el navegador
        ↓
2. El archivo viaja a nuestro servidor (Server Action en Vercel)
        ↓
3. El servidor verifica: ¿hay sesión? ¿es PDF o DOCX? ¿pesa menos del límite?
        ↓
4. Lo sube a Supabase Storage → bucket privado, carpeta del usuario
        ↓
5. Guarda en la base de datos la RUTA (no el archivo, no la URL)
        ↓
6. Cuando alguien quiere verlo: el servidor revisa permisos,
   genera una URL firmada que vence pronto y se la pasa al navegador
```

Para el detalle técnico (políticas, código, migraciones) están las guías de [buckets](../guias/guia-buckets-supabase.md), [storage](../guias/guia-storage-supabase.md) y [RLS](../guias/guia-rls.md).

---

## 4. ¿Qué es un servidor?

Un servidor es **una computadora que está prendida todo el tiempo, conectada a Internet, esperando que alguien le pida algo**.

No tiene nada de mágico. Es una computadora como la tuya, con procesador, memoria RAM y disco, solo que:

- no tiene pantalla ni teclado (se maneja a distancia);
- no se apaga nunca;
- tiene una dirección fija en Internet para que la encuentren;
- corre un programa que "escucha" pedidos y los responde.

> **Analogía:** un servidor es como el mostrador de una panadería. Está abierto, alguien entra y pide algo ("dame la página de ofertas"), y el panadero se lo entrega. Si la panadería cierra, nadie puede comprar.

Cuando abrís `localhost:3000` con `npm run dev`, **tu propia computadora está haciendo de servidor**. El problema es que solo vos la podés ver, y cuando cerrás la notebook, el "servidor" desaparece.

### ¿Qué pasa cuando alguien entra a una página?

```
Usuario escribe portal-empleo.com en el navegador
        ↓
El DNS traduce ese nombre a una dirección IP
(como buscar un nombre en la agenda y obtener el número de teléfono)
        ↓
El navegador le manda un pedido (request) a esa IP
        ↓
El servidor recibe el pedido, ejecuta código, consulta la base de datos si hace falta
        ↓
Devuelve una respuesta (response): HTML, datos, una imagen...
        ↓
El navegador la muestra
```

---

## 5. Servidor propio: la forma "tradicional"

Tener un **servidor propio** significa que **vos te encargás de todo**: la máquina, el sistema operativo, la seguridad y la app.

Hay distintos niveles de "propio":

| Opción | Qué es | Ejemplo |
|---|---|---|
| **Servidor físico (on-premise)** | Una computadora real en tu oficina o en la municipalidad, en una sala con aire acondicionado | El servidor del área de sistemas del municipio |
| **Servidor dedicado alquilado** | Una máquina física completa que alquilás en un datacenter | Proveedores de hosting dedicado |
| **VPS / máquina virtual** | Un "pedazo" de una máquina grande, que se comporta como una computadora entera para vos | AWS EC2, DigitalOcean, Google Compute Engine |

### Todo lo que tenés que hacer con un servidor propio

Para publicar el portal en un servidor propio habría que:

1. Instalar el sistema operativo (normalmente Linux) y mantenerlo actualizado.
2. Instalar Node.js en la versión correcta.
3. Copiar el código, instalar dependencias y correr `npm run build`.
4. Dejar la app corriendo y lograr que se reinicie sola si se cae.
5. Configurar un servidor web adelante (por ejemplo Nginx) que reciba el tráfico.
6. Configurar el dominio y el certificado HTTPS (el candadito).
7. Abrir solo los puertos necesarios y cerrar todo lo demás (firewall).
8. Hacer backups.
9. Repetir los pasos 3 y 4 **a mano** cada vez que cambia el código.
10. Ver qué pasa cuando llegan muchos usuarios de golpe y la máquina no da abasto.

> **Importante:** nada de esto es "programar la app". Es trabajo de infraestructura, y es un rol entero dentro de un equipo (DevOps, SRE, infraestructura).

### ¿Cuándo tiene sentido un servidor propio?

- Cuando hay **requisitos legales** de que los datos queden en un lugar específico (pasa en el sector público).
- Cuando necesitás **control total** sobre la configuración.
- Cuando el sistema es muy grande y a cierto volumen sale más barato.
- Cuando la app no encaja en el modelo de plataformas como Vercel. Por ejemplo, procesos que corren horas, o software que necesita algo instalado en el sistema operativo.

---

## 6. Vercel: alguien hace la infraestructura por vos

Vercel es una **plataforma de deployment**: le das tu código y ella se encarga de todo lo de la lista anterior.

> **Analogía:** tener un servidor propio es como tener tu propio auto: lo comprás, le hacés el service, le cargás nafta, lo arreglás cuando se rompe. Vercel es como tomar un Uber: decís adónde querés ir y no te preocupás por el motor. Pagás por usarlo, y a cambio no elegís cada detalle.

A este tipo de servicio se le dice **PaaS** (*Platform as a Service*, plataforma como servicio).

### Qué hace Vercel por nosotros

| Tarea | Servidor propio | Vercel |
|---|---|---|
| Conseguir una máquina | Vos | Automático |
| Instalar Node.js | Vos | Automático |
| Hacer el build | A mano o con scripts | En cada push a GitHub |
| HTTPS | Configurarlo y renovarlo | Automático |
| Escalar si llegan muchos usuarios | Comprar más máquinas | Automático |
| Volver a una versión anterior | Complicado | Un click (rollback) |
| Ver una rama antes de publicarla | Otro servidor más | Preview deployment automático |

### Cómo funciona por dentro (versión simple)

Cuando Vercel hace el build de una app Next.js, la **separa en partes** y pone cada una donde mejor funciona:

```
Tu proyecto Next.js
        │
        ├── Archivos estáticos (imágenes, CSS, JS, páginas que no cambian)
        │         ↓
        │   CDN: copias en servidores de todo el mundo
        │
        └── Código que tiene que ejecutarse (Server Components, Server Actions,
            Route Handlers como /api/saludo)
                  ↓
            Funciones "serverless" que se prenden cuando alguien las necesita
```

**CDN (Content Delivery Network):** una red de servidores repartidos por el mundo, cada uno con una copia de tus archivos estáticos. Si alguien entra desde Córdoba, le responde el servidor más cercano y no uno en Estados Unidos. Por eso carga más rápido.

**Serverless ("sin servidor"):** el nombre engaña, porque **sí hay servidores**, solo que no los ves ni los manejás. Tu código no está corriendo todo el tiempo esperando: se ejecuta cuando llega un pedido y después se apaga. Si llegan mil pedidos a la vez, la plataforma levanta las copias que hagan falta.

> **Analogía:** un servidor tradicional es un empleado de tiempo completo que cobra aunque no haya clientes. Serverless es contratar a alguien por tarea: aparece cuando hay trabajo y se va cuando termina.

### Las limitaciones (para que no parezca magia)

- **No hay disco permanente.** Las funciones serverless no guardan archivos entre un pedido y el siguiente. **Por eso los CVs no se pueden guardar "en el servidor" y necesitamos un storage aparte**, como vimos en la sección 1.
- **Tiempo máximo de ejecución.** Una función no puede quedarse corriendo indefinidamente.
- **Cold start.** Si una función no se usó en un rato, la primera vez puede tardar un poquito más en responder.
- **Dependencia del proveedor.** Ciertas funciones son específicas de Vercel, y mudarse a otro lado implica algo de trabajo.

### Variables de entorno: por qué hay que cargarlas en Vercel

El archivo `.env.local` **no se sube a GitHub** (está en `.gitignore`), porque tiene claves. Entonces Vercel no las tiene y hay que cargárselas a mano en su panel. Para más detalle está la [guía de variables de entorno](../guias/guia-variables-entorno.md).

> Ojo con el prefijo `NEXT_PUBLIC_`: todo lo que lo lleve **termina en el navegador del usuario** y cualquiera lo puede ver. Las claves secretas (como la service role key de Supabase) nunca llevan ese prefijo.

---

## 7. Cómo encaja todo

```
                    ┌─────────────────────┐
  Usuario  ───────► │       Vercel        │   ← "el mostrador": recibe pedidos,
 (navegador)        │  CDN + funciones    │     ejecuta Next.js
                    └─────────┬───────────┘
                              │
          ┌───────────────────┼───────────────────┐
          ▼                   ▼                   ▼
   ┌─────────────┐    ┌──────────────┐    ┌──────────────┐
   │  Database   │    │     Auth     │    │   Storage    │
   │ (Postgres)  │    │  (sesiones)  │    │  (archivos)  │
   │ "el fichero"│    │ "el portero" │    │ "el depósito"│
   └─────────────┘    └──────────────┘    └──────────────┘
                         Supabase
```

- **Vercel** ejecuta la aplicación (el código Next.js).
- **Supabase Database** guarda los datos (usuarios, ofertas, postulaciones, rutas de archivos).
- **Supabase Auth** sabe quién es cada usuario.
- **Supabase Storage** guarda los archivos (CVs).

Ninguna de estas piezas es "nuestra máquina". Todas son servicios administrados por otros. Nosotros escribimos el código y configuramos cómo se conectan.

---

## 8. Preguntas frecuentes

**¿Vercel es gratis?**
Tiene un plan gratuito (Hobby) pensado para proyectos personales y de aprendizaje. Para uso comercial o de equipo hay planes pagos. Las condiciones de cada plan conviene revisarlas en su sitio, porque cambian.

**¿Si Vercel se cae, se cae el portal?**
Sí, la app depende de Vercel, igual que dependería de un servidor propio si se cortara la luz. La diferencia es que Vercel tiene equipos y redundancia dedicados a que eso no pase.

**¿Puedo usar Vercel con otra cosa que no sea Next.js?**
Sí, soporta muchos frameworks. Pero Next.js lo hace la misma empresa, así que la integración es la más directa.

**¿Supabase Storage es lo mismo que Google Drive?**
Se parecen en que guardan archivos, pero Drive es una app para personas y Supabase Storage es un servicio para que **tu aplicación** guarde y sirva archivos con reglas programadas.

**¿Por qué no guardar el CV directamente en la carpeta `public/` del proyecto?**
Porque `public/` es parte del código: lo que hay ahí se publica para todo el mundo y solo cambia cuando hacés un deploy. Un usuario no puede "subir" algo a `public/` desde la web.

**¿Qué pasa con los archivos si borro el registro en la base de datos?**
Nada: el archivo queda huérfano en el storage. Por eso hay que borrar las dos cosas, y por eso el orden de las operaciones (con rollback) importa.
