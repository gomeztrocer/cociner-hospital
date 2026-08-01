-- ══════════════════════════════════════════════════════════
-- CocinerHosp — Fase 11: RPCs para gráficos Dashboard
-- Pegar TODO en el SQL Editor de Supabase Dashboard
-- ══════════════════════════════════════════════════════════

-- 1. Producción por día (para gráfico semanal)
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
    WHERE (p_usuario_id IS NULL OR r.usuario_id = p_usuario_id)
      AND r.fecha >= p_desde
      AND r.fecha <= p_hasta
      AND (p_categoria IS NULL OR r.categoria = p_categoria)
    GROUP BY r.fecha
  ) sub;

  RETURN COALESCE(v_result, '[]'::JSON);
END;
$$;

-- 2. Producción por semana (para gráfico mensual)
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
    WHERE (p_usuario_id IS NULL OR r.usuario_id = p_usuario_id)
      AND to_char(r.fecha, 'YYYY-MM') = p_mes
      AND (p_categoria IS NULL OR r.categoria = p_categoria)
    GROUP BY EXTRACT(WEEK FROM r.fecha)
  ) sub;

  RETURN COALESCE(v_result, '[]'::JSON);
END;
$$;
