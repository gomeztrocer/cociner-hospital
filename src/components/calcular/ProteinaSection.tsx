import { useCallback, useEffect, useState } from 'react'
import { IconX } from '@tabler/icons-react'
import { detectarMerma } from '../../data/mermas'
import type { ProteinaPreset } from '../../data/proteinaPresets'
import { useCatalogoPreparaciones } from '../../hooks/useCatalogoPreparaciones'
import { useAppStore } from '../../store/useAppStore'
import type { PreparacionCatalogo } from '../../types/catalogo'
import ProteinaConfigFields from './ProteinaConfigFields'
import ProteinaResultado from './ProteinaResultado'
import ProteinaSelector from './ProteinaSelector'

interface ProteinaSectionProps { preparacionId: string }

export default function ProteinaSection({ preparacionId }: ProteinaSectionProps) {
  const prep = useAppStore((state) => state.proteinas.find((item) => item.id === preparacionId))
  const update = useAppStore((state) => state.updateProteina)
  const remove = useAppStore((state) => state.removeProteina)
  const calculate = useAppStore((state) => state.calcularProteinaPrep)
  const resultado = useAppStore((state) => state.resultadosProteinas[preparacionId])
  const total = useAppStore((state) => Object.values(state.pacientes).reduce((sum, value) => sum + value, 0))
  const { data: catalogo } = useCatalogoPreparaciones()
  const [nombre, setNombre] = useState(prep?.nombre ?? '')
  const [caja, setCaja] = useState(String(prep?.unidadesPorCaja ?? 52))
  const [racion, setRacion] = useState(String(prep?.unidadesPorRacion ?? 1))
  const [unidad, setUnidad] = useState(prep?.nombreUnidad ?? 'piezas')
  const [merma, setMerma] = useState(String(prep?.merma ?? 25))

  useEffect(() => {
    if (!prep) return
    setNombre(prep.nombre); setCaja(String(prep.unidadesPorCaja)); setRacion(String(prep.unidadesPorRacion))
    setUnidad(prep.nombreUnidad); setMerma(prep.mermaDefinida ? String(prep.merma) : '')
  }, [prep?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const sync = useCallback(() => {
    if (!prep) return
    update(prep.id, { nombre, unidadesPorCaja: Number(caja) || 0, unidadesPorRacion: Number(racion) || 1, nombreUnidad: unidad, merma: Number(merma) || 0, mermaDefinida: merma.trim() !== '' })
  }, [prep, nombre, caja, racion, unidad, merma, update])

  if (!prep) return null
  const applyPreset = (preset: ProteinaPreset): void => {
    const suggestion = detectarMerma(preset.nombre, 'prot')
    setNombre(preset.nombre); setCaja(String(preset.caja)); setRacion(String(preset.racion)); setUnidad(preset.unidad)
    if (suggestion.found) setMerma(String(suggestion.merma))
    update(prep.id, { nombre: preset.nombre, unidadesPorCaja: preset.caja, unidadesPorRacion: preset.racion, nombreUnidad: preset.unidad, merma: suggestion.found ? suggestion.merma : prep.merma, mermaDefinida: true, mermaAuto: suggestion.found, mermaSource: suggestion.found ? suggestion.source : '' })
  }
  const applyCustom = (custom: PreparacionCatalogo, shouldCalculate: boolean): void => {
    setNombre(custom.nombre); setCaja(String(custom.unidadesPorCaja ?? 0)); setRacion(String(custom.unidadesPorRacion ?? 1)); setUnidad(custom.unidad)
    setMerma(custom.mermaPorcentaje == null ? '' : String(custom.mermaPorcentaje))
    update(prep.id, { nombre: custom.nombre, unidadesPorCaja: custom.unidadesPorCaja ?? 0, unidadesPorRacion: custom.unidadesPorRacion ?? 1, nombreUnidad: custom.unidad, merma: custom.mermaPorcentaje ?? 0, mermaDefinida: custom.mermaPorcentaje != null, mermaAuto: false, mermaSource: custom.mermaPorcentaje == null ? 'Merma sin definir' : (custom.mermaFuente ?? 'Merma guardada') })
    if (shouldCalculate) calculate(prep.id)
  }
  const changeMerma = (value: string): void => {
    setMerma(value)
    update(prep.id, { mermaAuto: false, mermaSource: value.trim() ? 'Merma ajustada manualmente' : 'Merma sin definir' })
  }
  const showResult = resultado && 'cajasAbrir' in resultado

  return <div className="mb-[10px] overflow-hidden rounded-sm border border-border bg-surface2">
    <div className="flex items-center gap-2 border-b border-border bg-surface px-3 py-[10px]">
      <input type="text" placeholder="Nombre proteína" value={nombre} onChange={(event) => setNombre(event.target.value)} onBlur={sync} className="min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none" />
      <button type="button" aria-label="Quitar proteína" onClick={() => remove(prep.id)} className="min-h-11 min-w-11 flex items-center justify-center rounded-sm border border-border text-text3"><IconX size={13} /></button>
    </div>
    <div className="p-3">
      <ProteinaSelector selectedName={nombre} onPreset={applyPreset} onCustom={applyCustom} />
      <ProteinaConfigFields unidades={catalogo.unidades} udsCaja={caja} udsRacion={racion} unidad={unidad} merma={merma} mermaAuto={prep.mermaAuto} mermaSource={prep.mermaSource} disabled={total === 0} onUdsCaja={setCaja} onUdsRacion={setRacion} onUnidad={setUnidad} onMerma={changeMerma} onBlur={sync} onCalculate={() => { sync(); calculate(prep.id) }} />
      {showResult && <ProteinaResultado nombre={nombre || prep.nombre} nombreUnidad={prep.nombreUnidad} unidadesPorRacion={prep.unidadesPorRacion} totalPacientes={total} resultado={resultado} />}
    </div>
  </div>
}
