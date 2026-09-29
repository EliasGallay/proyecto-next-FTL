# Prompt 03 — Base de datos

```
Necesito diseñar la base de datos para el portal de empleo. Las entidades principales son:

- Usuarios con tres roles: postulante, empresa, municipalidad.
- Los postulantes tienen perfil con DNI y pueden subir su CV.
- Las empresas tienen razón social, CUIT y rubro.
- Las ofertas laborales las crean las empresas, la municipalidad las aprueba antes de publicarse.
- Los postulantes se aplican a las ofertas. No pueden aplicarse dos veces a la misma.
- La municipalidad puede derivar una postulación a la empresa correspondiente.
- Las ofertas y postulantes se pueden clasificar por categorías laborales.

Usamos Supabase (PostgreSQL). ¿Cómo modelarías estas tablas y relaciones? ¿Qué decisiones de diseño tengo que tomar antes de escribir el esquema?
```
