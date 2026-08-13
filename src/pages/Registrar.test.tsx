// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Registro } from '../hooks/useHistorial'
import Registrar from './Registrar'

const mocks = vi.hoisted(() => ({
  user: {
    id: 'admin-1',
    username: 'admin',
    nombre_completo: 'Administradora',
    rol: 'admin',
    token: 'token-sesion',
  },
  registros: [] as Registro[],
  addRegistro: vi.fn(),
  updateRegistro: vi.fn(),
  deleteRegistro: vi.fn(),
  refresh: vi.fn(),
}))

vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({ user: mocks.user }),
}))

vi.mock('../hooks/useHistorial', () => ({
  useHistorial: () => ({
    registros: mocks.registros,
    loading: false,
    error: null,
    addRegistro: mocks.addRegistro,
    updateRegistro: mocks.updateRegistro,
    deleteRegistro: mocks.deleteRegistro,
    refresh: mocks.refresh,
  }),
}))

const registro: Registro = {
  id: '11111111-1111-4111-8111-111111111111',
  usuario_id: '22222222-2222-4222-8222-222222222222',
  usuario_nombre: 'Chef Prueba',
  plato: 'Arroz',
  servicio: 'Almuerzo',
  raciones: 120,
  fecha: '2026-08-10',
  notas: 'Sin sal',
  categoria: 'manual',
  barquetas: 12,
  cantidad_calculada_g: null,
  cantidad_producida_g: null,
  distribucion_centros: [],
  grupo_produccion: null,
  created_at: '2026-08-10T10:00:00.000Z',
  updated_at: null,
}

describe('Registrar', () => {
  beforeEach(() => {
    mocks.user.rol = 'admin'
    mocks.registros = []
    mocks.addRegistro.mockReset()
    mocks.updateRegistro.mockReset()
    mocks.deleteRegistro.mockReset()
    mocks.refresh.mockReset()
    mocks.addRegistro.mockResolvedValue({})
    mocks.updateRegistro.mockResolvedValue({})
    mocks.deleteRegistro.mockResolvedValue({})
  })

  afterEach(() => {
    cleanup()
  })

  it('registra producción para una fecha anterior', async () => {
    render(<Registrar />)

    fireEvent.change(screen.getByLabelText('Fecha de producción'), { target: { value: '2026-08-01' } })
    fireEvent.change(screen.getByLabelText('Plato elaborado'), { target: { value: 'Menestra' } })
    fireEvent.change(screen.getByLabelText('Raciones totales'), { target: { value: '90' } })
    fireEvent.change(screen.getByLabelText('Barquetas reales'), { target: { value: '9' } })
    fireEvent.change(screen.getByLabelText('Servicio'), { target: { value: 'Cena' } })
    fireEvent.click(screen.getByRole('button', { name: 'Guardar en historial' }))

    await waitFor(() => {
      expect(mocks.addRegistro).toHaveBeenCalledWith({
        plato: 'Menestra',
        servicio: 'Cena',
        raciones: 90,
        fecha: '2026-08-01',
        barquetas: 9,
      })
    })
  })

  it('permite a la administradora editar un registro existente', async () => {
    mocks.registros = [registro]
    render(<Registrar />)

    fireEvent.click(screen.getByRole('button', { name: 'Editar Arroz' }))
    const dialog = screen.getByRole('dialog', { name: 'Editar registro' })
    fireEvent.change(within(dialog).getByLabelText('Plato elaborado'), { target: { value: 'Arroz integral' } })
    fireEvent.change(within(dialog).getByLabelText('Raciones'), { target: { value: '100' } })
    fireEvent.change(within(dialog).getByLabelText('Servicio'), { target: { value: 'Cena' } })
    fireEvent.change(within(dialog).getByLabelText('Fecha de producción'), { target: { value: '2026-08-09' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Guardar cambios' }))

    await waitFor(() => {
      expect(mocks.updateRegistro).toHaveBeenCalledWith({
        id: registro.id,
        plato: 'Arroz integral',
        servicio: 'Cena',
        raciones: 100,
        fecha: '2026-08-09',
        notas: 'Sin sal',
        barquetas: 12,
        cantidadCalculadaG: null,
        cantidadProducidaG: null,
        distribucionCentros: [],
      })
    })
  })

  it('exige una confirmación separada antes de eliminar', async () => {
    mocks.registros = [registro]
    render(<Registrar />)

    fireEvent.click(screen.getByRole('button', { name: 'Eliminar Arroz' }))
    const dialog = screen.getByRole('dialog', { name: 'Eliminar registro' })
    expect(mocks.deleteRegistro).not.toHaveBeenCalled()
    expect(within(dialog).getByText(/dejará de aparecer y de sumar en el Dashboard/i)).toBeTruthy()

    fireEvent.click(within(dialog).getByRole('button', { name: 'Confirmar eliminación' }))
    await waitFor(() => expect(mocks.deleteRegistro).toHaveBeenCalledWith(registro.id))
  })

  it('no muestra acciones de edición ni borrado a un usuario no administrador', () => {
    mocks.user.rol = 'cocinero'
    mocks.registros = [registro]
    render(<Registrar />)

    expect(screen.queryByRole('button', { name: 'Editar Arroz' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Eliminar Arroz' })).toBeNull()
  })
})
