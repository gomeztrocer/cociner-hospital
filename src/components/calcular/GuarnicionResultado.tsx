import { useState } from 'react'
import { IconCheck, IconSnowflake } from '@tabler/icons-react'
import { useHistorial } from '../../hooks/useHistorial'
import type { EmbarquetadoCentro, GuarnicionResult } from '../../lib/calculos'
import { useAppStore } from '../../store/useAppStore'
import DistribucionBarquetasCentros from './DistribucionBarquetasCentros'

interface GuarnicionResultadoProps {
  nombre: string
  resultado: GuarnicionResult
  distribucion: EmbarquetadoCentro[]
  racionesPorBarqueta: number
}
function fmtG(value: number): string { return value >= 1000 ? `${(value / 1000).toFixed(1)} kg` : `${value} g` }

export default function GuarnicionResultado({ nombre, resultado, distribucion, racionesPorBarqueta }: GuarnicionResultadoProps) {
  const [guardado, setGuardado] = useState(false)
  const user = useAppStore((state) => state.user)
  const servicio = useAppStore((state) => state.servicio)
  const { addRegistro } = useHistorial(user?.id)
  const guardar = async (): Promise<void> => {
    const response = await addRegistro({ plato: nombre, servicio: servicio === 'almuerzo' ? 'Almuerzo' : 'Cena', raciones: resultado.totalPacientes, categoria: 'guarnicion' })
    if (!response.error) setGuardado(true)
  }

  return <div className="mt-3 bg-surface border border-border rounded-sm p-3">
    <div className="mb-2 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-text3"><IconSnowflake size={12} />Resultado</div>
    <div className="flex justify-between border-b border-surface2 py-1"><span className="text-xs text-text2">Bolsas a abrir</span><strong className="font-mono text-lg text-accent">{resultado.bolsas}</strong></div>
    <div className="flex justify-between border-b border-surface2 py-1"><span className="text-xs text-text2">Cálculo aplicado</span><span className="text-sm">{resultado.totalPacientes} × {resultado.racionG} g</span></div>
    <div className="flex justify-between border-b border-surface2 py-1"><span className="text-xs text-text2">Peso bruto necesario</span><span className="text-sm">{fmtG(resultado.brutoNecesario)}</span></div>
    <div className="flex justify-between border-b border-surface2 py-1"><span className="text-xs text-text2">Peso neto cocido</span><span className="text-sm">{fmtG(resultado.netoNecesario)}</span></div>
    <div className="flex justify-between py-1"><span className="text-xs text-text2">Sobrante</span><span className="text-xs font-medium text-accent">{resultado.netoReal > resultado.netoNecesario ? fmtG(resultado.netoReal - resultado.netoNecesario) : '0 g ✓'}</span></div>
    <DistribucionBarquetasCentros distribucion={distribucion} racionesPorBarqueta={racionesPorBarqueta} />
    {guardado ? <div className="mt-2 flex items-center justify-center gap-1 py-2 text-xs font-semibold text-accent"><IconCheck size={14} />Preparación guardada ✓</div> : <button type="button" onClick={() => void guardar()} className="mt-2 min-h-11 w-full rounded-sm border border-accent bg-accent-light text-xs font-semibold text-accent">Guardar como preparación</button>}
  </div>
}
