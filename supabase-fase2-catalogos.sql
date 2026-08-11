begin;

create table if not exists public.catalogo_unidades (
  id uuid primary key default gen_random_uuid(),
  nombre text not null check (btrim(nombre) <> ''),
  activo boolean not null default true,
  es_sistema boolean not null default false,
  created_by uuid null references public.usuarios(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists catalogo_unidades_nombre_uidx
  on public.catalogo_unidades (lower(btrim(nombre)));
create index if not exists catalogo_unidades_created_by_idx
  on public.catalogo_unidades (created_by);

create table if not exists public.catalogo_preparaciones (
  id uuid primary key default gen_random_uuid(),
  nombre text not null check (btrim(nombre) <> ''),
  categoria text not null check (categoria in ('proteina', 'guarnicion')),
  unidad_id uuid not null references public.catalogo_unidades(id),
  unidades_por_caja numeric null check (unidades_por_caja is null or unidades_por_caja > 0),
  unidades_por_racion numeric null check (unidades_por_racion is null or unidades_por_racion > 0),
  peso_envase_kg numeric null check (peso_envase_kg is null or peso_envase_kg > 0),
  gramos_por_racion numeric null check (gramos_por_racion is null or gramos_por_racion > 0),
  merma_porcentaje numeric null check (merma_porcentaje is null or merma_porcentaje between -300 and 80),
  merma_fuente text null,
  activo boolean not null default true,
  created_by uuid null references public.usuarios(id) on delete set null,
  updated_by uuid null references public.usuarios(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint catalogo_preparaciones_datos_categoria_ck check (
    (categoria = 'proteina' and unidades_por_caja is not null and unidades_por_racion is not null)
    or
    (categoria = 'guarnicion' and peso_envase_kg is not null and gramos_por_racion is not null)
  )
);

create unique index if not exists catalogo_preparaciones_nombre_categoria_uidx
  on public.catalogo_preparaciones (categoria, lower(btrim(nombre)));
create index if not exists catalogo_preparaciones_unidad_idx
  on public.catalogo_preparaciones (unidad_id);
create index if not exists catalogo_preparaciones_activo_categoria_idx
  on public.catalogo_preparaciones (activo, categoria);
create index if not exists catalogo_preparaciones_created_by_idx
  on public.catalogo_preparaciones (created_by);
create index if not exists catalogo_preparaciones_updated_by_idx
  on public.catalogo_preparaciones (updated_by);

insert into public.catalogo_unidades (nombre, es_sistema)
values
  ('pieza', true), ('filete', true), ('muslo', true), ('unidad', true),
  ('kg', true), ('litro', true), ('barqueta', true), ('caja', true),
  ('cubeta', true), ('gastronorm', true)
on conflict ((lower(btrim(nombre)))) do update
set activo = true, es_sistema = true, updated_at = now();

alter table public.catalogo_unidades enable row level security;
alter table public.catalogo_preparaciones enable row level security;
revoke all on table public.catalogo_unidades from public, anon, authenticated;
revoke all on table public.catalogo_preparaciones from public, anon, authenticated;
grant select, insert, update on table public.catalogo_unidades to service_role;
grant select, insert, update on table public.catalogo_preparaciones to service_role;

create or replace function public.cociner_catalogo_list(p_token_hash text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_usuario_id uuid;
begin
  select s.user_id into v_usuario_id
  from public.app_sessions s
  join public.usuarios u on u.id = s.user_id
  where s.token_hash = p_token_hash and s.expires_at > now() and u.activo;
  if v_usuario_id is null then raise exception 'UNAUTHORIZED'; end if;

  return jsonb_build_object(
    'unidades', coalesce((
      select jsonb_agg(jsonb_build_object('id', u.id, 'nombre', u.nombre) order by u.nombre)
      from public.catalogo_unidades u where u.activo
    ), '[]'::jsonb),
    'preparaciones', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', p.id, 'nombre', p.nombre, 'categoria', p.categoria,
        'unidad_id', p.unidad_id, 'unidad', u.nombre,
        'unidades_por_caja', p.unidades_por_caja,
        'unidades_por_racion', p.unidades_por_racion,
        'peso_envase_kg', p.peso_envase_kg,
        'gramos_por_racion', p.gramos_por_racion,
        'merma_porcentaje', p.merma_porcentaje,
        'merma_fuente', p.merma_fuente,
        'activo', p.activo, 'created_at', p.created_at, 'updated_at', p.updated_at
      ) order by p.categoria, p.nombre)
      from public.catalogo_preparaciones p
      join public.catalogo_unidades u on u.id = p.unidad_id
    ), '[]'::jsonb)
  );
