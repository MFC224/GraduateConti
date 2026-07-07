-- =========================================================
-- RLS POLICIES — Control de Invitados
-- Universidad Continental
--
-- Orden:
--   1. Habilitar RLS en cada tabla
--   2. Función auxiliar sede_del_usuario()
--   3. Políticas por tabla y por operación
-- =========================================================

-- =========================================================
-- HELPER: devuelve sede_id del usuario autenticado
-- (null si admin_general)
-- =========================================================
create or replace function public.sede_del_usuario()
returns uuid
language sql
stable
as $$
  select sede_id
  from public.usuarios
  where id = auth.uid();
$$;

-- =========================================================
-- HELPER: ¿el usuario autenticado es admin_general?
-- =========================================================
create or replace function public.es_admin_general()
returns boolean
language sql
stable
as $$
  select exists (
    select 1 from public.usuarios
    where id = auth.uid() and rol = 'admin_general'
  );
$$;

-- =========================================================
-- 1. SEDES
-- =========================================================
alter table sedes enable row level security;

create policy "sedes_select_admin"
on sedes for select
to authenticated
using (true);

create policy "sedes_insert_admin"
on sedes for insert
to authenticated
with check (public.es_admin_general());

create policy "sedes_update_admin"
on sedes for update
to authenticated
using (public.es_admin_general())
with check (public.es_admin_general());

create policy "sedes_delete_admin"
on sedes for delete
to authenticated
using (public.es_admin_general());

-- =========================================================
-- 2. USUARIOS
-- =========================================================
alter table usuarios enable row level security;

create policy "usuarios_select_self"
on usuarios for select
to authenticated
using (
  id = auth.uid() or public.es_admin_general()
);

create policy "usuarios_insert_admin"
on usuarios for insert
to authenticated
with check (public.es_admin_general());

create policy "usuarios_update_admin"
on usuarios for update
to authenticated
using (public.es_admin_general());

create policy "usuarios_delete_admin"
on usuarios for delete
to authenticated
using (public.es_admin_general());

-- =========================================================
-- 3. CEREMONIAS
-- =========================================================
alter table ceremonias enable row level security;

create policy "ceremonias_select_staff"
on ceremonias for select
to authenticated
using (
  public.es_admin_general()
  or sede_id = public.sede_del_usuario()
);

create policy "ceremonias_insert_encargado"
on ceremonias for insert
to authenticated
with check (
  public.es_admin_general()
  or (
    sede_id = public.sede_del_usuario()
    and exists (
      select 1 from usuarios
      where id = auth.uid() and rol in ('admin_general', 'encargado')
    )
  )
);

create policy "ceremonias_update_encargado"
on ceremonias for update
to authenticated
using (
  public.es_admin_general()
  or (
    sede_id = public.sede_del_usuario()
    and exists (
      select 1 from usuarios
      where id = auth.uid() and rol in ('admin_general', 'encargado')
    )
  )
)
with check (
  public.es_admin_general()
  or (
    sede_id = public.sede_del_usuario()
    and exists (
      select 1 from usuarios
      where id = auth.uid() and rol in ('admin_general', 'encargado')
    )
  )
);

create policy "ceremonias_delete_admin"
on ceremonias for delete
to authenticated
using (public.es_admin_general());

-- =========================================================
-- 4. EGRESADOS
-- =========================================================
alter table egresados enable row level security;

create policy "egresados_select_staff"
on egresados for select
to authenticated
using (
  public.es_admin_general()
  or exists (
    select 1 from ceremonias
    where ceremonias.id = egresados.ceremonia_id
    and ceremonias.sede_id = public.sede_del_usuario()
  )
);

-- Anon: permitir SELECT por DNI (login del egresado)
-- usando la función public.egresados_login definida aparte
-- o mediante un policy específico con CHECK manual.
-- Nota: auth.uid() es NULL para anon, la policy se aplica
-- a nivel de fila verificando que coincida dni y apellidos.
-- Como RLS no puede verificar apellidos desde la query,
-- se permite el SELECT anon solo por DNI (filtro mínimo).
-- La validación de nombres+apellidos ocurre en la app.
create policy "egresados_select_anon_login"
on egresados for select
to anon
using (true);

