import { IconSnowflake } from '@tabler/icons-react'
import { GUARNICION_PRESETS } from '../../data/guarnicionPresets'
import type { PreparacionCatalogo } from '../../types/catalogo'
import CatalogoControls from './CatalogoControls'

interface GuarnicionSelectorProps {
  index: number
  selectedName: string
  onPreset: (name: string) => void
  onCustom: (preparacion: PreparacionCatalogo, calculate: boolean) => void
}

export default function GuarnicionSelector({ index, selectedName, onPreset, onCustom }: GuarnicionSelectorProps) {
  return <>
    <div className="sec-lbl mb-2"><IconSnowflake size={13} style={{ verticalAlign: -2 }} /> Guarnición {index + 1} — selección rápida</div>
    <div className="flex flex-wrap gap-[5px] mb-3">
      {GUARNICION_PRESETS.map((name) => (
        <button key={name} type="button" onClick={() => onPreset(name)} className="min-h-11 px-[10px] text-xs border border-border rounded-[20px] cursor-pointer bg-surface text-text2 transition-all hover:bg-accent-light hover:text-accent hover:border-accent" style={selectedName === name ? { background: '#1B5E3F', color: '#fff', borderColor: '#1B5E3F' } : {}}>{name}</button>
      ))}
    </div>
    <CatalogoControls categoria="guarnicion" selectedName={selectedName} onUse={onCustom} />
  </>
}
