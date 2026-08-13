import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { reportAppError, useErrorTraceStore } from './useErrorTraceStore'

describe('useErrorTraceStore', () => {
  beforeEach(() => {
    useErrorTraceStore.getState().clear()
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
  })

  afterEach(() => { vi.restoreAllMocks() })

  it('crea una referencia trazable y evita duplicados inmediatos', () => {
    const first = reportAppError({ fase: 'Usuarios', accion: 'Crear usuario', error: new Error('Servidor no disponible') })
    const duplicate = reportAppError({ fase: 'Usuarios', accion: 'Crear usuario', error: new Error('Servidor no disponible') })

    expect(first.id).toMatch(/^CH-/)
    expect(duplicate.id).toBe(first.id)
    expect(useErrorTraceStore.getState().errors).toHaveLength(1)
  })

  it('mantiene una cola y conserva una referencia recibida desde la API', () => {
    const first = reportAppError({ fase: 'Historial', accion: 'Crear registro', error: new Error('Fallo') })
    const referenced = reportAppError({ fase: 'Otra capa', accion: 'Repetir', error: { traceId: first.id } })
    reportAppError({ fase: 'Dashboard', accion: 'Consultar resumen', error: new Error('Sin respuesta') })

    expect(referenced.id).toBe(first.id)
    expect(useErrorTraceStore.getState().errors).toHaveLength(2)
    useErrorTraceStore.getState().dismiss()
    expect(useErrorTraceStore.getState().errors[0]?.fase).toBe('Dashboard')
  })
})
