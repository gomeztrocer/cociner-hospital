import { IconCopy, IconDeviceFloppy } from '@tabler/icons-react'

interface Props {
  fecha: string
  loading: boolean
  saving: boolean
  message: string
  error: string
  onFechaChange: (fecha: string) => void
  onCopy: () => void
  onSave: () => void
}

export default function ComensalesToolbar(props: Props) {
  return (
    <div className="mb-3 space-y-2">
      <label className="block text-[11px] text-text2">
        Fecha de trabajo (Tenerife)
        <input
          type="date"
          value={props.fecha}
          onChange={(event) => props.onFechaChange(event.target.value)}
          className="mt-1 w-full px-[10px] py-[7px] text-sm border border-border rounded-sm bg-surface text-text"
        />
      </label>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <button
          type="button"
          onClick={props.onCopy}
          disabled={props.loading || props.saving}
          className="px-3 py-[7px] text-xs font-semibold border border-border rounded-sm bg-surface text-text2 flex items-center justify-center gap-1.5 disabled:opacity-50"
        >
          <IconCopy size={14} />
          Copiar comensales del día anterior
        </button>
        <button
          type="button"
          onClick={props.onSave}
          disabled={props.loading || props.saving}
          className="px-3 py-[7px] text-xs font-semibold border-none rounded-sm text-white flex items-center justify-center gap-1.5 disabled:opacity-50"
          style={{ background: '#1B5E3F' }}
        >
          <IconDeviceFloppy size={14} />
          {props.saving ? 'Guardando...' : 'Guardar comensales'}
        </button>
      </div>
      {props.loading && <div className="text-[11px] text-text3">Cargando jornada...</div>}
      {props.message && <div className="text-[11px] text-accent">{props.message}</div>}
      {props.error && <div className="text-[11px] text-red">{props.error}</div>}
    </div>
  )
}
