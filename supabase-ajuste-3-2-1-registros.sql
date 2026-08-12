-- CocinerHosp — Ajuste 3.2.1: fechas anteriores y administración de registros.
-- Archivo local. No aplicar hasta coordinar el despliegue de cociner-registros.

ALTER TABLE public.registros
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES public.usuarios(id),
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES public.usuarios(id);

CREATE INDEX IF NOT EXISTS idx_registros_usuario_id
  ON public.registros (usuario_id);

CREATE INDEX IF NOT EXISTS idx_registros_updated_by
  ON public.registros (updated_by)
  WHERE updated_by IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_registros_deleted_by
  ON public.registros (deleted_by)
  WHERE deleted_by IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_registros_activos_fecha
  ON public.registros (fecha, created_at DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_registros_activos_usuario_fecha
  ON public.registros (usuario_id, fecha, created_at DESC)
  WHERE deleted_at IS NULL;

-- La sesión opaca existente identifica al actor. Solo un admin puede editar o borrar.
CREATE OR REPLACE FUNCTION public.cociner_registros_list(
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

  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION 'Sesión no válida';
  END IF;

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
    r.created_at,
    r.updated_at
  FROM public.registros r
  JOIN public.usuarios u ON u.id = r.usuario_id
  WHERE r.fecha = p_fecha
    AND r.deleted_at IS NULL
    AND (
      r.usuario_id = v_actor_id
      OR (v_actor_rol = 'admin' AND p_incluir_todos)
    )
  ORDER BY r.created_at DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.cociner_registros_create(
  p_token_hash TEXT,
  p_plato TEXT,
  p_servicio TEXT,
  p_raciones INTEGER,
  p_fecha DATE DEFAULT CURRENT_DATE,
  p_notas TEXT DEFAULT NULL,
  p_categoria TEXT DEFAULT 'manual'
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
  SELECT u.id
  INTO v_actor_id
  FROM public.app_sessions s
  JOIN public.usuarios u ON u.id = s.user_id
  WHERE s.token_hash = p_token_hash
    AND s.expires_at > now()
    AND u.activo;

  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION 'Sesión no válida';
  END IF;
  IF NULLIF(trim(p_plato), '') IS NULL THEN
    RAISE EXCEPTION 'El plato es obligatorio';
  END IF;
  IF p_servicio NOT IN ('Almuerzo', 'Cena') THEN
    RAISE EXCEPTION 'Servicio no válido';
  END IF;
  IF p_raciones IS NULL OR p_raciones < 1 THEN
    RAISE EXCEPTION 'Las raciones deben ser al menos 1';
  END IF;
  IF p_fecha IS NULL OR p_fecha > CURRENT_DATE THEN
    RAISE EXCEPTION 'La fecha no puede ser futura';
  END IF;

  INSERT INTO public.registros (
    usuario_id,
    plato,
    servicio,
    raciones,
    fecha,
    notas,
    categoria
  )
  VALUES (
    v_actor_id,
    trim(p_plato),
    p_servicio,
    p_raciones,
    p_fecha,
    NULLIF(trim(p_notas), ''),
    COALESCE(NULLIF(trim(p_categoria), ''), 'manual')
  )
  RETURNING id INTO v_registro_id;

  RETURN v_registro_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.cociner_registros_update(
  p_token_hash TEXT,
  p_registro_id UUID,
  p_plato TEXT,
  p_servicio TEXT,
  p_raciones INTEGER,
  p_fecha DATE,
  p_notas TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_actor_id UUID;
BEGIN
  SELECT u.id
  INTO v_actor_id
  FROM public.app_sessions s
  JOIN public.usuarios u ON u.id = s.user_id
  WHERE s.token_hash = p_token_hash
    AND s.expires_at > now()
    AND u.activo
    AND u.rol = 'admin';

  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;
  IF NULLIF(trim(p_plato), '') IS NULL THEN
    RAISE EXCEPTION 'El plato es obligatorio';
  END IF;
  IF p_servicio NOT IN ('Almuerzo', 'Cena') THEN
    RAISE EXCEPTION 'Servicio no válido';
  END IF;
  IF p_raciones IS NULL OR p_raciones < 1 THEN
    RAISE EXCEPTION 'Las raciones deben ser al menos 1';
  END IF;
  IF p_fecha IS NULL OR p_fecha > CURRENT_DATE THEN
    RAISE EXCEPTION 'La fecha no puede ser futura';
  END IF;

  UPDATE public.registros
  SET plato = trim(p_plato),
      servicio = p_servicio,
      raciones = p_raciones,
      fecha = p_fecha,
      notas = NULLIF(trim(p_notas), ''),
      updated_at = now(),
      updated_by = v_actor_id
  WHERE id = p_registro_id
    AND deleted_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Registro no encontrado';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.cociner_registros_delete(
  p_token_hash TEXT,
  p_registro_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_actor_id UUID;
BEGIN
  SELECT u.id
  INTO v_actor_id
  FROM public.app_sessions s
  JOIN public.usuarios u ON u.id = s.user_id
  WHERE s.token_hash = p_token_hash
    AND s.expires_at > now()
    AND u.activo
    AND u.rol = 'admin';

  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  UPDATE public.registros
  SET deleted_at = now(),
      deleted_by = v_actor_id
  WHERE id = p_registro_id
    AND deleted_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Registro no encontrado';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.cociner_registros_list(TEXT, DATE, BOOLEAN) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.cociner_registros_create(TEXT, TEXT, TEXT, INTEGER, DATE, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.cociner_registros_update(TEXT, UUID, TEXT, TEXT, INTEGER, DATE, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.cociner_registros_delete(TEXT, UUID) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.cociner_registros_list(TEXT, DATE, BOOLEAN) TO service_role;
GRANT EXECUTE ON FUNCTION public.cociner_registros_create(TEXT, TEXT, TEXT, INTEGER, DATE, TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.cociner_registros_update(TEXT, UUID, TEXT, TEXT, INTEGER, DATE, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.cociner_registros_delete(TEXT, UUID) TO service_role;

-- Las consultas existentes conservan su firma y comportamiento, excluyendo bajas lógicas.
CREATE OR REPLACE FUNCTION public.obtener_registros_hoy(p_usuario_id UUID)
RETURNS SETOF public.registros
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT r.*
  FROM public.registros r
  WHERE r.usuario_id = p_usuario_id
    AND r.fecha = CURRENT_DATE
    AND r.deleted_at IS NULL
  ORDER BY r.created_at DESC;
END;
$$;

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
  v_total_elaboraciones INTEGER;
  v_dias_con_registro INTEGER;
  v_media_diaria NUMERIC;
  v_hechos_hoy INTEGER;
  v_top_platos JSON;
  v_ultimos_registros JSON;
BEGIN
  SELECT
    COALESCE(SUM(r.raciones), 0),
    COUNT(*),
    COUNT(DISTINCT r.fecha)
  INTO v_total_raciones, v_total_elaboraciones, v_dias_con_registro
  FROM public.registros r
  WHERE r.deleted_at IS NULL
    AND (p_usuario_id IS NULL OR r.usuario_id = p_usuario_id)
    AND to_char(r.fecha, 'YYYY-MM') = p_mes
    AND (p_categoria IS NULL OR r.categoria = p_categoria);

  SELECT COUNT(*)
  INTO v_hechos_hoy
  FROM public.registros r
  WHERE r.deleted_at IS NULL
    AND (p_usuario_id IS NULL OR r.usuario_id = p_usuario_id)
    AND r.fecha = CURRENT_DATE
    AND (p_categoria IS NULL OR r.categoria = p_categoria);

  v_media_diaria := CASE
    WHEN v_dias_con_registro > 0
    THEN ROUND(v_total_raciones::NUMERIC / v_dias_con_registro)
    ELSE 0
  END;

  SELECT JSON_AGG(sub ORDER BY sub.raciones DESC)
  INTO v_top_platos
  FROM (
    SELECT r.plato, SUM(r.raciones) AS raciones
    FROM public.registros r
    WHERE r.deleted_at IS NULL
      AND (p_usuario_id IS NULL OR r.usuario_id = p_usuario_id)
      AND to_char(r.fecha, 'YYYY-MM') = p_mes
      AND (p_categoria IS NULL OR r.categoria = p_categoria)
    GROUP BY r.plato
    ORDER BY SUM(r.raciones) DESC
    LIMIT 6
  ) sub;

  SELECT JSON_AGG(sub ORDER BY sub.created_at DESC)
  INTO v_ultimos_registros
  FROM (
    SELECT
      r.id,
      r.plato,
      r.raciones,
      r.servicio,
      r.categoria,
      r.fecha,
      r.created_at,
      u.nombre_completo AS chef
    FROM public.registros r
    LEFT JOIN public.usuarios u ON u.id = r.usuario_id
    WHERE r.deleted_at IS NULL
      AND (p_usuario_id IS NULL OR r.usuario_id = p_usuario_id)
      AND (p_categoria IS NULL OR r.categoria = p_categoria)
    ORDER BY r.created_at DESC
    LIMIT 8
  ) sub;

  RETURN JSON_BUILD_OBJECT(
    'total_raciones', v_total_raciones,
    'total_elaboraciones', v_total_elaboraciones,
    'dias_con_registro', v_dias_con_registro,
    'media_diaria', v_media_diaria,
    'hechos_hoy', v_hechos_hoy,
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
DECLARE
  v_result JSON;
BEGIN
  SELECT JSON_AGG(sub ORDER BY sub.fecha)
  INTO v_result
  FROM (
    SELECT r.fecha, SUM(r.raciones)::INTEGER AS total_raciones
    FROM public.registros r
    WHERE r.deleted_at IS NULL
      AND (p_usuario_id IS NULL OR r.usuario_id = p_usuario_id)
      AND r.fecha >= p_desde
      AND r.fecha <= p_hasta
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
DECLARE
  v_result JSON;
BEGIN
  SELECT JSON_AGG(sub ORDER BY sub.semana)
  INTO v_result
  FROM (
    SELECT
      EXTRACT(WEEK FROM r.fecha)::INTEGER AS semana,
      SUM(r.raciones)::INTEGER AS total_raciones
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
