// ── Dietas Blandas — Recetas Escalables ──
// Cada receta tiene ingredientes base para X barquetas de referencia
// La calculadora escala linealmente según las barquetas que el usuario necesite

export interface IngredienteReceta {
  nombre: string
  cantidadBase: number   // cantidad para barquetasBase
  unidad: string         // 'bolsas', 'kg', 'g', 'unidades'
  nota?: string          // info extra (ej: "2.5 kg/bolsa")
}

export interface RecetaBlando {
  id: string
  nombre: string
  seccion: 'chinos' | 'molido' | 'pure'
  subtipo?: string
  ingredientes: IngredienteReceta[]
  barquetasBase: number
}

export interface ResultadoBlando {
  recetaId: string
  barquetas: number
  ingredientes: IngredienteReceta[]
  totalKg: number
  observaciones: string[]
}

export interface PedidoPapaPorCajas {
  bolsasNecesarias: number
  cajasNecesarias: number
  bolsasDisponibles: number
  bolsasSobrantes: number
}

export const KG_POR_BOLSA_PAPA = 2.5
export const BOLSAS_POR_CAJA_PAPA = 4

export function calcularPedidoPapaPorCajas(bolsasNecesarias: number): PedidoPapaPorCajas {
  const necesarias = Math.max(0, Math.round(bolsasNecesarias * 100) / 100)
  const cajasNecesarias = Math.ceil(necesarias / BOLSAS_POR_CAJA_PAPA)
  const bolsasDisponibles = cajasNecesarias * BOLSAS_POR_CAJA_PAPA
  return {
    bolsasNecesarias: necesarias,
    cajasNecesarias,
    bolsasDisponibles,
    bolsasSobrantes: Math.round((bolsasDisponibles - necesarias) * 100) / 100,
  }
}

// ── CHINOS — 1 gastro = 6 barquetas ──
// Cada chino se prepara por separado: papas + verdura + cebolla

export const CHINOS_RECETAS: RecetaBlando[] = [
  {
    id: 'chino-zanahoria',
    nombre: 'Chino Zanahoria',
    seccion: 'chinos',
    subtipo: 'Zanahoria',
    barquetasBase: 6, // 1 gastro
    ingredientes: [
      { nombre: 'Papas congeladas', cantidadBase: 2, unidad: 'bolsas', nota: '2.5 kg/bolsa' },
      { nombre: 'Zanahoria congelada', cantidadBase: 2, unidad: 'bolsas', nota: '2.5 kg/bolsa' },
      { nombre: 'Cebolla', cantidadBase: 5, unidad: 'unidades' },
    ],
  },
  {
    id: 'chino-calabaza',
    nombre: 'Chino Calabaza',
    seccion: 'chinos',
    subtipo: 'Calabaza',
    barquetasBase: 6,
    ingredientes: [
      { nombre: 'Papas congeladas', cantidadBase: 2, unidad: 'bolsas', nota: '2.5 kg/bolsa' },
      { nombre: 'Calabaza congelada', cantidadBase: 2, unidad: 'bolsas', nota: '2.5 kg/bolsa' },
      { nombre: 'Cebolla', cantidadBase: 5, unidad: 'unidades' },
    ],
  },
  {
    id: 'chino-calabacin',
    nombre: 'Chino Calabacín',
    seccion: 'chinos',
    subtipo: 'Calabacín',
    barquetasBase: 6,
    ingredientes: [
      { nombre: 'Papas congeladas', cantidadBase: 2, unidad: 'bolsas', nota: '2.5 kg/bolsa' },
      { nombre: 'Calabacín congelado', cantidadBase: 2, unidad: 'bolsas', nota: '2.5 kg/bolsa' },
      { nombre: 'Cebolla', cantidadBase: 5, unidad: 'unidades' },
    ],
  },
]

export const CHINOS_BARQUETAS = 22
export const CHINOS_KG_BARQUETA = 3
export const CHINOS_TOTAL_KG = 66

// ── MOLIDO — base 20 barquetas ──

