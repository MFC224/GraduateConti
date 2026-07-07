-- =========================================================
-- SISTEMA DE CONTROL DE INVITADOS - CEREMONIAS DE GRADUACION
-- Universidad Continental
-- Motor: PostgreSQL (Supabase)
-- =========================================================

-- Extensión necesaria para generar UUIDs y tokens aleatorios
create extension if not exists "pgcrypto";

-- =========================================================
-- 1. SEDES
-- Cada sede (Cusco, Huancayo, Arequipa, etc.) es independiente
-- en cuanto a usuarios, ceremonias y aforo.
-- =========================================================
create table sedes (
    id           uuid primary key default gen_random_uuid(),
    nombre       text not null,                 -- ej: "Cusco"
    ciudad       text,
    direccion    text,
    activo       boolean not null default true,
    created_at   timestamptz not null default now()
);

-- =========================================================
-- 2. USUARIOS DEL SISTEMA (encargados y operarios)
-- Se vincula 1 a 1 con auth.users de Supabase (ellos sí
-- inician sesión con correo/contraseña, a diferencia del
-- egresado).
-- =========================================================
create table usuarios (
    id           uuid primary key references auth.users(id) on delete cascade,
    nombres      text not null,
    apellidos    text not null,
    dni          text,
    rol          text not null check (rol in ('admin_general', 'encargado', 'operario')),
    sede_id      uuid references sedes(id),     -- null solo si rol = admin_general (ve todas las sedes)
    activo       boolean not null default true,
    created_at   timestamptz not null default now()
);

-- rol:
--   admin_general -> ve y administra todas las sedes (opcional, nivel nacional)
--   encargado     -> crea/edita ceremonias de SU sede, ve dashboard completo
--   operario      -> solo registra ingresos y ve dashboard de su(s) ceremonia(s) activas

-- =========================================================
-- 3. CEREMONIAS
-- =========================================================
create table ceremonias (
    id                    uuid primary key default gen_random_uuid(),
    sede_id               uuid not null references sedes(id),
    nombre                text not null,             -- ej: "Ceremonia Ingeniería - Turno Mañana"
    programa_principal    text,                       -- ej: "Derecho", "Medicina" (agrupa/filtra en el dashboard)
    fecha                 date not null,
    hora_inicio           time not null,
    hora_fin              time,
    aforo_total_invitados int not null,               -- aforo máximo de invitados para ESTA ceremonia
    cupo_base_invitado    int not null default 3,      -- cupo garantizado por egresado (configurable)
    hora_liberacion_espera time,                       -- hora desde la que se puede liberar la lista de espera
    espera_liberada       boolean not null default false, -- evita liberar dos veces
    estado                text not null default 'planificada'
                          check (estado in ('planificada', 'en_curso', 'finalizada', 'cancelada')),
    creado_por            uuid references usuarios(id),
    created_at            timestamptz not null default now(),
    updated_at            timestamptz not null default now()
);

create index idx_ceremonias_sede on ceremonias(sede_id);
create index idx_ceremonias_fecha on ceremonias(fecha);

-- =========================================================
-- 4. EGRESADOS
-- Cargados por el encargado (import masivo desde la lista
-- oficial de grados y títulos). Cada egresado tiene un token
-- único para acceder a su página de registro sin necesidad
-- de crear cuenta ni contraseña.
-- =========================================================
create table egresados (
    id                    uuid primary key default gen_random_uuid(),
    ceremonia_id          uuid not null references ceremonias(id) on delete cascade,
    dni                   text not null,
    nombres               text not null,
    apellidos             text not null,
    programa_academico    text,
    telefono              text,
    email                 text,
    numero_orden          int,                    -- correlativo por apellido (1, 2, 3...), es su "número de control"
    token_acceso          uuid not null default gen_random_uuid(), -- identificador interno de sesión (no se envía por link)
    acceso_enviado_at     timestamptz,            -- opcional: si se manda un recordatorio por correo
    confirmado_asistencia boolean not null default false,          -- "sí, voy a asistir" (beta)

    -- Punto de control físico real: entrega de toga/equipo, DNI queda en garantía
    equipo_entregado_at   timestamptz,
    equipo_entregado_por  uuid references usuarios(id),
    dni_retenido          boolean not null default false,
    dni_devuelto_at       timestamptz,

    created_at            timestamptz not null default now(),

    constraint uq_egresado_dni_ceremonia unique (ceremonia_id, dni),
    constraint uq_egresado_numero_ceremonia unique (ceremonia_id, numero_orden)
);

create index idx_egresados_ceremonia on egresados(ceremonia_id);
create unique index idx_egresados_token on egresados(token_acceso);
create index idx_egresados_dni on egresados(dni);
create index idx_egresados_login on egresados(dni, apellidos);   -- usado para el login por DNI + apellido

