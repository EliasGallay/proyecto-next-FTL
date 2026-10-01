-- email ya está en auth.users — no tiene sentido duplicarlo
alter table usuarios drop column email;

-- telefono ya está en usuarios — la columna en postulantes nunca se usó
alter table postulantes drop column telefono;
