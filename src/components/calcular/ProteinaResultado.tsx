import { useState } from 'react'
import { IconCheck, IconMeat } from '@tabler/icons-react'
import { useHistorial } from '../../hooks/useHistorial'
import type { ProteinaResult } from '../../lib/calculos'
import { useAppStore } from '../../store/useAppStore'

interface ProteinaResultadoProps {
  nombre: string
  nombreUnidad: string
  unidadesPorRacion: number
  totalPacientes: number
  resultado: ProteinaResult
}

export default function ProteinaResultado({ nombre, nombreUnidad, unidadesPorRacion, totalPacientes, resultado }: ProteinaResultadoProps) {
  const [guardado, setGuardado] = useState(false)
  const user = useAppStore((state) => state.user)
  const servicio = useAppStore((state) => state.servicio)
  const { addRegistro } = useHistorial(user?.id)
  const guardar = async (): Promise<void> => {
    const response = await addRegistro({ plato: nombre, servicio: servicio === 'almuerzo' ? 'Almuerzo' : 'Cena', raciones: totalPacientes, categoria: 'proteina' })
    if (!response.error) setGuardado(true)
  }

  return <div className="mt-3 bg-surface border border-border rounded-sm p-3">
    <div className="mb-2 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-text3"><IconMeat size={12} />Resultado</div>
    <div className="flex justify-between border-b border-surface2 py-1"><span className="text-xs text-text2">Cajas a abrir</span><strong className="font-mono text-lg text-accent">{resultado.cajasAbrir}</strong></div>
    <div className="flex justify-between border-b border-surface2 py-1"><span className="text-xs text-text2">{nombreUnidad} disponibles</span><span className="text-sm">{resultado.unidadesDisponibles}</span></div>
    <div className="flex justify-between border-b border-surface2 py-1"><span className="text-xs text-text2">Necesarias ({unidadesPorRacion} × {totalPacientes} pac.)</span><span className="text-sm">{resultado.unidadesNecesarias}</span></div>
    <div className="flex justify-between py-1"><span className="text-xs text-text2">Sobrante</span><span className={`text-xs font-medium ${resultado.sobrante === 0 ? 'text-accent' : 'text-warn'}`}>{resultado.sobrante === 0 ? '0 ✓' : `${resultado.sobrante} ${nombreUnidad} → ${resultado.sobranteRaciones} rac. extra`}</span></div>
    {guardado ? <div className="mt-2 flex items-center justify-center gap-1 py-2 text-xs font-semibold text-accent"><IconCheck size={14} />Preparación guardada ✓</div> : <button type="button" onClick={() => void guardar()} className="mt-2 min-h-11 w-full rounded-sm border border-accent bg-accent-light text-xs font-semibold text-accent">Guardar como preparación</button>}
  </div>
}
