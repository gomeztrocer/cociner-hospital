-- Fase 1.1: las fechas nuevas no heredan cantidades predeterminadas.
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
        'cantidad', (select d.cantidad from public.comensales_diarios d where d.fecha = p_fecha and d.centro_id = c.id and d.servicio = 'almuerzo'),
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
        ) then null else (select d.cantidad from public.comensales_diarios d where d.fecha = p_fecha and d.centro_id = c.id and d.servicio = 'cena') end,
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

  delete from public.comensales_diarios d
  using jsonb_to_recordset(p_valores) as v(centro_id text, almuerzo integer, cena integer)
  where d.fecha = p_fecha and d.centro_id = v.centro_id and (
    (d.servicio = 'almuerzo' and v.almuerzo is null)
    or (d.servicio = 'cena' and v.cena is null)
    or exists (
      select 1 from public.centro_servicio_excepciones e
      where e.centro_id = d.centro_id and e.servicio = d.servicio and e.activo
        and e.dia_semana = extract(isodow from p_fecha)::int
    )
  );

  insert into public.comensales_diarios (fecha, centro_id, servicio, cantidad, usuario_id)
  select p_fecha, c.id, s.servicio, greatest(0, s.cantidad), v_usuario_id
  from jsonb_to_recordset(p_valores) as v(centro_id text, almuerzo integer, cena integer)
  join public.centros c on c.id = v.centro_id and coalesce(c.activo, true)
  cross join lateral (values ('almuerzo', v.almuerzo), ('cena', v.cena)) as s(servicio, cantidad)
  where s.cantidad is not null and not exists (
    select 1 from public.centro_servicio_excepciones e
    where e.centro_id = c.id and e.servicio = s.servicio and e.activo
      and e.dia_semana = extract(isodow from p_fecha)::int
  )
  on conflict (fecha, centro_id, servicio) do update
    set cantidad = excluded.cantidad, usuario_id = excluded.usuario_id, updated_at = now();
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

  delete from public.comensales_diarios where fecha = p_fecha;
  insert into public.comensales_diarios (fecha, centro_id, servicio, cantidad, usuario_id)
  select p_fecha, d.centro_id, d.servicio, d.cantidad, v_usuario_id
  from public.comensales_diarios d
  join public.centros c on c.id = d.centro_id and coalesce(c.activo, true)
  where d.fecha = v_anterior and not exists (
    select 1 from public.centro_servicio_excepciones e
    where e.centro_id = d.centro_id and e.servicio = d.servicio and e.activo
      and e.dia_semana = extract(isodow from p_fecha)::int
  );

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
