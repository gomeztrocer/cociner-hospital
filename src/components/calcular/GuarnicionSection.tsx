import { useCallback, useEffect, useState } from 'react'
import { IconX } from '@tabler/icons-react'
import { GUARNICION_PRESETS } from '../../data/guarnicionPresets'
import { detectarMerma } from '../../data/mermas'
import {
  calcularEmbarquetadoCentros,
  obtenerGramajeSugeridoGuarnicion,
  obtenerRacionesPorBarquetaGuarnicion,
} from '../../lib/calculos'
import { useAppStore } from '../../store/useAppStore'
import type { PreparacionCatalogo } from '../../types/catalogo'
import GuarnicionConfigFields from './GuarnicionConfigFields'
import GuarnicionResultado from './GuarnicionResultado'
import GuarnicionSelector from './GuarnicionSelector'

interface GuarnicionSectionProps { preparacionId: string; index: number }

export default function GuarnicionSection({ preparacionId, index }: GuarnicionSectionProps) {
  const prep = useAppStore((state) => state.guarniciones.find((item) => item.id === preparacionId))
  const update = useAppStore((state) => state.updateGuarnicion)
  const remove = useAppStore((state) => state.removeGuarnicion)
  const calculate = useAppStore((state) => state.calcularGuarnicionPrep)
  const resultado = useAppStore((state) => state.resultadosGuarniciones[preparacionId])
  const cantidadGuarniciones = useAppStore((state) => state.guarniciones.length)
  const centros = useAppStore((state) => state.centros)
  const pacientes = useAppStore((state) => state.pacientes)
  const disponibilidad = useAppStore((state) => state.disponibilidadPorServicio[state.servicio])
  const [nombre, setNombre] = useState(prep?.nombre ?? '')
  const [bolsa, setBolsa] = useState(String(prep?.bolsaKg ?? 2.5))
  const [merma, setMerma] = useState(String(prep?.merma ?? 20))
  const [gramos, setGramos] = useState(String(prep?.gramos ?? 120))
  const [calculationError, setCalculationError] = useState<string | null>(null)

  useEffect(() => {
    if (!prep) return
    setNombre(prep.nombre); setBolsa(String(prep.bolsaKg)); setMerma(prep.mermaDefinida ? String(prep.merma) : ''); setGramos(String(prep.gramos))
  }, [prep?.id, prep?.gramos]) // eslint-disable-line react-hooks/exhaustive-deps

  const sync = useCallback(() => {
    if (!prep) return
    update(prep.id, { nombre, bolsaKg: Number(bolsa) || 2.5, merma: Number(merma) || 0, mermaDefinida: merma.trim() !== '', gramos: Number(gramos) || 120 })
  }, [prep, nombre, bolsa, merma, gramos, update])

  if (!prep) return null
  const gramosSugeridos = obtenerGramajeSugeridoGuarnicion(cantidadGuarniciones)
  const racionesPorBarqueta = obtenerRacionesPorBarquetaGuarnicion(cantidadGuarniciones)
  const distribucion = calcularEmbarquetadoCentros({
    centros,
    pacientes,
    disponibilidad,
    racionesPorBarqueta,
  })
  const applyPreset = (name: string): void => {
    if (!GUARNICION_PRESETS.includes(name)) return
    const suggestion = detectarMerma(name, 'guar')
    const gramaje = prep.gramosManual ? prep.gramos : gramosSugeridos
    setNombre(name); setBolsa('2.5'); setGramos(String(gramaje)); if (suggestion.found) setMerma(String(suggestion.merma))
    update(prep.id, { nombre: name, bolsaKg: 2.5, merma: suggestion.found ? suggestion.merma : prep.merma, mermaDefinida: true, gramos: gramaje, mermaAuto: suggestion.found, mermaSource: suggestion.found ? suggestion.source : '' })
  }
  const applyCustom = (custom: PreparacionCatalogo, shouldCalculate: boolean): void => {
    const gramaje = custom.gramosPorRacion ?? (prep.gramosManual ? prep.gramos : gramosSugeridos)
    setNombre(custom.nombre); setBolsa(String(custom.pesoEnvaseKg ?? 2.5)); setGramos(String(gramaje)); setMerma(custom.mermaPorcentaje == null ? '' : String(custom.mermaPorcentaje))
    update(prep.id, { nombre: custom.nombre, bolsaKg: custom.pesoEnvaseKg ?? 2.5, gramos: gramaje, gramosManual: custom.gramosPorRacion != null || prep.gramosManual, merma: custom.mermaPorcentaje ?? 0, mermaDefinida: custom.mermaPorcentaje != null, mermaAuto: false, mermaSource: custom.mermaPorcentaje == null ? 'Merma sin definir' : (custom.mermaFuente ?? 'Merma guardada') })
    setCalculationError(custom.mermaPorcentaje == null ? 'Preparación guardada. Define o acepta una merma para calcularla.' : null)
    if (shouldCalculate) calculate(prep.id)
  }
  const changeMerma = (value: string): void => {
    setMerma(value); setCalculationError(null)
    update(prep.id, { mermaAuto: false, mermaSource: value.trim() ? 'Merma ajustada manualmente' : 'Merma sin definir' })
  }
  const changeGramos = (value: string): void => {
    setGramos(value)
    update(prep.id, { gramosManual: true })
  }
  const handleCalculate = (): void => {
    if (!merma.trim()) { setCalculationError('Define o acepta una merma antes de calcular esta guarnición.'); return }
    setCalculationError(null); sync(); calculate(prep.id)
  }

  return <div className="mb-[10px] overflow-hidden rounded-sm border border-border bg-surface2">
    <div className="flex items-center gap-2 border-b border-border bg-surface px-3 py-[10px]">
      <input type="text" placeholder="Nombre guarnición" value={nombre} onChange={(event) => setNombre(event.target.value)} onBlur={sync} className="min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none" />
      {prep.pacientesAsignados > 0 && <span className="shrink-0 rounded-sm bg-accent-light px-2 py-1 font-mono text-[11px] text-accent">Todos: {prep.pacientesAsignados} pac.</span>}
      <button type="button" aria-label="Quitar guarnición" onClick={() => remove(prep.id)} className="min-h-11 min-w-11 flex items-center justify-center rounded-sm border border-border text-text3"><IconX size={13} /></button>
    </div>
    <div className="p-3">
      <GuarnicionSelector index={index} selectedName={nombre} onPreset={applyPreset} onCustom={applyCustom} />
      <GuarnicionConfigFields bolsaKg={bolsa} merma={merma} gramos={gramos} mermaAuto={prep.mermaAuto} mermaSource={prep.mermaSource} gramosManual={prep.gramosManual} disabled={prep.pacientesAsignados === 0} error={calculationError} onBolsaKg={setBolsa} onMerma={changeMerma} onGramos={changeGramos} onBlur={sync} onCalculate={handleCalculate} />
      {resultado && <GuarnicionResultado nombre={nombre || prep.nombre} resultado={resultado} distribucion={distribucion} racionesPorBarqueta={racionesPorBarqueta} />}
    </div>
  </div>
}
