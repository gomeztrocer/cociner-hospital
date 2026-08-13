// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { reportAppError, useErrorTraceStore } from '../../store/useErrorTraceStore'
import ErrorTracePopup from './ErrorTracePopup'

describe('ErrorTracePopup', () => {
  beforeEach(() => {
    useErrorTraceStore.getState().clear()
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
  })

  afterEach(() => { cleanup(); vi.restoreAllMocks() })

  it('muestra fase, acción, referencia y permite revisar la cola completa', () => {
    const first = reportAppError({ fase: 'Fase 1 · Comensales', accion: 'Guardar comensales', error: new Error('No se guardó') })
    reportAppError({ fase: 'Dashboard', accion: 'Consultar resumen', error: new Error('No cargó') })
    render(<ErrorTracePopup />)

    expect(screen.getByRole('alertdialog')).toBeTruthy()
    expect(screen.getByText('Fase 1 · Comensales')).toBeTruthy()
    expect(screen.getByText('Guardar comensales')).toBeTruthy()
    expect(screen.getByText(first.id)).toBeTruthy()
    expect(screen.getByText('Quedan 1 incidencias por revisar.')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Entendido' }))
    expect(screen.getByText('Dashboard')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Entendido' }))
    expect(screen.queryByRole('alertdialog')).toBeNull()
  })
})