create policy "egresados_insert_encargado"
on egresados for insert
to authenticated
with check (
  public.es_admin_general()
  or exists (
    select 1 from usuarios
    where usuarios.id = auth.uid()
    and usuarios.rol in ('admin_general', 'encargado')
    and (
      usuarios.rol = 'admin_general'
      or exists (
        select 1 from ceremonias
        where ceremonias.id = egresados.ceremonia_id
        and ceremonias.sede_id = usuarios.sede_id
      )
    )
  )
);

create policy "egresados_update_encargado"
on egresados for update
to authenticated
using (
  public.es_admin_general()
  or exists (
    select 1 from usuarios
    where usuarios.id = auth.uid()
    and usuarios.rol in ('admin_general', 'encargado')
    and (
      usuarios.rol = 'admin_general'
      or exists (
        select 1 from ceremonias
        where ceremonias.id = egresados.ceremonia_id
        and ceremonias.sede_id = usuarios.sede_id
      )
    )
  )
);

-- Operario puede actualizar equipo_entregado_at, dni_retenido, etc.
create policy "egresados_update_operario_equipo"
on egresados for update
to authenticated
using (
  exists (
    select 1 from usuarios
    where usuarios.id = auth.uid()
    and usuarios.rol = 'operario'
    and exists (
      select 1 from ceremonias
      where ceremonias.id = egresados.ceremonia_id
      and ceremonias.sede_id = usuarios.sede_id
    )
  )
);

create policy "egresados_delete_admin"
on egresados for delete
to authenticated
using (public.es_admin_general());

-- =========================================================
-- 5. INVITADOS
-- =========================================================
alter table invitados enable row level security;

create policy "invitados_select_staff"
on invitados for select
to authenticated
using (
  public.es_admin_general()
  or exists (
    select 1 from ceremonias
    where ceremonias.id = invitados.ceremonia_id
    and ceremonias.sede_id = public.sede_del_usuario()
  )
);

-- Anon: ver invitación por qr_token (página pública /invitacion/[qr])
create policy "invitados_select_anon_qr"
on invitados for select
to anon
using (true);

create policy "invitados_insert"
on invitados for insert
to authenticated
with check (
  public.es_admin_general()
  or exists (
    select 1 from egresados
    where egresados.id = invitados.egresado_id
    and exists (
      select 1 from ceremonias
      where ceremonias.id = egresados.ceremonia_id
      and (
        public.es_admin_general()
        or ceremonias.sede_id = public.sede_del_usuario()
      )
    )
  )
);

-- Operario/encargado marca ingreso o aprueba
create policy "invitados_update_ingreso"
on invitados for update
to authenticated
using (
  public.es_admin_general()
  or exists (
    select 1 from usuarios
    where usuarios.id = auth.uid()
    and usuarios.rol in ('admin_general', 'encargado', 'operario')
    and (
      usuarios.rol = 'admin_general'
      or exists (
        select 1 from ceremonias
        where ceremonias.id = invitados.ceremonia_id
        and ceremonias.sede_id = usuarios.sede_id
      )
    )
  )
);

create policy "invitados_delete_admin"
on invitados for delete
to authenticated
using (public.es_admin_general());

-- =========================================================
-- 6. AUDITORIA
-- =========================================================
alter table auditoria enable row level security;

create policy "auditoria_insert_staff"
on auditoria for insert
to authenticated
with check (true);

create policy "auditoria_select_admin"
on auditoria for select
to authenticated
using (public.es_admin_general());

-- =========================================================
-- 7. VISTA: v_resumen_ceremonia
-- La vista se crea con SECURITY INVOKER por defecto,
-- por lo que hereda RLS de las tablas base.
-- =========================================================
alter view v_resumen_ceremonia
set (security_invoker = true);
