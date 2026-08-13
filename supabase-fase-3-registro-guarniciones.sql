-- CocinerHosp — Flujo Calcular -> Confirmar -> Historial/Dashboard para guarniciones.
-- Archivo local. No aplicar al proyecto remoto sin autorización expresa.

ALTER TABLE public.registros
  ADD COLUMN IF NOT EXISTS barquetas INTEGER,
  ADD COLUMN IF NOT EXISTS cantidad_calculada_g INTEGER,
  ADD COLUMN IF NOT EXISTS cantidad_producida_g INTEGER,
  ADD COLUMN IF NOT EXISTS distribucion_centros JSONB,
  ADD COLUMN IF NOT EXISTS grupo_produccion UUID;

-- Conserva el comportamiento histórico: cada registro previo recibe una cifra explícita.
UPDATE public.registros
SET barquetas = GREATEST(0, ROUND(raciones::NUMERIC / 10)::INTEGER)
WHERE barquetas IS NULL;

ALTER TABLE public.registros
  ALTER COLUMN barquetas SET DEFAULT 0,
  ALTER COLUMN barquetas SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'registros_barquetas_no_negativas') THEN
    ALTER TABLE public.registros ADD CONSTRAINT registros_barquetas_no_negativas CHECK (barquetas >= 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'registros_cantidad_calculada_no_negativa') THEN
    ALTER TABLE public.registros ADD CONSTRAINT registros_cantidad_calculada_no_negativa CHECK (cantidad_calculada_g IS NULL OR cantidad_calculada_g >= 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'registros_cantidad_producida_no_negativa') THEN
    ALTER TABLE public.registros ADD CONSTRAINT registros_cantidad_producida_no_negativa CHECK (cantidad_producida_g IS NULL OR cantidad_producida_g >= 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'registros_distribucion_array') THEN
    ALTER TABLE public.registros ADD CONSTRAINT registros_distribucion_array CHECK (distribucion_centros IS NULL OR jsonb_typeof(distribucion_centros) = 'array');
  END IF;
END;
$$;

CREATE INDEX IF NOT EXISTS idx_registros_grupo_produccion
  ON public.registros (grupo_produccion)
  WHERE grupo_produccion IS NOT NULL;

