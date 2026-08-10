export interface Centro {
  id: string
  nombre: string
  color: string
  paxAlmuerzo: number
  paxCena: number
}

export const CENTROS: Centro[] = [
  { id: 'sur', nombre: 'Sur', color: '#1B5E3F', paxAlmuerzo: 120, paxCena: 120 },
  { id: 'candelaria', nombre: 'Candelaria', color: '#1E3A5F', paxAlmuerzo: 120, paxCena: 30 },
  { id: 'parque', nombre: 'Parque', color: '#6B3FA0', paxAlmuerzo: 50, paxCena: 50 },
  { id: 'centro', nombre: 'SJDD', color: '#8B4513', paxAlmuerzo: 100, paxCena: 100 },
  { id: 'hogara', nombre: 'Hogar A', color: '#991B1B', paxAlmuerzo: 12, paxCena: 12 },
  { id: 'hogarb', nombre: 'Hogar B', color: '#B45309', paxAlmuerzo: 12, paxCena: 12 },
  { id: 'tamaragua', nombre: 'Tamaragua', color: '#0F766E', paxAlmuerzo: 0, paxCena: 0 },
]

export function getPacientesPorServicio(
  servicio: 'almuerzo' | 'cena'
): Record<string, number> {
  const pacientes: Record<string, number> = {}
  for (const c of CENTROS) {
    pacientes[c.id] = servicio === 'almuerzo' ? c.paxAlmuerzo : c.paxCena
  }
  return pacientes
}
