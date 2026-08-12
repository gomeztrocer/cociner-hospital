import { IconCalculator } from '@tabler/icons-react'

interface GuarnicionConfigFieldsProps {
  bolsaKg: string
  merma: string
  gramos: string
  mermaAuto: boolean
  mermaSource: string
  gramosManual: boolean
  disabled: boolean
  error: string | null
  onBolsaKg: (value: string) => void
  onMerma: (value: string) => void
  onGramos: (value: string) => void
  onBlur: () => void
  onCalculate: () => void
}

export default function GuarnicionConfigFields(props: GuarnicionConfigFieldsProps) {
  return <>
    <div className="grid grid-cols-3 gap-[7px] mb-2">
      <label className="text-[11px] text-text2">Bolsa (kg)<input type="number" inputMode="decimal" min={0.1} step={0.5} value={props.bolsaKg} onChange={(event) => props.onBolsaKg(event.target.value)} onBlur={props.onBlur} className="mt-1 w-full min-h-11 px-[10px] text-sm border border-border rounded-sm bg-surface text-text" /></label>
      <label className="text-[11px] text-text2">Merma %<div className="relative mt-1">
        <input type="number" inputMode="decimal" min={-300} max={80} value={props.merma} onChange={(event) => props.onMerma(event.target.value)} onBlur={props.onBlur} className="w-full min-h-11 px-[10px] pr-12 text-sm border border-border rounded-sm bg-surface text-text" />
        <span className={`absolute right-1 top-1/2 -translate-y-1/2 rounded-[6px] px-[4px] py-[2px] text-[9px] font-semibold ${props.mermaAuto ? 'bg-accent-light text-accent' : 'bg-warn-light text-warn'}`}>{props.mermaAuto ? 'auto' : 'manual'}</span>
      </div><span className="mt-1 block text-[10px] italic text-text3">{props.mermaSource}</span></label>
      <label className="text-[11px] text-text2">g netos/rac.<input type="number" inputMode="numeric" min={1} value={props.gramos} onChange={(event) => props.onGramos(event.target.value)} onBlur={props.onBlur} className="mt-1 w-full min-h-11 px-[10px] text-sm border border-border rounded-sm bg-surface text-text" /><span className={`mt-1 block text-[10px] italic ${props.gramosManual ? 'text-warn' : 'text-text3'}`}>{props.gramosManual ? 'Gramaje manual' : 'Gramaje habitual'}</span></label>
    </div>
    {props.error && <div role="alert" className="mb-2 rounded-sm bg-warn-light px-3 py-2 text-xs text-warn">{props.error}</div>}
    <button type="button" onClick={props.onCalculate} disabled={props.disabled} className="mt-2 flex min-h-11 w-full items-center justify-center gap-2 rounded-sm bg-accent text-xs font-semibold text-white disabled:opacity-50"><IconCalculator size={14} />Calcular</button>
  </>
}
