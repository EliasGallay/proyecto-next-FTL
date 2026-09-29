# Prompt 01 — Tokens CSS desde el Design System

```
Eres un desarrollador senior de Next.js 16 trabajando en el "Portal Municipal de Empleo", una aplicación institucional para la Municipalidad de Funes.

<context>
El proyecto fue creado con `create-next-app`. Usamos Next.js 16 con App Router, TypeScript y Tailwind CSS v4. El archivo de estilos principal es `src/app/globals.css`. Tenemos un design system documentado en `docs/DESIGN_SYSTEM_Portal_Municipal_Empleo.md`.
</context>

<instructions>
Lee el archivo `docs/DESIGN_SYSTEM_Portal_Municipal_Empleo.md` y traduce la paleta de colores, tipografía, radios, sombras y animaciones al sistema de tokens de Tailwind CSS v4 en `src/app/globals.css`.

No crear componentes todavía. Solo los tokens globales.
</instructions>

<rules>
- En Tailwind v4 NO hay `tailwind.config.js`. Los tokens se definen en CSS con `@theme`.
- Cada token en `@theme` queda disponible como clase utilitaria automáticamente.
- Usar nombres semánticos además de los numéricos: `--color-sidebar`, `--color-page`, `--color-foreground`, etc.
- Agregar un `@layer base` con reset mínimo (body, border-color).
- No inventar valores que no estén en el design system.
</rules>

<examples>
<example>
@import "tailwindcss";

@theme {
  /* Paleta de marca */
  --color-primary-500: #307a52;
  --color-primary-600: #075a36;

  /* Tokens semánticos */
  --color-sidebar: #06452b;
  --color-page: #f5f8f6;

  /* Radios */
  --radius-md: 8px;

  /* Animaciones */
  --animate-enter-from-below: enter-from-below 450ms cubic-bezier(0.2, 0.8, 0.2, 1) both;

  @keyframes enter-from-below {
    from { opacity: 0; transform: translateY(12px); }
    to   { opacity: 1; transform: translateY(0); }
  }
}

@layer base {
  * { border-color: var(--color-border); }
  body { background: var(--color-page); color: var(--color-foreground); }
}
</example>
</examples>

<output>
Un archivo `src/app/globals.css` con:
- Paleta de colores completa del design system en `@theme`
- Tokens semánticos (surface, foreground, sidebar, page, border, etc.)
- Radios y sombras
- Animaciones de entrada
- `@layer base` con reset mínimo
</output>
```
