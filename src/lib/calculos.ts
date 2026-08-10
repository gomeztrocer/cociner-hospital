import { type Centro } from '../data/centros'

// ── Result Types ──

export interface ProteinaResult {
  unidadesNecesarias: number
  cajasAbrir: number
  unidadesDisponibles: number
  sobrante: number
  sobranteRaciones: number
  mermaP: number
}

export interface GuarnicionResult {
  netoNecesario: number
  brutoNecesario: number
  netoReal: number
  bolsas: number
  sobrante: number
  mermaP: number
}

export interface DesgloseCentro {
  nombre: string
  color: string
  pax: number
  unidades: number
}

export interface EmbarquetadoCentro {
  id: string
  nombre: string
  color: string
  raciones: number
  envasesMonoporcion: number
  barquetasCompletas: number
  racionesParcial: number
  barquetasMultiporcion: number
  pesoEstimadoKg: number | null
}

export interface BolsasIngredienteResult {
  kgNecesarios: number
  bolsasAbrir: number
  kgDisponibles: number
  sobranteKg: number
}

// ── PROTEÍNA ──

export function calcularProteina(params: {
  totalPacientes: number
  unidadesPorCaja: number
  unidadesPorRacion: number
  mermaP: number
}): ProteinaResult {
  const { totalPacientes, unidadesPorCaja, unidadesPorRacion, mermaP } = params

  const unidadesNecesarias = unidadesPorRacion * totalPacientes
  const cajasAbrir = unidadesPorCaja > 0
    ? Math.ceil(unidadesNecesarias / unidadesPorCaja)
    : 0
  const unidadesDisponibles = cajasAbrir * unidadesPorCaja
  const sobrante = unidadesDisponibles - unidadesNecesarias
  const sobranteRaciones = unidadesPorRacion > 0
    ? Math.floor(sobrante / unidadesPorRacion)
    : 0

  return { unidadesNecesarias, cajasAbrir, unidadesDisponibles, sobrante, sobranteRaciones, mermaP }
}

// ── REPARTO DE PACIENTES ENTRE GUARNICIONES ──

export function calcularReparto(
  totalPacientes: number,
  cantidad: number,
): number[] {
  if (cantidad <= 1) return [totalPacientes]
  const base = Math.floor(totalPacientes / cantidad)
  const resto = totalPacientes % cantidad
  return Array.from({ length: cantidad }, (_, i) =>
    i === 0 ? base + resto : base,
  )
}

// ── BANDEJAS DE HORNO ──

export function calcularBandejasHorno(params: {
  unidadesNecesarias: number
  capacidadBandeja?: number
}): number {
  const capacidad = params.capacidadBandeja ?? 25
  return Math.ceil(params.unidadesNecesarias / capacidad)
}

// ── GUARNICIÓN ──

export function calcularGuarnicion(params: {
  totalPacientes: number
  bolsaKg: number
  mermaP: number
  racionG: number
}): GuarnicionResult {
  const { totalPacientes, bolsaKg, mermaP, racionG } = params
  const bolsaG = bolsaKg * 1000
  const merma = mermaP / 100
  const netoNecesario = racionG * totalPacientes

  let brutoNecesario: number
  let netoReal: number
  let bolsas: number

  if (merma < 0) {
    // Absorción (arroz, pasta) — merma negativa = aumenta peso
    const factor = 1 + Math.abs(merma)
    brutoNecesario = netoNecesario / factor
    bolsas = Math.ceil(brutoNecesario / bolsaG)
    const brutoReal = bolsas * bolsaG
    netoReal = brutoReal * factor
    brutoNecesario = brutoReal
  } else {
    // Merma normal — pierde peso al cocer
    brutoNecesario = netoNecesario / (1 - merma)
    bolsas = Math.ceil(brutoNecesario / bolsaG)
    const brutoReal = bolsas * bolsaG
    netoReal = brutoReal * (1 - merma)
    brutoNecesario = brutoReal
  }

  const sobrante = Math.round(netoReal - netoNecesario)

  return { netoNecesario, brutoNecesario, netoReal, bolsas, sobrante, mermaP }
}

// ── DESGLOSE POR CENTRO ──