export const MOLIDO_RECETAS: RecetaBlando[] = [
  {
    id: 'molido',
    nombre: 'Molido',
    seccion: 'molido',
    barquetasBase: 20,
    ingredientes: [
      { nombre: 'Calabacín congelado', cantidadBase: 2, unidad: 'bolsas', nota: '2.5 kg/bolsa' },
      { nombre: 'Zanahoria congelada', cantidadBase: 1, unidad: 'bolsas', nota: '2.5 kg/bolsa' },
      { nombre: 'Cebolla fresca', cantidadBase: 1000, unidad: 'g' },
      { nombre: 'Pimiento fresco', cantidadBase: 1000, unidad: 'g' },
      { nombre: 'Ajo', cantidadBase: 100, unidad: 'g' },
      { nombre: 'Cilantro', cantidadBase: 50, unidad: 'g' },
      { nombre: 'Fécula de maíz', cantidadBase: 400, unidad: 'g' },
      { nombre: 'Agua/caldo', cantidadBase: 60000, unidad: 'g' },
    ],
  },
]

export const MOLIDO_PROTEINA = [
  { tipo: 'Pollo', kgBruto: 8.6 },
  { tipo: 'Cerdo', kgBruto: 7.3 },
]

export const MOLIDO_BARQUETAS = 20
export const MOLIDO_KG_BARQUETA = 3
export const MOLIDO_TOTAL_KG = 60

// ── PURÉ DE PAPAS — 1.5 bolsas por barqueta (15 para 10, 30 para 20) ──

export const PURE_RECETAS: RecetaBlando[] = [
  {
    id: 'pure',
    nombre: 'Puré de papas',
    seccion: 'pure',
    barquetasBase: 2,
    ingredientes: [
      { nombre: 'Papas congeladas', cantidadBase: 3, unidad: 'bolsas', nota: '2.5 kg/bolsa' },
    ],
  },
]

export const PURE_MERMA_P = 15
export const PURE_BARQUETAS = 22
export const PURE_KG_BARQUETA = 3
export const PURE_TOTAL_KG = 66

// ── Helper: escalar receta ──

export function escalarReceta(
  receta: RecetaBlando,
  barquetasDeseadas: number,
): ResultadoBlando {
  const factor = barquetasDeseadas / receta.barquetasBase
  const ingredientes = receta.ingredientes.map((ing) => ({
    ...ing,
    cantidadBase: Math.round(ing.cantidadBase * factor * 100) / 100,
  }))

  const observaciones: string[] = []
  let totalKg = 0

  for (const ing of ingredientes) {
    if (ing.nota?.includes('kg/bolsa')) {
      const kgPorBolsa = parseFloat(ing.nota.match(/([\d.]+)\s*kg\/bolsa/)?.[1] ?? '0')
      totalKg += ing.cantidadBase * kgPorBolsa
    } else if (ing.unidad === 'g' && ing.cantidadBase >= 1000) {
      totalKg += ing.cantidadBase / 1000
    } else if (ing.unidad === 'kg') {
      totalKg += ing.cantidadBase
    }
  }

  if (receta.seccion === 'pure') {
    const mermaLost = totalKg * (PURE_MERMA_P / 100)
    const netoKg = totalKg - mermaLost
    observaciones.push(`Merma ${PURE_MERMA_P}%: −${Math.round(mermaLost)} kg`)
    observaciones.push(`Papa cocida disponible: ~${Math.round(netoKg)} kg`)
    observaciones.push('Sal + aceite al gusto (~300-400 ml aceite)')
  }

  if (receta.seccion === 'molido') {
    observaciones.push('Proteína variable (según día)')
  }

  totalKg = Math.round(totalKg * 100) / 100

  return { recetaId: receta.id, barquetas: barquetasDeseadas, ingredientes, totalKg, observaciones }
}

// ── Obtener receta por ID ──

export function getRecetaBlando(id: string): RecetaBlando | undefined {
  return [...CHINOS_RECETAS, ...MOLIDO_RECETAS, ...PURE_RECETAS].find((r) => r.id === id)
}

// ── Obtener todas las recetas de una sección ──

export function getRecetasBySeccion(seccion: 'chinos' | 'molido' | 'pure'): RecetaBlando[] {
  switch (seccion) {
    case 'chinos': return CHINOS_RECETAS
    case 'molido': return MOLIDO_RECETAS
    case 'pure': return PURE_RECETAS
  }
}
