import type { MermaSugerida } from '../../lib/catalogo'

interface MermaCatalogoFieldProps {
  value: string
  suggestion: MermaSugerida | null
  onChange: (value: string, source: string | null) => void
}

export default function MermaCatalogoField({ value, suggestion, onChange }: MermaCatalogoFieldProps) {
  return (
    <div>
      <label className="text-[11px] text-text2 block mb-1">Merma % (opcional)</label>
      <input
        type="number"
        inputMode="decimal"
        min={-300}
        max={80}
        placeholder="Sin definir"
        value={value}
        onChange={(event) => onChange(event.target.value, null)}
        className="w-full min-h-11 px-[10px] py-[7px] text-sm border border-border rounded-sm bg-bg text-text"
      />
      {suggestion ? (
        <div className="mt-2 rounded-sm border border-accent bg-accent-light p-2 text-[11px] text-accent">
          <div className="font-semibold">Merma sugerida: {suggestion.valor} %</div>
          <div className="mt-0.5 text-[10px]">{suggestion.fuente}</div>
          <button
            type="button"
            onClick={() => onChange(String(suggestion.valor), suggestion.fuente)}
            className="mt-2 min-h-11 w-full rounded-sm border border-accent bg-surface font-semibold"
          >
            Aceptar sugerencia
          </button>
        </div>
      ) : <div className="mt-1 text-[10px] italic text-text3">Sin definir — no hay una referencia razonable.</div>}
    </div>
  )
}