-- =========================================================
-- 5. INVITADOS
-- ceremonia_id está duplicado aquí a propósito (denormalizado)
-- para que el operario pueda buscar por DNI directamente en
-- esta tabla sin hacer join con egresados — la búsqueda en
-- la puerta tiene que ser instantánea.
-- =========================================================
create table invitados (
    id              uuid primary key default gen_random_uuid(),
    egresado_id     uuid not null references egresados(id) on delete cascade,
    ceremonia_id    uuid not null references ceremonias(id) on delete cascade,
    dni             text not null,
    nombres         text not null,
    apellidos       text not null,
    es_menor_7      boolean not null default false,   -- aviso informativo, no bloquea el registro

    tipo_cupo       text not null default 'base'
                    check (tipo_cupo in ('base', 'adicional')),
    estado          text not null default 'aprobado'
                    check (estado in ('pendiente', 'aprobado', 'rechazado')),
                    -- los primeros N (cupo_base_invitado) entran como 'base' + 'aprobado' automáticamente
                    -- del N+1 en adelante entran como 'adicional' + 'pendiente'

    qr_token        uuid not null default gen_random_uuid(),

    ingreso_at      timestamptz,                        -- null = no ha ingresado
    ingresado_por   uuid references usuarios(id),
    metodo_ingreso  text check (metodo_ingreso in ('qr', 'dni', 'manual')),

    aprobado_por    uuid references usuarios(id),        -- quién aprobó si era 'pendiente'
    created_at      timestamptz not null default now()
);

create index idx_invitados_egresado on invitados(egresado_id);
create index idx_invitados_ceremonia on invitados(ceremonia_id);
create index idx_invitados_dni on invitados(ceremonia_id, dni);   -- búsqueda rápida en puerta
create unique index idx_invitados_qr on invitados(qr_token);

-- =========================================================
-- 6. AUDITORIA
-- Registro simple de acciones sensibles (aprobar invitado
-- adicional, agregar invitado de último momento, cambiar
-- aforo, etc.) para poder responder "quién hizo qué".
-- =========================================================
create table auditoria (
    id          uuid primary key default gen_random_uuid(),
    usuario_id  uuid references usuarios(id),
    accion      text not null,          -- ej: 'aprobar_invitado_adicional', 'crear_ceremonia'
    entidad     text not null,          -- ej: 'invitados', 'ceremonias'
    entidad_id  uuid,
    detalle     jsonb,
    created_at  timestamptz not null default now()
);

create index idx_auditoria_entidad on auditoria(entidad, entidad_id);

-- =========================================================
-- 7. VISTA: RESUMEN EN TIEMPO REAL POR CEREMONIA
-- Esto es lo que alimenta el dashboard, para no tener que
-- calcular todo en el frontend.
-- =========================================================
create view v_resumen_ceremonia as
select
    c.id                                  as ceremonia_id,
    c.nombre                              as ceremonia_nombre,
    c.aforo_total_invitados,
    c.cupo_base_invitado,
    count(distinct e.id)                                                     as total_egresados,
    count(distinct e.id) filter (where e.confirmado_asistencia)              as egresados_confirmados,
    count(distinct e.id) filter (where e.ingreso_at is not null)             as egresados_ingresados,
    count(i.id) filter (where i.estado = 'aprobado')                         as invitados_aprobados,
    count(i.id) filter (where i.estado = 'pendiente')                        as invitados_en_espera,
    count(i.id) filter (where i.ingreso_at is not null)                     as invitados_ingresados,
    c.aforo_total_invitados - count(i.id) filter (where i.ingreso_at is not null) as aforo_libre
from ceremonias c
left join egresados e on e.ceremonia_id = c.id
left join invitados i on i.ceremonia_id = c.id
group by c.id, c.nombre, c.aforo_total_invitados, c.cupo_base_invitado;

-- =========================================================
-- 8. ROW LEVEL SECURITY (sketch — ajustar con opencode)
-- La idea: encargado y operario solo ven datos de su sede;
-- admin_general ve todo. El egresado no usa RLS de Supabase
-- Auth, su acceso se valida a nivel de aplicación con el
-- token_acceso (no inicia sesión).
-- =========================================================
alter table ceremonias enable row level security;
alter table egresados enable row level security;
alter table invitados enable row level security;

create policy "ver ceremonias de su sede"
on ceremonias for select
using (
    exists (
        select 1 from usuarios u
        where u.id = auth.uid()
        and (u.rol = 'admin_general' or u.sede_id = ceremonias.sede_id)
    )
);

-- (Replicar el mismo patrón para egresados e invitados,
-- haciendo join hasta la ceremonia correspondiente)
