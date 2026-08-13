import type { EmbarquetadoCentro, GuarnicionResult } from '../../lib/calculos'
import DistribucionBarquetasCentros from './DistribucionBarquetasCentros'

export interface ProduccionGuarnicionDraft {
  producidoKg: string
  barquetas: string
  notas: string
}

export interface ProduccionGuarnicionCalculada {
  id: string
  nombre: string
  resultado: GuarnicionResult
  distribucion: EmbarquetadoCentro[]
}

interface ProduccionGuarnicionConfirmacionItemProps {
  produccion: ProduccionGuarnicionCalculada
  draft: ProduccionGuarnicionDraft
  racionesPorBarqueta: number
  onChange: (draft: ProduccionGuarnicionDraft) => void
}

function formatKg(gramos: number): string {
  return `${(gramos / 1000).toLocaleString('es-ES', { maximumFractionDigits: 3 })} kg`
}

const ProduccionGuarnicionConfirmacionItem = ({
  produccion,
  draft,
  racionesPorBarqueta,
  onChange,
}: ProduccionGuarnicionConfirmacionItemProps) => (
  <section className="rounded-lg border border-border bg-surface p-3">
    <h4 className="text-sm font-semibold text-text">{produccion.nombre}</h4>
    <dl className="mt-2 grid grid-cols-2 gap-2 text-xs">
      <div className="rounded-sm bg-surface2 p-2">
        <dt className="text-text3">Cantidad calculada</dt>
        <dd className="mt-1 font-mono font-semibold text-text">{formatKg(produccion.resultado.netoNecesario)}</dd>
      </div>
      <div className="rounded-sm bg-surface2 p-2">
        <dt className="text-text3">Raciones calculadas</dt>
        <dd className="mt-1 font-mono font-semibold text-text">{produccion.resultado.totalPacientes}</dd>
      </div>
    </dl>

    <div className="mt-3 grid grid-cols-2 gap-3">
      <div>
        <label htmlFor={`producido-${produccion.id}`} className="mb-1 block text-[11px] font-medium text-text2">
          Cantidad producida (kg)
        </label>
        <input
          id={`producido-${produccion.id}`}
          type="number"
          min="0.001"
          step="0.001"
          inputMode="decimal"
          value={draft.producidoKg}
          onChange={(event) => onChange({ ...draft, producidoKg: event.target.value })}
          className="w-full rounded-lg border border-border bg-bg px-3 py-[10px] text-sm text-text outline-none focus:border-accent"
        />
      </div>
      <div>
        <label htmlFor={`barquetas-${produccion.id}`} className="mb-1 block text-[11px] font-medium text-text2">
          Barquetas reales
        </label>
        <input
          id={`barquetas-${produccion.id}`}
          type="number"
          min="0"
          step="1"
          inputMode="numeric"
          value={draft.barquetas}
          onChange={(event) => onChange({ ...draft, barquetas: event.target.value })}
          className="w-full rounded-lg border border-border bg-bg px-3 py-[10px] text-sm text-text outline-none focus:border-accent"
        />
      </div>
    </div>

    <DistribucionBarquetasCentros
      distribucion={produccion.distribucion}
      racionesPorBarqueta={racionesPorBarqueta}
    />

    <label htmlFor={`notas-${produccion.id}`} className="mb-1 mt-3 block text-[11px] font-medium text-text2">
      Notas
    </label>
    <textarea
      id={`notas-${produccion.id}`}
      rows={2}
      value={draft.notas}
      onChange={(event) => onChange({ ...draft, notas: event.target.value })}
      placeholder="Opcional"
      className="w-full resize-none rounded-lg border border-border bg-bg px-3 py-[10px] text-sm text-text outline-none placeholder:text-text3 focus:border-accent"
    />
  </section>
)

export default ProduccionGuarnicionConfirmacionItem
