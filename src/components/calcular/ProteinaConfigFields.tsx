import { IconCalculator } from '@tabler/icons-react'
import type { UnidadCatalogo } from '../../types/catalogo'
import UnidadSelector from './UnidadSelector'

interface ProteinaConfigFieldsProps {
  unidades: UnidadCatalogo[]
  udsCaja: string
  udsRacion: string
  unidad: string
  merma: string
  mermaAuto: boolean
  mermaSource: string
  disabled: boolean
  onUdsCaja: (value: string) => void
  onUdsRacion: (value: string) => void
  onUnidad: (value: string) => void
  onMerma: (value: string) => void
  onBlur: () => void
  onCalculate: () => void
}

export default function ProteinaConfigFields(props: ProteinaConfigFieldsProps) {
  return <>
    <div className="grid grid-cols-3 gap-[7px] mb-2">
      <label className="text-[11px] text-text2">Unid./caja<input type="number" inputMode="decimal" min={0} value={props.udsCaja} onChange={(event) => props.onUdsCaja(event.target.value)} onBlur={props.onBlur} className="mt-1 w-full min-h-11 px-[10px] text-sm border border-border rounded-sm bg-surface text-text" /></label>
      <label className="text-[11px] text-text2">Unid./ración<input type="number" inputMode="decimal" min={1} value={props.udsRacion} onChange={(event) => props.onUdsRacion(event.target.value)} onBlur={props.onBlur} className="mt-1 w-full min-h-11 px-[10px] text-sm border border-border rounded-sm bg-surface text-text" /></label>
      <label className="text-[11px] text-text2">Unidad<UnidadSelector unidades={props.unidades} value={props.unidad} onChange={props.onUnidad} compact /></label>
    </div>
    <label className="text-[11px] text-text2 block">Merma %
      <div className="relative mt-1">
        <input type="number" inputMode="decimal" min={-300} max={80} value={props.merma} onChange={(event) => props.onMerma(event.target.value)} onBlur={props.onBlur} className="w-full min-h-11 px-[10px] pr-12 text-sm border border-border rounded-sm bg-surface text-text" />
        <span className={`absolute right-2 top-1/2 -translate-y-1/2 rounded-[6px] px-[5px] py-[2px] text-[9px] font-semibold ${props.mermaAuto ? 'bg-accent-light text-accent' : 'bg-warn-light text-warn'}`}>{props.mermaAuto ? 'auto' : 'manual'}</span>
      </div>
      <span className="mt-1 block text-[10px] italic text-text3">{props.mermaSource}</span>
    </label>
    <button type="button" onClick={props.onCalculate} disabled={props.disabled} className="mt-2 flex min-h-11 w-full items-center justify-center gap-2 rounded-sm bg-accent text-xs font-semibold text-white disabled:opacity-50"><IconCalculator size={14} />Calcular</button>
  </>
}
