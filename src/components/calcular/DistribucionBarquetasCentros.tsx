import type { EmbarquetadoCentro } from '../../lib/calculos'

interface DistribucionBarquetasCentrosProps {
  distribucion: EmbarquetadoCentro[]
  racionesPorBarqueta: number
}

export default function DistribucionBarquetasCentros({
  distribucion,
  racionesPorBarqueta,
}: DistribucionBarquetasCentrosProps) {
  return (
    <section className="mt-3 border-t border-border pt-3">
      <h4 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-text3">
        Barquetas por centro · {racionesPorBarqueta} raciones de guarnición cada una
      </h4>
      <div className="space-y-2">
        {distribucion.map((centro) => (
          <div key={centro.id} className="rounded-sm bg-surface2 px-3 py-2">
            <div className="flex items-center justify-between gap-2">
              <span className="flex min-w-0 items-center gap-2 text-xs font-semibold text-text">
                <span
                  aria-hidden="true"
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ background: centro.color }}
                />
                <span className="truncate">{centro.nombre}</span>
              </span>
              <span className="shrink-0 font-mono text-xs text-text2">
                {centro.raciones} raciones
              </span>
            </div>
            <div className="mt-1 text-[11px] leading-5 text-text2">
              <span>
                {centro.barquetasCompletas} {centro.barquetasCompletas === 1 ? 'completa' : 'completas'}
              </span>
              {centro.racionesParcial > 0 ? (
                <span> · 1 parcial ({centro.racionesParcial} raciones)</span>
              ) : null}
              <span className="block font-semibold text-text">
                Total: {centro.barquetasMultiporcion} barqueta{centro.barquetasMultiporcion === 1 ? '' : 's'}
              </span>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
