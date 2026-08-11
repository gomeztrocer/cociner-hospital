import { useMemo, useState } from 'react'
import { sugerirMerma } from '../../lib/catalogo'
import type { CategoriaCatalogo, PreparacionCatalogo, PreparacionCatalogoInput, UnidadCatalogo } from '../../types/catalogo'
import MermaCatalogoField from './MermaCatalogoField'

interface PreparacionCatalogoFormProps {
  categoria: CategoriaCatalogo
  unidades: UnidadCatalogo[]
  initial?: PreparacionCatalogo
  saving: boolean
  error: string | null
  onCancel: () => void
  onSave: (input: PreparacionCatalogoInput) => Promise<void>
}

function number(value: string): number | null { return value.trim() ? Number(value) : null }

export default function PreparacionCatalogoForm({ categoria, unidades, initial, saving, error, onCancel, onSave }: PreparacionCatalogoFormProps) {
  const [nombre, setNombre] = useState(initial?.nombre ?? '')
  const [unidadId, setUnidadId] = useState(initial?.unidadId ?? unidades[0]?.id ?? '')
  const [unidadNueva, setUnidadNueva] = useState('')
  const [caja, setCaja] = useState(String(initial?.unidadesPorCaja ?? 20))
  const [racion, setRacion] = useState(String(initial?.unidadesPorRacion ?? 1))
  const [peso, setPeso] = useState(String(initial?.pesoEnvaseKg ?? 2.5))
  const [gramos, setGramos] = useState(String(initial?.gramosPorRacion ?? 120))
  const [merma, setMerma] = useState(initial?.mermaPorcentaje == null ? '' : String(initial.mermaPorcentaje))
  const [mermaFuente, setMermaFuente] = useState<string | null>(initial?.mermaFuente ?? null)
  const suggestion = useMemo(() => sugerirMerma(nombre, categoria), [nombre, categoria])
  const customUnit = unidadId === '__otra__'

  const submit = async (): Promise<void> => onSave({
    nombre, categoria, unidadId: customUnit ? null : unidadId, unidadNueva: customUnit ? unidadNueva : null,
    unidadesPorCaja: categoria === 'proteina' ? number(caja) : null,
    unidadesPorRacion: categoria === 'proteina' ? number(racion) : null,
    pesoEnvaseKg: categoria === 'guarnicion' ? number(peso) : null,
    gramosPorRacion: categoria === 'guarnicion' ? number(gramos) : null,
    mermaPorcentaje: number(merma), mermaFuente,
  })

  return (
    <div className="mb-3 rounded-sm border border-accent bg-surface p-3">
      <div className="mb-3 flex items-center justify-between">
        <strong className="text-sm">{initial ? 'Editar preparación' : 'Nueva preparación'}</strong>
        <span className="rounded-sm bg-surface2 px-2 py-1 text-[10px] uppercase text-text2">{categoria === 'proteina' ? 'Proteína' : 'Guarnición'}</span>
      </div>
      <label className="text-[11px] text-text2 block mb-1">Nombre</label>
      <input autoFocus type="text" value={nombre} onChange={(event) => setNombre(event.target.value)} className="mb-3 w-full min-h-11 px-[10px] text-sm border border-border rounded-sm bg-bg" />
      <label className="text-[11px] text-text2 block mb-1">Unidad</label>
      <select value={unidadId} onChange={(event) => setUnidadId(event.target.value)} className="mb-2 w-full min-h-11 px-[10px] text-sm border border-border rounded-sm bg-bg">
        {unidades.map((unidad) => <option key={unidad.id} value={unidad.id}>{unidad.nombre}</option>)}
        <option value="__otra__">Otra…</option>
      </select>
      {customUnit && <input type="text" placeholder="Nueva unidad" value={unidadNueva} onChange={(event) => setUnidadNueva(event.target.value)} className="mb-3 w-full min-h-11 px-[10px] text-sm border border-border rounded-sm bg-bg" />}
      <div className="mb-3 grid grid-cols-2 gap-2">
        {categoria === 'proteina' ? <>
          <label className="text-[11px] text-text2">Unidades/caja<input type="number" inputMode="decimal" min={0.01} value={caja} onChange={(event) => setCaja(event.target.value)} className="mt-1 w-full min-h-11 px-[10px] text-sm border border-border rounded-sm bg-bg" /></label>
          <label className="text-[11px] text-text2">Unidades/ración<input type="number" inputMode="decimal" min={0.01} value={racion} onChange={(event) => setRacion(event.target.value)} className="mt-1 w-full min-h-11 px-[10px] text-sm border border-border rounded-sm bg-bg" /></label>
        </> : <>
          <label className="text-[11px] text-text2">Bolsa (kg)<input type="number" inputMode="decimal" min={0.1} step={0.1} value={peso} onChange={(event) => setPeso(event.target.value)} className="mt-1 w-full min-h-11 px-[10px] text-sm border border-border rounded-sm bg-bg" /></label>
          <label className="text-[11px] text-text2">g netos/ración<input type="number" inputMode="numeric" min={1} value={gramos} onChange={(event) => setGramos(event.target.value)} className="mt-1 w-full min-h-11 px-[10px] text-sm border border-border rounded-sm bg-bg" /></label>
        </>}
      </div>
      <MermaCatalogoField value={merma} suggestion={suggestion} onChange={(value, source) => { setMerma(value); setMermaFuente(source) }} />
      {error && <div role="alert" className="mt-2 text-xs text-red">{error}</div>}
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button type="button" onClick={onCancel} className="min-h-11 rounded-sm border border-border bg-surface text-xs font-semibold">Cancelar</button>
        <button type="button" disabled={saving} onClick={() => void submit()} className="min-h-11 rounded-sm bg-accent text-xs font-semibold text-white disabled:opacity-50">{merma || categoria === 'proteina' ? 'Guardar y calcular' : 'Guardar'}</button>
      </div>
    </div>
  )
}