export function calcularDesgloseCentros(params: {
  centros: Centro[]
  pacientes: Record<string, number>
  unidadesPorRacion: number
}): DesgloseCentro[] {
  return params.centros
    .filter((c) => (params.pacientes[c.id] ?? 0) > 0)
    .map((c) => ({
      nombre: c.nombre,
      color: c.color,
      pax: params.pacientes[c.id] ?? 0,
      unidades: params.unidadesPorRacion * (params.pacientes[c.id] ?? 0),
    }))
}

// ── ESCALADO DE RECETAS ──

export interface IngredienteEscalable {
  nombre: string
  cantidad: number
  unidad: string
}

export function escalarIngredientes<T extends IngredienteEscalable>(
  ingredientes: T[],
  totalPacientes: number,
  racionesBase: number,
): T[] {
  if (racionesBase <= 0 || totalPacientes <= 0) return ingredientes
  const factor = totalPacientes / racionesBase
  return ingredientes.map((ing) => ({
    ...ing,
    cantidad: Math.round(ing.cantidad * factor * 100) / 100,
  }))
}

export function calcularBolsasIngrediente(params: {
  cantidad: number
  unidad: string
  pesoBolsaKg: number | null
}): BolsasIngredienteResult | null {
  if (params.pesoBolsaKg == null || params.pesoBolsaKg <= 0 || params.cantidad <= 0) return null

  const unidad = params.unidad.trim().toLowerCase()
  const kgNecesarios = unidad === 'kg'
    ? params.cantidad
    : unidad === 'g'
      ? params.cantidad / 1000
      : null

  if (kgNecesarios == null) return null

  const bolsasAbrir = Math.ceil(kgNecesarios / params.pesoBolsaKg)
  const kgDisponibles = bolsasAbrir * params.pesoBolsaKg

  return {
    kgNecesarios: Math.round(kgNecesarios * 100) / 100,
    bolsasAbrir,
    kgDisponibles: Math.round(kgDisponibles * 100) / 100,
    sobranteKg: Math.round((kgDisponibles - kgNecesarios) * 100) / 100,
  }
}

export function calcularPesoRecetaKg(
  ingredientes: IngredienteEscalable[],
): number | null {
  let totalKg = 0
  let hayPeso = false

  for (const ingrediente of ingredientes) {
    const unidad = ingrediente.unidad.trim().toLowerCase()
    if (unidad === 'kg') {
      totalKg += ingrediente.cantidad
      hayPeso = true
    } else if (unidad === 'g') {
      totalKg += ingrediente.cantidad / 1000
      hayPeso = true
    }
  }

  return hayPeso ? Math.round(totalKg * 1000) / 1000 : null
}

export function extraerPesoRacionObjetivoG(notas: string | null): number | null {
  if (!notas) return null

  const coincidencia = notas.match(/peso final objetivo:\s*(\d+(?:[.,]\d+)?)\s*g/i)
  if (!coincidencia) return null

  const peso = Number(coincidencia[1].replace(',', '.'))
  return Number.isFinite(peso) && peso > 0 ? peso : null
}

export function calcularEmbarquetadoCentros(params: {
  centros: Centro[]
  pacientes: Record<string, number>
  racionesPorBarqueta?: number
  pesoPorRacionKg?: number | null
}): EmbarquetadoCentro[] {
  const capacidad = Math.max(1, Math.floor(params.racionesPorBarqueta ?? 10))

  return params.centros
    .map((centro) => {
      const raciones = Math.max(0, Math.floor(params.pacientes[centro.id] ?? 0))
      const barquetasCompletas = Math.floor(raciones / capacidad)
      const racionesParcial = raciones % capacidad

      return {
        id: centro.id,
        nombre: centro.nombre,
        color: centro.color,
        raciones,
        envasesMonoporcion: raciones,
        barquetasCompletas,
        racionesParcial,
        barquetasMultiporcion: barquetasCompletas + (racionesParcial > 0 ? 1 : 0),
        pesoEstimadoKg: params.pesoPorRacionKg == null
          ? null
          : Math.round(params.pesoPorRacionKg * raciones * 100) / 100,
      }
    })
    .filter((centro) => centro.raciones > 0)
}
