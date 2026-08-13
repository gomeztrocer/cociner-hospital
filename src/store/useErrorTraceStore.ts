import { create } from 'zustand'

export interface ErrorTraceInput {
  fase: string
  accion: string
  error: unknown
  mensaje?: string
  entidadId?: string
}

export interface ErrorTrace {
  id: string
  fase: string
  accion: string
  mensaje: string
  detalle: string
  entidadId?: string
  occurredAt: string
}

interface ErrorTraceState {
  errors: ErrorTrace[]
  report: (input: ErrorTraceInput) => ErrorTrace
  dismiss: () => void
  clear: () => void
}

const MAX_ERRORS = 20
const DEDUPE_MS = 1_500

function errorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim()) return error.message
  if (typeof error === 'string' && error.trim()) return error
  return 'No se pudo completar la operación.'
}

function technicalDetail(error: unknown): string {
  if (error instanceof Error) return `${error.name}: ${error.message}`
  if (error && typeof error === 'object') {
    const source = error as Record<string, unknown>
    const safe = Object.fromEntries(
      ['code', 'status', 'message', 'details', 'hint']
        .filter((key) => source[key] != null)
        .map((key) => [key, source[key]]),
    )
    if (Object.keys(safe).length > 0) return JSON.stringify(safe)
  }
  return String(error)
}

function existingTraceId(error: unknown): string | null {
  if (!error || typeof error !== 'object') return null
  const traceId = (error as Record<string, unknown>).traceId
  return typeof traceId === 'string' ? traceId : null
}

function createTraceId(): string {
  const timestamp = Date.now().toString(36).toUpperCase()
  const random = globalThis.crypto?.randomUUID?.().slice(0, 8).toUpperCase()
    ?? Math.random().toString(36).slice(2, 10).toUpperCase()
  return `CH-${timestamp}-${random}`
}

export const useErrorTraceStore = create<ErrorTraceState>((set, get) => ({
  errors: [],
  report: (input) => {
    const mensaje = input.mensaje?.trim() || errorMessage(input.error)
    const now = Date.now()
    const duplicate = get().errors.find((item) => (
      item.fase === input.fase
      && item.accion === input.accion
      && item.mensaje === mensaje
      && now - Date.parse(item.occurredAt) < DEDUPE_MS
    ))
    if (duplicate) return duplicate

    const trace: ErrorTrace = {
      id: createTraceId(),
      fase: input.fase,
      accion: input.accion,
      mensaje,
      detalle: technicalDetail(input.error),
      entidadId: input.entidadId,
      occurredAt: new Date(now).toISOString(),
    }
    set((state) => ({ errors: [...state.errors, trace].slice(-MAX_ERRORS) }))
    console.error(`[CocinerHosp ${trace.id}]`, trace)
    return trace
  },
  dismiss: () => set((state) => ({ errors: state.errors.slice(1) })),
  clear: () => set({ errors: [] }),
}))

export function reportAppError(input: ErrorTraceInput): ErrorTrace {
  const referencedId = existingTraceId(input.error)
  const referenced = referencedId
    ? useErrorTraceStore.getState().errors.find((item) => item.id === referencedId)
    : undefined
  return referenced ?? useErrorTraceStore.getState().report(input)
}
