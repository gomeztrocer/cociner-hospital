-- Recetas transcritas de "Recetas San Juan de Dios.pdf".
-- El bloque es idempotente: actualiza estas tres recetas por nombre y reemplaza sus ingredientes.

DO $$
DECLARE
  v_receta_id UUID;
BEGIN
  SELECT id INTO v_receta_id
  FROM public.recetas
  WHERE nombre = 'Papas guisadas RSJD'
  ORDER BY created_at
  LIMIT 1;

  IF v_receta_id IS NULL THEN
    INSERT INTO public.recetas (nombre, servicio, raciones_base, temperatura, tiempo, notas)
    VALUES (
      'Papas guisadas RSJD', NULL, 450, NULL, NULL,
      'Código 120620. Hoja de producción del Hospital San Juan de Dios Tenerife, 14/06/2026. Peso bruto estimado: 151 g por ración. Repartir según centro en mono o multiporción.'
    )
    RETURNING id INTO v_receta_id;
  ELSE
    UPDATE public.recetas
    SET servicio = NULL,
        raciones_base = 450,
        temperatura = NULL,
        tiempo = NULL,
        notas = 'Código 120620. Hoja de producción del Hospital San Juan de Dios Tenerife, 14/06/2026. Peso bruto estimado: 151 g por ración. Repartir según centro en mono o multiporción.',
        activo = true,
        updated_at = now()
    WHERE id = v_receta_id;
  END IF;

  DELETE FROM public.receta_ingredientes WHERE receta_id = v_receta_id;
  INSERT INTO public.receta_ingredientes (receta_id, nombre, cantidad, unidad, orden) VALUES
    (v_receta_id, 'Patata parisina Tababa-Sun', 67.5, 'kg', 0),
    (v_receta_id, 'Sal fina de mesa 1 kg Emicela', 0.45, 'kg', 1);

  v_receta_id := NULL;
  SELECT id INTO v_receta_id
  FROM public.recetas
  WHERE nombre = 'Molido de pollo'
  ORDER BY created_at
  LIMIT 1;

  IF v_receta_id IS NULL THEN
    INSERT INTO public.recetas (nombre, servicio, raciones_base, temperatura, tiempo, notas)
    VALUES (
      'Molido de pollo', NULL, 100, NULL, NULL,
      'Código 195528. Cocinar al vapor todos los ingredientes, añadir especias y sal, triturar y texturizar hasta que esté bien molido. Alérgeno indicado: dióxido de azufre y sulfitos. Repartir según centro en mono o multiporción.'
    )
    RETURNING id INTO v_receta_id;
  ELSE
    UPDATE public.recetas
    SET servicio = NULL,
        raciones_base = 100,
        temperatura = NULL,
        tiempo = NULL,
        notas = 'Código 195528. Cocinar al vapor todos los ingredientes, añadir especias y sal, triturar y texturizar hasta que esté bien molido. Alérgeno indicado: dióxido de azufre y sulfitos. Repartir según centro en mono o multiporción.',
        activo = true,
        updated_at = now()
    WHERE id = v_receta_id;
  END IF;

  DELETE FROM public.receta_ingredientes WHERE receta_id = v_receta_id;
  INSERT INTO public.receta_ingredientes (receta_id, nombre, cantidad, unidad, orden) VALUES
    (v_receta_id, 'Aceite girasol PET 5 L Hiperdino', 100, 'g', 0),
    (v_receta_id, 'Pollo muslo s/h s/p interfoliado Levida', 15000, 'g', 1),
    (v_receta_id, 'Puerro rodaja 9 mm Fruveco', 1000, 'g', 2),
    (v_receta_id, 'Cebolla 75+ mm', 2000, 'g', 3),
    (v_receta_id, 'Zanahoria 25/35 mm', 1000, 'g', 4),
    (v_receta_id, 'Puré deshidratado patata 12,5 kg Aviko', 250, 'g', 5),
    (v_receta_id, 'Calabaza dado 10x10 cm Fruveco', 1000, 'g', 6),
    (v_receta_id, 'Pimiento rojo', 1000, 'g', 7),
    (v_receta_id, 'Sal fina de mesa 1 kg Emicela', 100, 'g', 8),
    (v_receta_id, 'Pimentón dulce bote PET dosif. 810 g Muñoz y Pujante', 100, 'g', 9),
    (v_receta_id, 'Ajo granel', 100, 'g', 10),
    (v_receta_id, 'Perejil manojo 500 g', 100, 'g', 11);

  v_receta_id := NULL;
  SELECT id INTO v_receta_id
  FROM public.recetas
  WHERE nombre = 'Molido de cerdo SJDD'
  ORDER BY created_at
  LIMIT 1;

  IF v_receta_id IS NULL THEN
    INSERT INTO public.recetas (nombre, servicio, raciones_base, temperatura, tiempo, notas)
    VALUES (
      'Molido de cerdo SJDD', NULL, 100, NULL, NULL,
      'Código 195693. La ficha no contiene datos de elaboración. Alérgeno indicado: dióxido de azufre y sulfitos. Repartir según centro en mono o multiporción.'
    )
    RETURNING id INTO v_receta_id;
  ELSE
    UPDATE public.recetas
    SET servicio = NULL,
        raciones_base = 100,
        temperatura = NULL,
        tiempo = NULL,
        notas = 'Código 195693. La ficha no contiene datos de elaboración. Alérgeno indicado: dióxido de azufre y sulfitos. Repartir según centro en mono o multiporción.',
        activo = true,
        updated_at = now()
    WHERE id = v_receta_id;
  END IF;

  DELETE FROM public.receta_ingredientes WHERE receta_id = v_receta_id;
  INSERT INTO public.receta_ingredientes (receta_id, nombre, cantidad, unidad, orden) VALUES
    (v_receta_id, 'Cerdo cinta lomo natural', 15000, 'g', 0),
    (v_receta_id, 'Aceite girasol PET 5 L Hiperdino', 50, 'g', 1),
    (v_receta_id, 'Cebolla 75+ mm', 2000, 'g', 2),
    (v_receta_id, 'Zanahoria 25/35 mm', 2500, 'g', 3),
    (v_receta_id, 'Puré deshidratado patata 12,5 kg Aviko', 300, 'g', 4),
    (v_receta_id, 'Ajo granel', 100, 'g', 5),
    (v_receta_id, 'Repollo liso', 2000, 'g', 6),
    (v_receta_id, 'Pimiento verde', 1000, 'g', 7),
    (v_receta_id, 'Perejil manojo 500 g', 50, 'g', 8),
    (v_receta_id, 'Tomillo manojo 100 g', 50, 'g', 9),
    (v_receta_id, 'Pimentón dulce bote PET dosif. 810 g Muñoz y Pujante', 100, 'g', 10),
    (v_receta_id, 'Sal fina de mesa 1 kg Emicela', 100, 'g', 11);
END $$;
