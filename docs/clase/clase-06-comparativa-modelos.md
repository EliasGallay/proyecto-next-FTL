# Comparativa de modelos de IA para desarrollo — 2026

 cuándo usar cada modelo según la situación.

---

## Claude (Anthropic)

Claude Code usa estos modelos. El modelo se puede cambiar con `/model`.

| Modelo | ID | Perfil |
|--------|-----|--------|
| Fable 5 | `claude-fable-5` | Máxima capacidad |
| Opus 4.8 | `claude-opus-4-8` | Razonamiento complejo |
| Sonnet 4.6 | `claude-sonnet-4-6` | Equilibrio (default) |
| Haiku 4.5 | `claude-haiku-4-5-20251001` | Velocidad y costo |

### Cuándo usar cada uno

**Fable 5** — El más capaz disponible.
- Sistemas complejos desde cero
- Refactors grandes con muchos archivos relacionados
- Cuando los otros modelos se traban o dan soluciones incompletas
- Decisiones de arquitectura que requieren razonar todo el contexto

**Opus 4.8** — Razonamiento profundo, ligeramente más rápido que Fable 5.
- Debugging difícil donde el error no es obvio
- Revisiones de seguridad y lógica crítica
- Explicar conceptos complejos con precisión
- `/fast` activa Fast Mode con output más rápido sin bajar de modelo

**Sonnet 4.6** — El default. El punto ideal velocidad/calidad para el día a día.
- Features nuevas de tamaño normal
- Correcciones de bugs conocidos
- Trabajo iterativo durante construcción del proyecto
- **Usarlo el 80% del tiempo**

**Haiku 4.5** — Más rápido y más barato.
- Preguntas puntuales y búsquedas en el código
- Cambios mecánicos bien definidos (renombrar, formatear, mover)
- Cuando necesitás velocidad y la tarea es clara

### Regla práctica
> Empezá con Sonnet. Si la respuesta es vaga o incompleta → Opus. Si el problema es arquitectónico o muy extenso → Fable 5. Si solo estás consultando algo simple → Haiku.

---

## Codex (OpenAI) — familia GPT-5.6

Codex usa la familia Sol / Terra / Luna de OpenAI. Tres niveles del mismo modelo.

| Modelo | Precio (entrada/salida por 1M tokens) | Velocidad | Contexto largo |
|--------|--------------------------------------|-----------|----------------|
| **Sol** | $5 / $30 | Más lento | 91.5% MRCR |
| **Terra** | $2.50 / $15 | Medio | — |
| **Luna** | $1 / $6 | Más rápido | 41.3% MRCR |

> MRCR = capacidad de recuperar información específica en documentos largos.

### Cuándo usar cada uno

**Sol** — Para cuando una decisión equivocada es cara.
- Arquitectura y diseño de sistemas
- Revisiones de seguridad
- Refactors multi-archivo complejos
- Sesiones de coding de horas donde el contexto acumulado importa
- Bugs donde el error puede crear deuda técnica si se resuelve mal

**Terra** — El default inteligente para desarrollo cotidiano.
- Features nuevas del día a día
- Debugging normal
- Tests y refactors acotados
- Equivalente a GPT-5.5 al doble de velocidad y mitad de costo
- **Usarlo como punto de partida en Codex**

**Luna** — Para trabajo bien especificado y repetitivo.
- Clasificación y etiquetado de texto
- Extracción de datos con estructura clara
- Documentación y formateo
- Subagentes dentro de un flujo más grande
- **Ojo:** no lo uses para tareas donde necesite recordar información de archivos largos (falla el 60% del tiempo)

### Modelos adicionales

**GPT-5.3 Codex** — Especializado en coding agentic de larga duración.
- Sesiones largas de refactor o migración
- Trabajo autónomo multi-archivo
- $1.75 entrada / $14 salida por 1M tokens

**GPT-5.3 Codex-Spark** — Para autocompletado en tiempo real en el IDE.
- No para tareas, sino para completar línea a línea mientras escribís

---

## Antigravity (Google) — familia Gemini

Antigravity 2.0 es el IDE agentic de Google (anunciado en Google I/O 2026). Corre agentes en paralelo: uno escribe código, otro ejecuta terminal, otro prueba en el browser, y se verifican entre sí.

| Modelo | Precio (entrada/salida por 1M tokens) | Velocidad | Max output |
|--------|--------------------------------------|-----------|------------|
| **Gemini 3.5 Flash** | $1.50 / $9 | 289 tok/s | 65K tokens |
| **Gemini 3.1 Pro** | $2 / $12 | ~80 tok/s | 32K tokens |

### Cuándo usar cada uno

**Gemini 3.5 Flash** — El default de Antigravity. La opción para la mayoría de los casos.
- Desarrollo agentic del día a día en Antigravity
- Tareas en paralelo con múltiples subagentes
- Cuando el tiempo de respuesta importa (4x más rápido que modelos frontier comparables)
- SWE-Bench Pro: 55.1% — bueno para code generation real
- Output grande: ideal cuando generás mucho código en una sola operación
- **Usarlo como default en Antigravity**

**Gemini 3.1 Pro** — Para razonamiento más profundo cuando Flash no alcanza.
- Decisiones que requieren contexto más rico
- Problemas donde Flash da respuestas superficiales
- Más lento (~80 tok/s) pero con razonamiento más cuidadoso

### Qué hace único a Antigravity vs. los otros
- Agentes especializados corriendo en paralelo (no un solo agente haciendo todo)
- Browser Subagent: un agente que abre Chrome y usa la aplicación mientras la construye
- Scheduled Tasks: tareas largas que corren en background
- Verificación cruzada entre agentes antes de marcar algo como terminado

---

## Resumen comparativo rápido

| Situación | Modelo recomendado |
|-----------|-------------------|
| Arquitectura / diseño de sistema | Claude Fable 5 o Codex Sol |
| Feature nueva del día a día | Claude Sonnet 4.6 o Codex Terra |
| Bug complicado | Claude Opus 4.8 o Codex Sol |
| Tarea repetitiva / mecánica | Claude Haiku 4.5 o Codex Luna |
| Trabajo en paralelo con múltiples agentes | Antigravity + Gemini 3.5 Flash |
| Razonamiento profundo en Antigravity | Antigravity + Gemini 3.1 Pro |
| Autocompletado en tiempo real | Codex Spark |
| Consultas rápidas al código | Claude Haiku 4.5 |
| Refactor multi-archivo largo | Claude Fable 5 o Codex GPT-5.3 Codex |

---

> "Cada herramienta tiene modelos de distinto nivel. La lógica es siempre la misma: más capacidad = más lento y más caro. El truco está en elegir el modelo adecuado para la tarea, no siempre el más potente."

**La analogía útil:**
- Luna / Haiku / Flash → Un asistente rápido para tareas claras
- Terra / Sonnet → El colaborador del día a día
- Sol / Opus / Pro → El especialista para problemas difíciles
- Fable 5 / Astra → El experto que traés cuando todo lo demás falló

---

*Fuentes: [developers.openai.com/codex/models](https://developers.openai.com/codex/models) · [antigravity.google/blog/gemini-3-5-flash-in-google-antigravity](https://antigravity.google/blog/gemini-3-5-flash-in-google-antigravity) · [aiden: Best Codex Model 2026](https://aidenapp.org/best-codex-model) · [mindstudio: Gemini 3.5 Flash vs 3.1 Pro](https://www.mindstudio.ai/blog/gemini-3-5-flash-vs-gemini-3-1-pro-comparison)*
