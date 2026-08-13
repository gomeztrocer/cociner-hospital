// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { useAppStore } from '../../store/useAppStore'
import ConfirmarProduccionGuarniciones from './ConfirmarProduccionGuarniciones'

const mocks = vi.hoisted(() => ({ addRegistrosProduccion: vi.fn(), signOut: vi.fn() }))

vi.mock('../../hooks/useHistorial', () => ({
  useHistorial: () => ({ addRegistrosProduccion: mocks.addRegistrosProduccion }),
}))
vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'chef-1', token: 'token-sesion', rol: 'chef' }, signOut: mocks.signOut }),
}))

const resultado = {
  totalPacientes: 120, racionG: 60, netoNecesario: 7200, brutoNecesario: 10000,
  netoReal: 8000, bolsas: 4, sobrante: 800, mermaP: 20,
}

describe('ConfirmarProduccionGuarniciones', () => {
  beforeEach(() => {
    mocks.addRegistrosProduccion.mockReset()
    mocks.addRegistrosProduccion.mockResolvedValue({})
    useAppStore.setState((state) => ({
      ...state,
      fechaTrabajo: '2026-08-12', servicio: 'almuerzo',
      centros: [{ id: 'sur', nombre: 'Sur', color: '#1B5E3F', paxAlmuerzo: 120, paxCena: 120 }],
      pacientes: { sur: 120 },
      pacientesPorServicio: { almuerzo: { sur: 120 }, cena: { sur: 120 } },
      disponibilidadPorServicio: { almuerzo: { sur: true }, cena: { sur: true } },
      guarniciones: [
        { id: 'arroz', nombre: 'Arroz', bolsaKg: 2.5, merma: -200, mermaDefinida: true, mermaAuto: true, mermaSource: '', gramos: 60, gramosManual: false, pacientesAsignados: 120 },
        { id: 'menestra', nombre: 'Menestra', bolsaKg: 2.5, merma: 20, mermaDefinida: true, mermaAuto: true, mermaSource: '', gramos: 60, gramosManual: false, pacientesAsignados: 120 },
      ],
      resultadosGuarniciones: { arroz: resultado, menestra: resultado },
    }))
  })

  afterEach(cleanup)

  it('confirma dos guarniciones en una operación y crea dos producciones identificables', async () => {
    render(<MemoryRouter><ConfirmarProduccionGuarniciones /></MemoryRouter>)
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar y registrar producción' }))
    expect((screen.getByLabelText('Fecha de producción') as HTMLInputElement).value).toBe('2026-08-12')
    expect(screen.getByText('Almuerzo')).toBeTruthy()
    expect(screen.getAllByText('Cantidad calculada')).toHaveLength(2)
    expect(screen.getAllByText('7,2 kg')).toHaveLength(2)
    expect(screen.getAllByLabelText('Cantidad producida (kg)')).toHaveLength(2)
    expect(screen.getAllByLabelText('Barquetas reales')).toHaveLength(2)
    expect(screen.getAllByText('Total: 6 barquetas')).toHaveLength(2)

    fireEvent.change(document.querySelector('#producido-arroz') as HTMLInputElement, { target: { value: '7.5' } })
    fireEvent.click(screen.getByRole('button', { name: 'Registrar producción' }))

    await waitFor(() => expect(mocks.addRegistrosProduccion).toHaveBeenCalledTimes(1))
    const payload = mocks.addRegistrosProduccion.mock.calls[0][0]
    expect(payload.fecha).toBe('2026-08-12')
    expect(payload.servicio).toBe('Almuerzo')
    expect(payload.producciones).toHaveLength(2)
    expect(payload.producciones.map((item: { plato: string }) => item.plato)).toEqual(['Arroz', 'Menestra'])
    expect(payload.producciones[0]).toMatchObject({ raciones: 120, cantidadCalculadaG: 7200, cantidadProducidaG: 7500, barquetas: 6 })
    expect(payload.producciones[1]).toMatchObject({ raciones: 120, cantidadCalculadaG: 7200, cantidadProducidaG: 7200, barquetas: 6 })
  })

  it('muestra el error de sesión y ofrece volver a iniciar sesión', async () => {
    mocks.addRegistrosProduccion.mockResolvedValueOnce({ error: 'Tu sesión ha caducado. Inicia sesión de nuevo.', sessionExpired: true })
    render(<MemoryRouter><ConfirmarProduccionGuarniciones /></MemoryRouter>)
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar y registrar producción' }))
    fireEvent.click(screen.getByRole('button', { name: 'Registrar producción' }))
    expect((await screen.findByRole('alert')).textContent).toContain('Tu sesión ha caducado')
    expect(screen.getByRole('button', { name: 'Iniciar sesión de nuevo' })).toBeTruthy()
  })

  it('mantiene visible la acción e indica qué guarnición falta calcular', () => {
    useAppStore.setState((state) => ({
      ...state,
      resultadosGuarniciones: { arroz: resultado },
    }))

    render(<MemoryRouter><ConfirmarProduccionGuarniciones /></MemoryRouter>)

    expect(screen.getByRole('button', { name: 'Confirmar y registrar producción' })).toHaveProperty('disabled', true)
    expect(screen.getByRole('status').textContent).toContain('Menestra')
  })
})
