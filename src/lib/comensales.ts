import { CENTROS, type Centro } from '../data/centros'

export type Servicio = 'almuerzo' | 'cena'
export type PacientesPorServicio = Record<Servicio, Record<string, number>>
export type DisponibilidadPorServicio = Record<Servicio, Record<string, boolean>>

export interface EstadoComensalesDia {
  fecha: string
  centros: Centro[]
  pacientes: PacientesPorServicio
  disponibilidad: DisponibilidadPorServicio
}

export function getFechaLocalTenerife(fecha = new Date()): string {
  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Atlantic/Canary',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(fecha)
  const valor = (tipo: Intl.DateTimeFormatPartTypes) =>
    partes.find((parte) => parte.type === tipo)?.value ?? ''
  return `${valor('year')}-${valor('month')}-${valor('day')}`
}

export function getDiaSemanaIso(fecha: string): number {
  const [year, month, day] = fecha.split('-').map(Number)
  const jsDay = new Date(Date.UTC(year, month - 1, day, 12)).getUTCDay()
  return jsDay === 0 ? 7 : jsDay
}

export function centroTieneServicio(
  centroId: string,
  servicio: Servicio,
  fecha: string,
): boolean {
  const dia = getDiaSemanaIso(fecha)
  if (servicio === 'cena' && centroId === 'hogara' && dia === 2) return false
  if (servicio === 'cena' && centroId === 'hogarb' && dia === 3) return false
  return true
}

export function crearEstadoComensalesFallback(
  fecha: string,
  centros: Centro[] = CENTROS,
): EstadoComensalesDia {
  const pacientes: PacientesPorServicio = { almuerzo: {}, cena: {} }
  const disponibilidad: DisponibilidadPorServicio = { almuerzo: {}, cena: {} }

  for (const centro of centros) {
    for (const servicio of ['almuerzo', 'cena'] as const) {
      const disponible = centroTieneServicio(centro.id, servicio, fecha)
      disponibilidad[servicio][centro.id] = disponible
      pacientes[servicio][centro.id] = disponible
        ? servicio === 'almuerzo' ? centro.paxAlmuerzo : centro.paxCena
        : 0
    }
  }

  return { fecha, centros, pacientes, disponibilidad }
}

export function calcularTotalComensales(
  pacientes: Record<string, number>,
  disponibilidad: Record<string, boolean>,
): number {
  return Object.entries(pacientes).reduce(
    (total, [centroId, cantidad]) =>
      total + (disponibilidad[centroId] === false ? 0 : Math.max(0, cantidad)),
    0,
  )
}