CREATE OR REPLACE FUNCTION public.cociner_registros_list_v2(
  p_token_hash TEXT,
  p_fecha DATE,
  p_incluir_todos BOOLEAN DEFAULT FALSE
)
RETURNS TABLE(
  id UUID,
  usuario_id UUID,
  usuario_nombre TEXT,
  plato TEXT,
  servicio TEXT,
  raciones INTEGER,
  fecha DATE,
  notas TEXT,
  categoria TEXT,
  barquetas INTEGER,
  cantidad_calculada_g INTEGER,
  cantidad_producida_g INTEGER,
  distribucion_centros JSONB,
  grupo_produccion UUID,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_actor_id UUID;
  v_actor_rol TEXT;
BEGIN
  SELECT u.id, u.rol
  INTO v_actor_id, v_actor_rol
  FROM public.app_sessions s
  JOIN public.usuarios u ON u.id = s.user_id
  WHERE s.token_hash = p_token_hash
    AND s.expires_at > now()
    AND u.activo;

  IF v_actor_id IS NULL THEN RAISE EXCEPTION 'Sesión no válida'; END IF;

  RETURN QUERY
  SELECT
    r.id,
    r.usuario_id,
    COALESCE(u.nombre_completo, u.username),
    r.plato,
    r.servicio,
    r.raciones,
    r.fecha,
    r.notas,
    COALESCE(r.categoria, 'manual'),
    r.barquetas,
    r.cantidad_calculada_g,
    r.cantidad_producida_g,
    COALESCE(r.distribucion_centros, '[]'::JSONB),
    r.grupo_produccion,
    r.created_at,
    r.updated_at
  FROM public.registros r
  JOIN public.usuarios u ON u.id = r.usuario_id
  WHERE r.fecha = p_fecha
    AND r.deleted_at IS NULL
    AND (r.usuario_id = v_actor_id OR (v_actor_rol = 'admin' AND p_incluir_todos))
  ORDER BY r.created_at DESC, r.id;
END;
$$;

CREATE OR REPLACE FUNCTION public.cociner_registros_create_v2(
  p_token_hash TEXT,
  p_plato TEXT,
  p_servicio TEXT,
  p_raciones INTEGER,
  p_fecha DATE DEFAULT CURRENT_DATE,
  p_notas TEXT DEFAULT NULL,
  p_categoria TEXT DEFAULT 'manual',
  p_barquetas INTEGER DEFAULT NULL,
  p_cantidad_calculada_g INTEGER DEFAULT NULL,
  p_cantidad_producida_g INTEGER DEFAULT NULL,
  p_distribucion_centros JSONB DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_actor_id UUID;
  v_registro_id UUID;
BEGIN
  SELECT u.id INTO v_actor_id
  FROM public.app_sessions s
  JOIN public.usuarios u ON u.id = s.user_id
  WHERE s.token_hash = p_token_hash AND s.expires_at > now() AND u.activo;

  IF v_actor_id IS NULL THEN RAISE EXCEPTION 'Sesión no válida'; END IF;
  IF NULLIF(trim(p_plato), '') IS NULL THEN RAISE EXCEPTION 'El plato es obligatorio'; END IF;
  IF p_servicio NOT IN ('Almuerzo', 'Cena') THEN RAISE EXCEPTION 'Servicio no válido'; END IF;
  IF p_raciones IS NULL OR p_raciones < 1 THEN RAISE EXCEPTION 'Las raciones deben ser al menos 1'; END IF;
  IF p_fecha IS NULL OR p_fecha > CURRENT_DATE THEN RAISE EXCEPTION 'La fecha no puede ser futura'; END IF;
  IF p_barquetas IS NOT NULL AND p_barquetas < 0 THEN RAISE EXCEPTION 'Las barquetas no son válidas'; END IF;
  IF p_cantidad_calculada_g IS NOT NULL AND p_cantidad_calculada_g < 0 THEN RAISE EXCEPTION 'La cantidad calculada no es válida'; END IF;
  IF p_cantidad_producida_g IS NOT NULL AND p_cantidad_producida_g < 0 THEN RAISE EXCEPTION 'La cantidad producida no es válida'; END IF;
  IF p_distribucion_centros IS NOT NULL AND jsonb_typeof(p_distribucion_centros) <> 'array' THEN RAISE EXCEPTION 'La distribución no es válida'; END IF;

  INSERT INTO public.registros (
    usuario_id, plato, servicio, raciones, fecha, notas, categoria, barquetas,
    cantidad_calculada_g, cantidad_producida_g, distribucion_centros
  ) VALUES (
    v_actor_id, trim(p_plato), p_servicio, p_raciones, p_fecha,
    NULLIF(trim(p_notas), ''), COALESCE(NULLIF(trim(p_categoria), ''), 'manual'),
    COALESCE(p_barquetas, GREATEST(0, ROUND(p_raciones::NUMERIC / 10)::INTEGER)),
    p_cantidad_calculada_g, p_cantidad_producida_g, p_distribucion_centros
  ) RETURNING id INTO v_registro_id;

  RETURN v_registro_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.cociner_registros_create_batch(
  p_token_hash TEXT,
  p_fecha DATE,
  p_servicio TEXT,
  p_producciones JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_actor_id UUID;
  v_grupo UUID := gen_random_uuid();
  v_item JSONB;
  v_id UUID;
  v_ids JSONB := '[]'::JSONB;
  v_raciones INTEGER;
  v_barquetas INTEGER;
  v_calculada INTEGER;
  v_producida INTEGER;
  v_distribucion JSONB;
BEGIN
  SELECT u.id INTO v_actor_id
  FROM public.app_sessions s
  JOIN public.usuarios u ON u.id = s.user_id
  WHERE s.token_hash = p_token_hash AND s.expires_at > now() AND u.activo;

  IF v_actor_id IS NULL THEN RAISE EXCEPTION 'Sesión no válida'; END IF;
  IF p_fecha IS NULL OR p_fecha > CURRENT_DATE THEN RAISE EXCEPTION 'La fecha no puede ser futura'; END IF;
  IF p_servicio NOT IN ('Almuerzo', 'Cena') THEN RAISE EXCEPTION 'Servicio no válido'; END IF;
  IF jsonb_typeof(p_producciones) <> 'array' OR jsonb_array_length(p_producciones) NOT BETWEEN 1 AND 2 THEN
    RAISE EXCEPTION 'Debe haber una o dos guarniciones';
  END IF;

  FOR v_item IN SELECT value FROM jsonb_array_elements(p_producciones)
  LOOP
    IF NULLIF(trim(v_item->>'plato'), '') IS NULL THEN RAISE EXCEPTION 'El plato es obligatorio'; END IF;
    IF COALESCE(v_item->>'raciones', '') !~ '^[0-9]+$' THEN RAISE EXCEPTION 'Las raciones no son válidas'; END IF;
    IF COALESCE(v_item->>'barquetas', '') !~ '^[0-9]+$' THEN RAISE EXCEPTION 'Las barquetas no son válidas'; END IF;
    IF COALESCE(v_item->>'cantidad_calculada_g', '') !~ '^[0-9]+$' THEN RAISE EXCEPTION 'La cantidad calculada no es válida'; END IF;
    IF COALESCE(v_item->>'cantidad_producida_g', '') !~ '^[0-9]+$' THEN RAISE EXCEPTION 'La cantidad producida no es válida'; END IF;

    v_raciones := (v_item->>'raciones')::INTEGER;
    v_barquetas := (v_item->>'barquetas')::INTEGER;
    v_calculada := (v_item->>'cantidad_calculada_g')::INTEGER;
    v_producida := (v_item->>'cantidad_producida_g')::INTEGER;
    v_distribucion := COALESCE(v_item->'distribucion_centros', '[]'::JSONB);

    IF v_raciones < 1 OR v_calculada < 1 OR v_producida < 1 THEN RAISE EXCEPTION 'Las cantidades deben ser mayores que 0'; END IF;
    IF jsonb_typeof(v_distribucion) <> 'array' THEN RAISE EXCEPTION 'La distribución no es válida'; END IF;

    INSERT INTO public.registros (
      usuario_id, plato, servicio, raciones, fecha, notas, categoria, barquetas,
      cantidad_calculada_g, cantidad_producida_g, distribucion_centros, grupo_produccion
    ) VALUES (
      v_actor_id, trim(v_item->>'plato'), p_servicio, v_raciones, p_fecha,
      NULLIF(trim(v_item->>'notas'), ''), 'guarnicion', v_barquetas,
      v_calculada, v_producida, v_distribucion, v_grupo
    ) RETURNING id INTO v_id;

    v_ids := v_ids || jsonb_build_array(jsonb_build_object('id', v_id, 'client_id', v_item->>'client_id'));
  END LOOP;

  RETURN jsonb_build_object('grupo_produccion', v_grupo, 'registros', v_ids);
END;
$$;

CREATE OR REPLACE FUNCTION public.cociner_registros_update_v2(
  p_token_hash TEXT,
  p_registro_id UUID,
  p_plato TEXT,
  p_servicio TEXT,
  p_raciones INTEGER,
  p_fecha DATE,
  p_notas TEXT DEFAULT NULL,
  p_barquetas INTEGER DEFAULT NULL,
  p_cantidad_calculada_g INTEGER DEFAULT NULL,
  p_cantidad_producida_g INTEGER DEFAULT NULL,
  p_distribucion_centros JSONB DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_actor_id UUID;
BEGIN
  SELECT u.id INTO v_actor_id
  FROM public.app_sessions s
  JOIN public.usuarios u ON u.id = s.user_id
  WHERE s.token_hash = p_token_hash AND s.expires_at > now() AND u.activo AND u.rol = 'admin';

  IF v_actor_id IS NULL THEN RAISE EXCEPTION 'No autorizado'; END IF;
  IF NULLIF(trim(p_plato), '') IS NULL THEN RAISE EXCEPTION 'El plato es obligatorio'; END IF;
  IF p_servicio NOT IN ('Almuerzo', 'Cena') THEN RAISE EXCEPTION 'Servicio no válido'; END IF;
  IF p_raciones IS NULL OR p_raciones < 1 THEN RAISE EXCEPTION 'Las raciones deben ser al menos 1'; END IF;
  IF p_fecha IS NULL OR p_fecha > CURRENT_DATE THEN RAISE EXCEPTION 'La fecha no puede ser futura'; END IF;
  IF p_barquetas IS NOT NULL AND p_barquetas < 0 THEN RAISE EXCEPTION 'Las barquetas no son válidas'; END IF;
  IF p_cantidad_calculada_g IS NOT NULL AND p_cantidad_calculada_g < 0 THEN RAISE EXCEPTION 'La cantidad calculada no es válida'; END IF;
  IF p_cantidad_producida_g IS NOT NULL AND p_cantidad_producida_g < 0 THEN RAISE EXCEPTION 'La cantidad producida no es válida'; END IF;
  IF p_distribucion_centros IS NOT NULL AND jsonb_typeof(p_distribucion_centros) <> 'array' THEN RAISE EXCEPTION 'La distribución no es válida'; END IF;

  UPDATE public.registros
  SET plato = trim(p_plato),
      servicio = p_servicio,
      raciones = p_raciones,
      fecha = p_fecha,
      notas = NULLIF(trim(p_notas), ''),
      barquetas = COALESCE(p_barquetas, barquetas),
      cantidad_calculada_g = COALESCE(p_cantidad_calculada_g, cantidad_calculada_g),
      cantidad_producida_g = COALESCE(p_cantidad_producida_g, cantidad_producida_g),
      distribucion_centros = COALESCE(p_distribucion_centros, distribucion_centros),
      updated_at = now(),
      updated_by = v_actor_id
  WHERE id = p_registro_id AND deleted_at IS NULL;

  IF NOT FOUND THEN RAISE EXCEPTION 'Registro no encontrado'; END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.cociner_registros_list_v2(TEXT, DATE, BOOLEAN) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.cociner_registros_create_v2(TEXT, TEXT, TEXT, INTEGER, DATE, TEXT, TEXT, INTEGER, INTEGER, INTEGER, JSONB) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.cociner_registros_create_batch(TEXT, DATE, TEXT, JSONB) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.cociner_registros_update_v2(TEXT, UUID, TEXT, TEXT, INTEGER, DATE, TEXT, INTEGER, INTEGER, INTEGER, JSONB) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.cociner_registros_list_v2(TEXT, DATE, BOOLEAN) TO service_role;
GRANT EXECUTE ON FUNCTION public.cociner_registros_create_v2(TEXT, TEXT, TEXT, INTEGER, DATE, TEXT, TEXT, INTEGER, INTEGER, INTEGER, JSONB) TO service_role;
GRANT EXECUTE ON FUNCTION public.cociner_registros_create_batch(TEXT, DATE, TEXT, JSONB) TO service_role;
GRANT EXECUTE ON FUNCTION public.cociner_registros_update_v2(TEXT, UUID, TEXT, TEXT, INTEGER, DATE, TEXT, INTEGER, INTEGER, INTEGER, JSONB) TO service_role;

CREATE OR REPLACE FUNCTION public.obtener_dashboard(
  p_usuario_id UUID DEFAULT NULL,
  p_mes TEXT DEFAULT to_char(CURRENT_DATE, 'YYYY-MM'),
  p_categoria TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_raciones INTEGER;
  v_total_barquetas INTEGER;
  v_total_elaboraciones INTEGER;
  v_dias_con_registro INTEGER;
  v_media_diaria NUMERIC;
  v_media_barquetas_diaria NUMERIC;
  v_hechos_hoy INTEGER;
  v_barquetas_hoy INTEGER;
  v_top_platos JSON;
  v_ultimos_registros JSON;
BEGIN
  SELECT COALESCE(SUM(r.raciones), 0), COALESCE(SUM(r.barquetas), 0), COUNT(*), COUNT(DISTINCT r.fecha)
  INTO v_total_raciones, v_total_barquetas, v_total_elaboraciones, v_dias_con_registro
  FROM public.registros r
  WHERE r.deleted_at IS NULL
    AND (p_usuario_id IS NULL OR r.usuario_id = p_usuario_id)
    AND to_char(r.fecha, 'YYYY-MM') = p_mes
    AND (p_categoria IS NULL OR r.categoria = p_categoria);

  SELECT COUNT(*), COALESCE(SUM(r.barquetas), 0)
  INTO v_hechos_hoy, v_barquetas_hoy
  FROM public.registros r
  WHERE r.deleted_at IS NULL
    AND (p_usuario_id IS NULL OR r.usuario_id = p_usuario_id)
    AND r.fecha = CURRENT_DATE
    AND (p_categoria IS NULL OR r.categoria = p_categoria);

  v_media_diaria := CASE WHEN v_dias_con_registro > 0 THEN ROUND(v_total_raciones::NUMERIC / v_dias_con_registro) ELSE 0 END;
  v_media_barquetas_diaria := CASE WHEN v_dias_con_registro > 0 THEN ROUND(v_total_barquetas::NUMERIC / v_dias_con_registro) ELSE 0 END;

  SELECT JSON_AGG(sub ORDER BY sub.barquetas DESC) INTO v_top_platos
  FROM (
    SELECT r.plato, SUM(r.raciones)::INTEGER AS raciones, SUM(r.barquetas)::INTEGER AS barquetas
    FROM public.registros r
    WHERE r.deleted_at IS NULL
      AND (p_usuario_id IS NULL OR r.usuario_id = p_usuario_id)
      AND to_char(r.fecha, 'YYYY-MM') = p_mes
      AND (p_categoria IS NULL OR r.categoria = p_categoria)
    GROUP BY r.plato
    ORDER BY SUM(r.barquetas) DESC
    LIMIT 6
  ) sub;

  SELECT JSON_AGG(sub ORDER BY sub.created_at DESC) INTO v_ultimos_registros
  FROM (
    SELECT r.id, r.plato, r.raciones, r.barquetas, r.cantidad_calculada_g, r.cantidad_producida_g,
      r.distribucion_centros, r.servicio, r.categoria, r.fecha, r.created_at, u.nombre_completo AS chef
    FROM public.registros r
    LEFT JOIN public.usuarios u ON u.id = r.usuario_id
    WHERE r.deleted_at IS NULL
      AND (p_usuario_id IS NULL OR r.usuario_id = p_usuario_id)
      AND to_char(r.fecha, 'YYYY-MM') = p_mes
      AND (p_categoria IS NULL OR r.categoria = p_categoria)
    ORDER BY r.created_at DESC
    LIMIT 8
  ) sub;

  RETURN JSON_BUILD_OBJECT(
    'total_raciones', v_total_raciones,
    'total_barquetas', v_total_barquetas,
    'total_elaboraciones', v_total_elaboraciones,
    'dias_con_registro', v_dias_con_registro,
    'media_diaria', v_media_diaria,
    'media_barquetas_diaria', v_media_barquetas_diaria,
    'hechos_hoy', v_hechos_hoy,
    'barquetas_hoy', v_barquetas_hoy,
    'top_platos', COALESCE(v_top_platos, '[]'::JSON),
    'ultimos_registros', COALESCE(v_ultimos_registros, '[]'::JSON)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.obtener_produccion_por_dia(
  p_desde DATE,
  p_hasta DATE,
  p_usuario_id UUID DEFAULT NULL,
  p_categoria TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_result JSON;
BEGIN
  SELECT JSON_AGG(sub ORDER BY sub.fecha) INTO v_result
  FROM (
    SELECT r.fecha, SUM(r.raciones)::INTEGER AS total_raciones, SUM(r.barquetas)::INTEGER AS total_barquetas
    FROM public.registros r
    WHERE r.deleted_at IS NULL
      AND (p_usuario_id IS NULL OR r.usuario_id = p_usuario_id)
      AND r.fecha BETWEEN p_desde AND p_hasta
      AND (p_categoria IS NULL OR r.categoria = p_categoria)
    GROUP BY r.fecha
  ) sub;
  RETURN COALESCE(v_result, '[]'::JSON);
END;
$$;

CREATE OR REPLACE FUNCTION public.obtener_produccion_por_semana(
  p_mes TEXT,
  p_usuario_id UUID DEFAULT NULL,
  p_categoria TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_result JSON;
BEGIN
  SELECT JSON_AGG(sub ORDER BY sub.semana) INTO v_result
  FROM (
    SELECT EXTRACT(WEEK FROM r.fecha)::INTEGER AS semana,
      SUM(r.raciones)::INTEGER AS total_raciones,
      SUM(r.barquetas)::INTEGER AS total_barquetas
    FROM public.registros r
    WHERE r.deleted_at IS NULL
      AND (p_usuario_id IS NULL OR r.usuario_id = p_usuario_id)
      AND to_char(r.fecha, 'YYYY-MM') = p_mes
      AND (p_categoria IS NULL OR r.categoria = p_categoria)
    GROUP BY EXTRACT(WEEK FROM r.fecha)
  ) sub;
  RETURN COALESCE(v_result, '[]'::JSON);
END;
$$;
