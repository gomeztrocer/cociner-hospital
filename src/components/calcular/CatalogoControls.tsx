import { useState } from 'react'
import { IconEdit, IconPlus, IconTrash } from '@tabler/icons-react'
import { useCatalogoPreparaciones } from '../../hooks/useCatalogoPreparaciones'
import type { CategoriaCatalogo, PreparacionCatalogo, PreparacionCatalogoInput } from '../../types/catalogo'
import PreparacionCatalogoForm from './PreparacionCatalogoForm'

interface CatalogoControlsProps {
  categoria: CategoriaCatalogo
  selectedName: string
  onUse: (preparacion: PreparacionCatalogo, calculate: boolean) => void
}

export default function CatalogoControls({ categoria, selectedName, onUse }: CatalogoControlsProps) {
  const { data, loading, error: loadError, save, archive } = useCatalogoPreparaciones()
  const [editing, setEditing] = useState<PreparacionCatalogo | 'new' | null>(null)
  const [manage, setManage] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [manageError, setManageError] = useState<string | null>(null)
  const activos = data.preparaciones.filter((prep) => prep.activo && prep.categoria === categoria)

  const saveForm = async (input: PreparacionCatalogoInput): Promise<void> => {
    setSaving(true); setFormError(null)
    const current = editing !== 'new' ? editing : undefined
    const result = await save(input, current?.id)
    setSaving(false)
    if (result.error || !result.preparacion) { setFormError(result.error ?? 'No se pudo recuperar la preparación'); return }
    setEditing(null); onUse(result.preparacion, result.preparacion.mermaPorcentaje != null || categoria === 'proteina')
  }

  const archiveItem = async (preparacion: PreparacionCatalogo): Promise<void> => {
    setManageError(null)
    const result = await archive(preparacion.id)
    if (result.error) setManageError(`${preparacion.nombre}: ${result.error}`)
  }

  return (
    <div className="mb-3">
      <div className="flex flex-wrap gap-[5px]">
        {activos.map((prep) => (
          <button key={prep.id} type="button" onClick={() => onUse(prep, false)} className="min-h-11 px-[10px] text-xs border border-accent rounded-[20px] bg-accent-light text-accent" style={selectedName === prep.nombre ? { background: '#1B5E3F', color: '#fff' } : {}}>{prep.nombre}</button>
        ))}
        <button type="button" disabled={loading || Boolean(loadError)} onClick={() => { setEditing('new'); setFormError(null) }} className="min-h-11 px-[10px] text-xs border border-dashed border-accent rounded-[20px] bg-surface text-accent flex items-center gap-1 disabled:opacity-50"><IconPlus size={14} /> Otro</button>
        {activos.length > 0 && <button type="button" onClick={() => setManage((value) => !value)} className="min-h-11 px-[10px] text-xs border border-border rounded-[20px] bg-surface text-text2">Gestionar</button>}
      </div>
      {loading && <div className="mt-1 text-[10px] text-text3">Cargando catálogo…</div>}
      {loadError && <div className="mt-1 text-[10px] text-warn">Catálogo en línea no disponible; los preparados integrados siguen funcionando.</div>}
      {manageError && <div role="alert" className="mt-2 rounded-sm bg-redLight p-2 text-xs text-red">{manageError}</div>}
      {manage && <div className="mt-2 rounded-sm border border-border bg-surface p-2">
        {activos.map((prep) => <div key={prep.id} className="flex min-h-11 items-center gap-2 border-b border-surface2 last:border-0">
          <span className="flex-1 text-xs">{prep.nombre}</span>
          <button type="button" aria-label={`Editar ${prep.nombre}`} onClick={() => { setEditing(prep); setFormError(null) }} className="min-h-11 min-w-11 flex items-center justify-center text-accent"><IconEdit size={16} /></button>
          <button type="button" aria-label={`Archivar ${prep.nombre}`} onClick={() => void archiveItem(prep)} className="min-h-11 min-w-11 flex items-center justify-center text-red"><IconTrash size={16} /></button>
        </div>)}
      </div>}
      {editing && <div className="mt-3"><PreparacionCatalogoForm key={editing === 'new' ? 'new' : editing.id} categoria={categoria} unidades={data.unidades} initial={editing === 'new' ? undefined : editing} saving={saving} error={formError} onCancel={() => setEditing(null)} onSave={saveForm} /></div>}
    </div>
  )
}
