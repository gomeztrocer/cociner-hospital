// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getFechaLocalTenerife } from '../lib/comensales'
import { useAppStore } from '../store/useAppStore'
import Blandas from './Blandas'

const mocks = vi.hoisted(() => ({ addRegistro: vi.fn() }))

vi.mock('../hooks/useHistorial', () => ({
  useHistorial: () => ({ addRegistro: mocks.addRegistro }),
}))

describe('Dietas Blandas', () => {
  beforeEach(() => {
    mocks.addRegistro.mockReset()
    mocks.addRegistro.mockResolvedValue({})
    useAppStore.setState((state) => ({
      ...state,
      servicio: 'almuerzo',
      user: {
        id: 'chef-1',
        username: 'chef',
        nombre_completo: 'Chef Prueba',
        rol: 'chef',
        token: 'token-sesion',
      },
    }))
  })

  afterEach(cleanup)

  it('permite elegir hoy o una fecha anterior y muestra las tres elaboraciones', () => {
    render(<Blandas />)

    const fecha = screen.getByLabelText('Fecha de producción') as HTMLInputElement
    expect(fecha.value).toBe(getFechaLocalTenerife())
    expect(fecha.max).toBe(getFechaLocalTenerife())
    expect(screen.getAllByText('Chinos', { exact: false }).length).toBeGreaterThan(0)
    expect(screen.getByText('Molido', { exact: true })).toBeTruthy()
    expect(screen.getAllByText('Puré de papas', { exact: false }).length).toBeGreaterThan(0)

    fireEvent.change(fecha, { target: { value: '2026-08-10' } })
    expect(fecha.value).toBe('2026-08-10')
  })

  it('registra Chino, Molido y Puré como producciones diarias separadas en una fecha anterior', async () => {
    render(<Blandas />)

    fireEvent.change(screen.getByLabelText('Fecha de producción'), { target: { value: '2026-08-10' } })
    fireEvent.click(screen.getByRole('button', { name: 'Cena' }))
    screen.getAllByRole('button', { name: 'Calcular' }).forEach((button) => fireEvent.click(button))
    screen.getAllByRole('button', { name: 'Registrar producción' }).forEach((button) => fireEvent.click(button))

    await waitFor(() => expect(mocks.addRegistro).toHaveBeenCalledTimes(3))
    expect(mocks.addRegistro.mock.calls.map(([registro]) => registro)).toEqual([
      {
        plato: 'Blandas - Chinos Zanahoria',
        servicio: 'Cena',
        raciones: 60,
        categoria: 'blandas',
        fecha: '2026-08-10',
        barquetas: 6,
      },
      {
        plato: 'Blandas - Molido',
        servicio: 'Cena',
        raciones: 200,
        categoria: 'blandas',
        fecha: '2026-08-10',
        barquetas: 20,
      },
      {
        plato: 'Blandas - Puré',
        servicio: 'Cena',
        raciones: 20,
        categoria: 'blandas',
        fecha: '2026-08-10',
        barquetas: 2,
      },
    ])
  })

  it('muestra el error y no confirma un registro fallido', async () => {
    mocks.addRegistro.mockResolvedValueOnce({ error: 'No se pudo guardar la producción' })
    render(<Blandas />)

    fireEvent.click(screen.getAllByRole('button', { name: 'Calcular' })[0]!)
    fireEvent.click(screen.getByRole('button', { name: 'Registrar producción' }))

    expect((await screen.findByRole('alert')).textContent).toContain('No se pudo guardar la producción')
    expect(screen.queryByText(/registrados ✓/i)).toBeNull()
  })
})
