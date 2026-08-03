-- ══════════════════════════════════════════════════════════
-- CocinerHosp — Fase 9: Recetas + Registro rápido
-- Pegar TODO en el SQL Editor de Supabase Dashboard
-- ══════════════════════════════════════════════════════════

-- 1. Tabla recetas
CREATE TABLE IF NOT EXISTS public.recetas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  servicio TEXT,
  raciones_base INTEGER NOT NULL DEFAULT 12,
  temperatura TEXT,
  tiempo TEXT,
  notas TEXT,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.recetas ENABLE ROW LEVEL SECURITY;

-- 2. Tabla receta_ingredientes
CREATE TABLE IF NOT EXISTS public.receta_ingredientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  receta_id UUID REFERENCES public.recetas(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  cantidad NUMERIC NOT NULL,
  unidad TEXT NOT NULL,
  peso_bolsa_kg NUMERIC CHECK (peso_bolsa_kg IS NULL OR peso_bolsa_kg > 0),
  orden INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.receta_ingredientes ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.receta_ingredientes
ADD COLUMN IF NOT EXISTS peso_bolsa_kg NUMERIC
CHECK (peso_bolsa_kg IS NULL OR peso_bolsa_kg > 0);

-- ══════════════════════════════════════════════════════════
-- RPCs — Recetas
-- ══════════════════════════════════════════════════════════

-- 3. listar_recetas() — todas las activas con ingredientes como JSON
CREATE OR REPLACE FUNCTION public.listar_recetas()
RETURNS TABLE(
  id UUID,
  nombre TEXT,
  servicio TEXT,
  raciones_base INTEGER,
  temperatura TEXT,
  tiempo TEXT,
  notas TEXT,
  ingredientes JSON,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    r.id,
    r.nombre,
    r.servicio,
    r.raciones_base,
    r.temperatura,
    r.tiempo,
    r.notas,
    COALESCE(
      (SELECT json_agg(json_build_object(
        'id', ri.id,
        'nombre', ri.nombre,
        'cantidad', ri.cantidad,
        'unidad', ri.unidad,
        'peso_bolsa_kg', ri.peso_bolsa_kg,
        'orden', ri.orden
      ) ORDER BY ri.orden)
      FROM public.receta_ingredientes ri
      WHERE ri.receta_id = r.id),
      '[]'::json
    ) AS ingredientes,
    r.created_at
  FROM public.recetas r
  WHERE r.activo = true
  ORDER BY r.nombre;
END;
$$;

-- 4. obtener_receta(p_receta_id) — una receta con ingredientes
CREATE OR REPLACE FUNCTION public.obtener_receta(p_receta_id UUID)
RETURNS TABLE(
  id UUID,
  nombre TEXT,
  servicio TEXT,
  raciones_base INTEGER,
  temperatura TEXT,
  tiempo TEXT,
  notas TEXT,
  ingredientes JSON,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    r.id,
    r.nombre,
    r.servicio,
    r.raciones_base,
    r.temperatura,
    r.tiempo,
    r.notas,
    COALESCE(
      (SELECT json_agg(json_build_object(
        'id', ri.id,
        'nombre', ri.nombre,
        'cantidad', ri.cantidad,
        'unidad', ri.unidad,
        'peso_bolsa_kg', ri.peso_bolsa_kg,
        'orden', ri.orden
      ) ORDER BY ri.orden)
      FROM public.receta_ingredientes ri
      WHERE ri.receta_id = r.id),
      '[]'::json
    ) AS ingredientes,
    r.created_at
  FROM public.recetas r
  WHERE r.id = p_receta_id AND r.activo = true;
END;
$$;

-- 5. crear_receta(p_nombre, ...) — solo admin/chef_jefe
CREATE OR REPLACE FUNCTION public.crear_receta(
  p_nombre TEXT,
  p_servicio TEXT DEFAULT NULL,
  p_raciones_base INTEGER DEFAULT 12,
  p_temperatura TEXT DEFAULT NULL,
  p_tiempo TEXT DEFAULT NULL,
  p_notas TEXT DEFAULT NULL,
  p_ingredientes JSON DEFAULT '[]'::json,
  p_usuario_rol TEXT DEFAULT 'chef'
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_receta_id UUID;
  v_resultado JSON;
BEGIN
  IF p_usuario_rol NOT IN ('admin', 'chef_jefe') THEN
    RAISE EXCEPTION 'No tenés permisos para crear recetas';
  END IF;

  INSERT INTO public.recetas (nombre, servicio, raciones_base, temperatura, tiempo, notas)
  VALUES (p_nombre, p_servicio, p_raciones_base, p_temperatura, p_tiempo, p_notas)
  RETURNING id INTO v_receta_id;

  INSERT INTO public.receta_ingredientes (receta_id, nombre, cantidad, unidad, peso_bolsa_kg, orden)
  SELECT v_receta_id, x.nombre, x.cantidad, x.unidad, x.peso_bolsa_kg, x.orden
  FROM json_to_recordset(p_ingredientes) AS x(nombre TEXT, cantidad NUMERIC, unidad TEXT, peso_bolsa_kg NUMERIC, orden INT);

  SELECT row_to_json(r) INTO v_resultado
  FROM (SELECT * FROM public.obtener_receta(v_receta_id)) r;

  RETURN v_resultado;
END;
$$;

-- 6. editar_receta(p_receta_id, ...) — solo admin/chef_jefe
CREATE OR REPLACE FUNCTION public.editar_receta(
  p_receta_id UUID,
  p_nombre TEXT,
  p_servicio TEXT DEFAULT NULL,
  p_raciones_base INTEGER DEFAULT 12,
  p_temperatura TEXT DEFAULT NULL,
  p_tiempo TEXT DEFAULT NULL,
  p_notas TEXT DEFAULT NULL,
  p_ingredientes JSON DEFAULT '[]'::json,
  p_usuario_rol TEXT DEFAULT 'chef'
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_resultado JSON;
BEGIN
  IF p_usuario_rol NOT IN ('admin', 'chef_jefe') THEN
    RAISE EXCEPTION 'No tenés permisos para editar recetas';
  END IF;

  UPDATE public.recetas
  SET nombre = p_nombre,
      servicio = p_servicio,
      raciones_base = p_raciones_base,
      temperatura = p_temperatura,
      tiempo = p_tiempo,
      notas = p_notas,
      updated_at = now()
  WHERE id = p_receta_id;

  DELETE FROM public.receta_ingredientes WHERE receta_id = p_receta_id;

  INSERT INTO public.receta_ingredientes (receta_id, nombre, cantidad, unidad, peso_bolsa_kg, orden)
  SELECT p_receta_id, x.nombre, x.cantidad, x.unidad, x.peso_bolsa_kg, x.orden
  FROM json_to_recordset(p_ingredientes) AS x(nombre TEXT, cantidad NUMERIC, unidad TEXT, peso_bolsa_kg NUMERIC, orden INT);

  SELECT row_to_json(r) INTO v_resultado
  FROM (SELECT * FROM public.obtener_receta(p_receta_id)) r;

  RETURN v_resultado;
END;
$$;

-- 7. eliminar_receta(p_receta_id) — soft delete, solo admin/chef_jefe
CREATE OR REPLACE FUNCTION public.eliminar_receta(
  p_receta_id UUID,
  p_usuario_rol TEXT DEFAULT 'chef'
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_usuario_rol NOT IN ('admin', 'chef_jefe') THEN
    RAISE EXCEPTION 'No tenés permisos para eliminar recetas';
  END IF;

  UPDATE public.recetas
  SET activo = false, updated_at = now()
  WHERE id = p_receta_id;

  RETURN FOUND;
END;
$$;

-- 8. Receta de ejemplo: Quiché (opcional — comentar si no se desea)
-- INSERT INTO public.recetas (nombre, servicio, raciones_base, temperatura, tiempo, notas)
-- VALUES ('Quiché', NULL, 12, '160-170°C', '35-45 min', 'Huevo batido + queso + jamón. Verter en moldes individuales.');
-- 
-- INSERT INTO public.receta_ingredientes (receta_id, nombre, cantidad, unidad, orden)
-- VALUES
--   ((SELECT id FROM public.recetas WHERE nombre = 'Quiché'), 'Huevo líquido', 12, 'unidades', 1),
--   ((SELECT id FROM public.recetas WHERE nombre = 'Quiché'), 'Queso rallado', 400, 'g', 2),
--   ((SELECT id FROM public.recetas WHERE nombre = 'Quiché'), 'Jamón picado', 300, 'g', 3),
--   ((SELECT id FROM public.recetas WHERE nombre = 'Quiché'), 'Sal', 5, 'g', 4);
