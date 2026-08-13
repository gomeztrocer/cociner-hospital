import { useState } from 'react'
import { IconAlertTriangle, IconCheck, IconCopy, IconX } from '@tabler/icons-react'
import { useErrorTraceStore } from '../../store/useErrorTraceStore'

export default function ErrorTracePopup() {
  const trace = useErrorTraceStore((state) => state.errors[0] ?? null)
  const total = useErrorTraceStore((state) => state.errors.length)
  const dismiss = useErrorTraceStore((state) => state.dismiss)
  const [copied, setCopied] = useState(false)

  if (!trace) return null

  const copyTrace = async (): Promise<void> => {
    const content = [
      `Referencia: ${trace.id}`,
      `Fase: ${trace.fase}`,
      `Acción: ${trace.accion}`,
      `Fecha: ${trace.occurredAt}`,
      `Error: ${trace.mensaje}`,
      trace.entidadId ? `Registro: ${trace.entidadId}` : '',
      `Detalle: ${trace.detalle}`,
    ].filter(Boolean).join('\n')
    try {
      await navigator.clipboard.writeText(content)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2_000)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/40 p-3 sm:items-center">
      <section role="alertdialog" aria-modal="true" aria-labelledby="error-trace-title" className="w-full max-w-md rounded-xl border border-red bg-surface p-4 shadow-lg">
        <div className="flex items-start gap-3">
          <IconAlertTriangle size={22} className="mt-0.5 shrink-0 text-red" />
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <h2 id="error-trace-title" className="text-sm font-semibold text-text">No se completó la operación</h2>
              <button type="button" onClick={dismiss} aria-label="Cerrar aviso" className="min-h-11 min-w-11 text-text3"><IconX size={18} className="mx-auto" /></button>
            </div>
            <p className="mt-1 text-xs leading-relaxed text-red">{trace.mensaje}</p>
            <dl className="mt-3 grid grid-cols-[80px_1fr] gap-x-2 gap-y-1 text-[11px]">
              <dt className="text-text3">Fase</dt><dd className="font-medium text-text">{trace.fase}</dd>
              <dt className="text-text3">Acción</dt><dd className="font-medium text-text">{trace.accion}</dd>
              <dt className="text-text3">Hora</dt><dd className="font-mono text-text2">{new Date(trace.occurredAt).toLocaleString('es-ES')}</dd>
              <dt className="text-text3">Referencia</dt><dd className="break-all font-mono font-semibold text-text">{trace.id}</dd>
            </dl>
            <details className="mt-3 text-[11px] text-text2">
              <summary className="cursor-pointer font-semibold">Detalle técnico</summary>
              <p className="mt-1 break-words rounded-sm bg-surface2 p-2 font-mono">{trace.detalle}</p>
            </details>
            {total > 1 && <p className="mt-2 text-[10px] text-warn">Quedan {total - 1} incidencias por revisar.</p>}
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button type="button" onClick={() => void copyTrace()} className="flex min-h-11 items-center justify-center gap-2 rounded-lg border border-border text-xs font-semibold text-text2">
            {copied ? <IconCheck size={15} /> : <IconCopy size={15} />}{copied ? 'Copiado' : 'Copiar detalle'}
          </button>
          <button type="button" onClick={dismiss} className="min-h-11 rounded-lg bg-accent text-xs font-semibold text-white">Entendido</button>
        </div>
      </section>
    </div>
  )
}
