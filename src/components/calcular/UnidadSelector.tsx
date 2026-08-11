import { useState } from 'react'
import type { UnidadCatalogo } from '../../types/catalogo'

interface UnidadSelectorProps {
  unidades: UnidadCatalogo[]
  value: string
  onChange: (value: string) => void
  compact?: boolean
}

export default function UnidadSelector({ unidades, value, onChange, compact = false }: UnidadSelectorProps) {
  const known = unidades.some((unidad) => unidad.nombre === value)
  const [custom, setCustom] = useState(!known && value ? value : '')
  const selected = known ? value : '__otra__'

  return (
    <div className={compact ? '' : 'space-y-2'}>
      <select
        aria-label="Unidad"
        value={selected}
        onChange={(event) => {
          const next = event.target.value
          if (next === '__otra__') onChange(custom)
          else onChange(next)
        }}
        className="w-full min-h-11 px-[10px] py-[7px] text-sm border border-border rounded-sm bg-surface text-text"
      >
        {unidades.map((unidad) => <option key={unidad.id} value={unidad.nombre}>{unidad.nombre}</option>)}
        {!known && value && <option value={value}>{value}</option>}
        <option value="__otra__">Otra…</option>
      </select>
      {selected === '__otra__' && (
        <input
          type="text"
          aria-label="Otra unidad"
          placeholder="Escribe la unidad"
          value={custom}
          onChange={(event) => { setCustom(event.target.value); onChange(event.target.value) }}
          className="w-full min-h-11 px-[10px] py-[7px] text-sm border border-border rounded-sm bg-bg text-text"
        />
      )}
    </div>
  )
}
