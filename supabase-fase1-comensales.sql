-- Fase 1: centros y comensales diarios. Idempotente y compatible con datos existentes.
insert into public.centros (id, nombre, pax_almuerzo, pax_cena, color, activo)
values ('tamaragua', 'Tamaragua', 0, 0, '#0F766E', true)
on conflict (id) do update set nombre = excluded.nombre, color = excluded.color, activo = true;

create table if not exists public.centro_servicio_excepciones (
  id uuid primary key default gen_random_uuid(),
  centro_id text not null references public.centros(id) on delete cascade,
  dia_semana smallint not null check (dia_semana between 1 and 7),
  servicio text not null check (servicio in ('almuerzo', 'cena')),
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  unique (centro_id, dia_semana, servicio)
);

create table if not exists public.comensales_diarios (
  fecha date not null,
  centro_id text not null references public.centros(id) on delete cascade,
  servicio text not null check (servicio in ('almuerzo', 'cena')),
  cantidad integer not null check (cantidad >= 0),
  usuario_id uuid references public.usuarios(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (fecha, centro_id, servicio)
);

create index if not exists comensales_diarios_usuario_id_idx
  on public.comensales_diarios (usuario_id);
create index if not exists comensales_diarios_centro_id_idx
  on public.comensales_diarios (centro_id);

insert into public.centro_servicio_excepciones (centro_id, dia_semana, servicio)
values ('hogara', 2, 'cena'), ('hogarb', 3, 'cena')
on conflict (centro_id, dia_semana, servicio) do update set activo = true;

alter table public.centro_servicio_excepciones enable row level security;
alter table public.comensales_diarios enable row level security;
revoke all on public.centro_servicio_excepciones from public, anon, authenticated;
revoke all on public.comensales_diarios from public, anon, authenticated;
grant all on public.centro_servicio_excepciones to service_role;
grant all on public.comensales_diarios to service_role;

create or replace function public.cociner_comensales_get(p_token_hash text, p_fecha date)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_usuario_id uuid;
  v_result jsonb;
begin
  select s.user_id into v_usuario_id
  from public.app_sessions s
  join public.usuarios u on u.id = s.user_id
  where s.token_hash = p_token_hash and s.expires_at > now() and coalesce(u.activo, false)
  limit 1;
  if v_usuario_id is null then raise exception 'UNAUTHORIZED'; end if;
  if p_fecha is null then raise exception 'INVALID_DATE'; end if;

  select jsonb_build_object(
    'fecha', p_fecha,
    'centros', coalesce(jsonb_agg(jsonb_build_object(
      'id', c.id, 'nombre', c.nombre, 'color', coalesce(c.color, '#64748B'),
      'pax_almuerzo', c.pax_almuerzo, 'pax_cena', c.pax_cena,
      'almuerzo', jsonb_build_object(
        'disponible', not exists (
          select 1 from public.centro_servicio_excepciones e
          where e.centro_id = c.id and e.servicio = 'almuerzo' and e.activo
            and e.dia_semana = extract(isodow from p_fecha)::int
        ),
        'cantidad', coalesce((select d.cantidad from public.comensales_diarios d where d.fecha = p_fecha and d.centro_id = c.id and d.servicio = 'almuerzo'), c.pax_almuerzo),
        'guardado', exists (select 1 from public.comensales_diarios d where d.fecha = p_fecha and d.centro_id = c.id and d.servicio = 'almuerzo')
      ),
      'cena', jsonb_build_object(
        'disponible', not exists (
          select 1 from public.centro_servicio_excepciones e
          where e.centro_id = c.id and e.servicio = 'cena' and e.activo
            and e.dia_semana = extract(isodow from p_fecha)::int
        ),
        'cantidad', case when exists (
          select 1 from public.centro_servicio_excepciones e
          where e.centro_id = c.id and e.servicio = 'cena' and e.activo
            and e.dia_semana = extract(isodow from p_fecha)::int
        ) then 0 else coalesce((select d.cantidad from public.comensales_diarios d where d.fecha = p_fecha and d.centro_id = c.id and d.servicio = 'cena'), c.pax_cena) end,
        'guardado', exists (select 1 from public.comensales_diarios d where d.fecha = p_fecha and d.centro_id = c.id and d.servicio = 'cena')
      )
    ) order by case c.id when 'sur' then 1 when 'candelaria' then 2 when 'parque' then 3 when 'centro' then 4 when 'hogara' then 5 when 'hogarb' then 6 when 'tamaragua' then 7 else 99 end), '[]'::jsonb)
  ) into v_result
  from public.centros c
  where coalesce(c.activo, true);
  return v_result;
end;
$$;

create or replace function public.cociner_comensales_save(p_token_hash text, p_fecha date, p_valores jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_usuario_id uuid;
begin
  select s.user_id into v_usuario_id
  from public.app_sessions s join public.usuarios u on u.id = s.user_id
  where s.token_hash = p_token_hash and s.expires_at > now() and coalesce(u.activo, false)
  limit 1;
  if v_usuario_id is null then raise exception 'UNAUTHORIZED'; end if;
  if p_fecha is null or jsonb_typeof(p_valores) <> 'array' then raise exception 'INVALID_INPUT'; end if;

  insert into public.comensales_diarios (fecha, centro_id, servicio, cantidad, usuario_id)
  select p_fecha, c.id, s.servicio,
    greatest(0, case s.servicio when 'almuerzo' then coalesce(v.almuerzo, 0) else coalesce(v.cena, 0) end),
    v_usuario_id
  from jsonb_to_recordset(p_valores) as v(centro_id text, almuerzo integer, cena integer)
  join public.centros c on c.id = v.centro_id and coalesce(c.activo, true)
  cross join (values ('almuerzo'), ('cena')) as s(servicio)
  where not exists (
    select 1 from public.centro_servicio_excepciones e
    where e.centro_id = c.id and e.servicio = s.servicio and e.activo
      and e.dia_semana = extract(isodow from p_fecha)::int
  )
  on conflict (fecha, centro_id, servicio) do update
    set cantidad = excluded.cantidad, usuario_id = excluded.usuario_id, updated_at = now();

  delete from public.comensales_diarios d
  using public.centro_servicio_excepciones e
  where d.fecha = p_fecha and d.centro_id = e.centro_id and d.servicio = e.servicio
    and e.activo and e.dia_semana = extract(isodow from p_fecha)::int;
  return public.cociner_comensales_get(p_token_hash, p_fecha);
end;
$$;

create or replace function public.cociner_comensales_copy_previous(p_token_hash text, p_fecha date)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_usuario_id uuid;
  v_anterior date := p_fecha - 1;
  v_result jsonb;
begin
  select s.user_id into v_usuario_id
  from public.app_sessions s join public.usuarios u on u.id = s.user_id
  where s.token_hash = p_token_hash and s.expires_at > now() and coalesce(u.activo, false)
  limit 1;
  if v_usuario_id is null then raise exception 'UNAUTHORIZED'; end if;
  if p_fecha is null then raise exception 'INVALID_DATE'; end if;
  if not exists (select 1 from public.comensales_diarios where fecha = v_anterior) then
    raise exception 'NO_PREVIOUS_DATA';
  end if;

  insert into public.comensales_diarios (fecha, centro_id, servicio, cantidad, usuario_id)
  select p_fecha, c.id, s.servicio,
    coalesce(d.cantidad, case s.servicio when 'almuerzo' then c.pax_almuerzo else c.pax_cena end),
    v_usuario_id
  from public.centros c
  cross join (values ('almuerzo'), ('cena')) as s(servicio)
  left join public.comensales_diarios d on d.fecha = v_anterior and d.centro_id = c.id and d.servicio = s.servicio
  where coalesce(c.activo, true) and not exists (
    select 1 from public.centro_servicio_excepciones e
    where e.centro_id = c.id and e.servicio = s.servicio and e.activo
      and e.dia_semana = extract(isodow from p_fecha)::int
  )
  on conflict (fecha, centro_id, servicio) do update
    set cantidad = excluded.cantidad, usuario_id = excluded.usuario_id, updated_at = now();

  v_result := public.cociner_comensales_get(p_token_hash, p_fecha);
  return v_result || jsonb_build_object('copiado_desde', v_anterior);
end;
$$;

revoke all on function public.cociner_comensales_get(text, date) from public, anon, authenticated;
revoke all on function public.cociner_comensales_save(text, date, jsonb) from public, anon, authenticated;
revoke all on function public.cociner_comensales_copy_previous(text, date) from public, anon, authenticated;
grant execute on function public.cociner_comensales_get(text, date) to service_role;
grant execute on function public.cociner_comensales_save(text, date, jsonb) to service_role;
grant execute on function public.cociner_comensales_copy_previous(text, date) to service_role;
notify pgrst, 'reload schema';