end;
$$;

create or replace function public.cociner_catalogo_save(
  p_token_hash text,
  p_datos jsonb,
  p_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_usuario_id uuid;
  v_unidad_id uuid;
  v_categoria text := nullif(btrim(p_datos->>'categoria'), '');
  v_nombre text := nullif(btrim(p_datos->>'nombre'), '');
  v_unidad_nueva text := nullif(btrim(p_datos->>'unidad_nueva'), '');
  v_resultado public.catalogo_preparaciones;
begin
  select s.user_id into v_usuario_id
  from public.app_sessions s
  join public.usuarios u on u.id = s.user_id
  where s.token_hash = p_token_hash and s.expires_at > now() and u.activo;
  if v_usuario_id is null then raise exception 'UNAUTHORIZED'; end if;
  if v_nombre is null or v_categoria not in ('proteina', 'guarnicion') then raise exception 'INVALID_DATA'; end if;

  if v_unidad_nueva is not null then
    insert into public.catalogo_unidades (nombre, created_by)
    values (v_unidad_nueva, v_usuario_id)
    on conflict ((lower(btrim(nombre)))) do update
      set activo = true, updated_at = now()
    returning id into v_unidad_id;
  else
    begin v_unidad_id := (p_datos->>'unidad_id')::uuid;
    exception when others then raise exception 'INVALID_UNIT'; end;
    if not exists (select 1 from public.catalogo_unidades where id = v_unidad_id and activo) then
      raise exception 'INVALID_UNIT';
    end if;
  end if;

  if p_id is null then
    insert into public.catalogo_preparaciones (
      nombre, categoria, unidad_id, unidades_por_caja, unidades_por_racion,
      peso_envase_kg, gramos_por_racion, merma_porcentaje, merma_fuente,
      created_by, updated_by
    ) values (
      v_nombre, v_categoria, v_unidad_id,
      nullif(p_datos->>'unidades_por_caja', '')::numeric,
      nullif(p_datos->>'unidades_por_racion', '')::numeric,
      nullif(p_datos->>'peso_envase_kg', '')::numeric,
      nullif(p_datos->>'gramos_por_racion', '')::numeric,
      nullif(p_datos->>'merma_porcentaje', '')::numeric,
      nullif(btrim(p_datos->>'merma_fuente'), ''),
      v_usuario_id, v_usuario_id
    ) returning * into v_resultado;
  else
    update public.catalogo_preparaciones set
      nombre = v_nombre, categoria = v_categoria, unidad_id = v_unidad_id,
      unidades_por_caja = nullif(p_datos->>'unidades_por_caja', '')::numeric,
      unidades_por_racion = nullif(p_datos->>'unidades_por_racion', '')::numeric,
      peso_envase_kg = nullif(p_datos->>'peso_envase_kg', '')::numeric,
      gramos_por_racion = nullif(p_datos->>'gramos_por_racion', '')::numeric,
      merma_porcentaje = nullif(p_datos->>'merma_porcentaje', '')::numeric,
      merma_fuente = nullif(btrim(p_datos->>'merma_fuente'), ''),
      updated_by = v_usuario_id, updated_at = now()
    where id = p_id and activo
    returning * into v_resultado;
    if v_resultado.id is null then raise exception 'NOT_FOUND'; end if;
  end if;

  return public.cociner_catalogo_list(p_token_hash);
exception
  when unique_violation then raise exception 'DUPLICATE_NAME';
end;
$$;

create or replace function public.cociner_catalogo_archive(p_token_hash text, p_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_usuario_id uuid;
begin
  select s.user_id into v_usuario_id
  from public.app_sessions s
  join public.usuarios u on u.id = s.user_id
  where s.token_hash = p_token_hash and s.expires_at > now() and u.activo;
  if v_usuario_id is null then raise exception 'UNAUTHORIZED'; end if;

  update public.catalogo_preparaciones
  set activo = false, updated_by = v_usuario_id, updated_at = now()
  where id = p_id and activo;
  if not found then raise exception 'NOT_FOUND'; end if;
  return public.cociner_catalogo_list(p_token_hash);
end;
$$;

revoke all on function public.cociner_catalogo_list(text) from public, anon, authenticated;
revoke all on function public.cociner_catalogo_save(text, jsonb, uuid) from public, anon, authenticated;
revoke all on function public.cociner_catalogo_archive(text, uuid) from public, anon, authenticated;
grant execute on function public.cociner_catalogo_list(text) to service_role;
grant execute on function public.cociner_catalogo_save(text, jsonb, uuid) to service_role;
grant execute on function public.cociner_catalogo_archive(text, uuid) to service_role;

commit;
