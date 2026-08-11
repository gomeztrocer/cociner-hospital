import { IconMeat } from '@tabler/icons-react'
import { PROTEINA_PRESETS, type ProteinaPreset } from '../../data/proteinaPresets'
import type { PreparacionCatalogo } from '../../types/catalogo'
import CatalogoControls from './CatalogoControls'

interface ProteinaSelectorProps {
  selectedName: string
  onPreset: (preset: ProteinaPreset) => void
  onCustom: (preparacion: PreparacionCatalogo, calculate: boolean) => void
}

export default function ProteinaSelector({ selectedName, onPreset, onCustom }: ProteinaSelectorProps) {
  return <>
    <div className="sec-lbl mb-2"><IconMeat size={13} style={{ verticalAlign: -2 }} /> Proteína — selección rápida</div>
    <div className="grid grid-cols-4 gap-[5px] mb-3">
      {PROTEINA_PRESETS.map((preset) => (
        <button key={preset.nombre} type="button" onClick={() => onPreset(preset)} className="flex min-h-11 flex-col items-center justify-center py-2 px-1 text-[11px] text-center leading-tight border border-border rounded-sm bg-surface text-text2 cursor-pointer transition-all hover:bg-accent-light hover:border-accent hover:text-accent">
          <IconMeat size={16} className="mb-[3px] text-text3" />{preset.nombre}
        </button>
      ))}
    </div>
    <CatalogoControls categoria="proteina" selectedName={selectedName} onUse={onCustom} />
  </>
}
