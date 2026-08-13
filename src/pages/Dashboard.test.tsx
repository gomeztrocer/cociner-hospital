// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useAppStore } from '../store/useAppStore'
import Dashboard from './Dashboard'

vi.mock('../hooks/useAuth', () => ({ useAuth: () => ({ user: { id: 'chef-1', rol: 'chef' } }) }))
vi.mock('../hooks/useDashboard', () => ({
  useDashboard: () => ({
    loading: false,
    error: null,
    data: {
      total_raciones: 120,
      total_barquetas: 6,
      total_elaboraciones: 1,
      dias_con_registro: 1,
      media_diaria: 120,
      media_barquetas_diaria: 6,
      hechos_hoy: 1,
      barquetas_hoy: 6,
      top_platos: [{ plato: 'Arroz', raciones: 120, barquetas: 6 }],
      ultimos_registros: [{ id: 'registro-1', plato: 'Arroz', raciones: 120, barquetas: 6, cantidad_calculada_g: 7200, cantidad_producida_g: 7500, distribucion_centros: [], servicio: 'Almuerzo', categoria: 'guarnicion', fecha: '2026-08-12', created_at: '2026-08-12T10:00:00Z', chef: 'Chef' }],
    },
  }),
}))
vi.mock('../hooks/useProduccionPorDia', () => ({ useProduccionPorDia: () => ({ data: [], loading: false, error: null }) }))
vi.mock('../hooks/useProduccionPorSemana', () => ({ useProduccionPorSemana: () => ({ data: [], loading: false, error: null }) }))
vi.mock('../components/dashboard/BarChartVertical', () => ({ default: () => <div data-testid="chart" /> }))

describe('Dashboard', () => {
  beforeEach(() => {
    useAppStore.setState((state) => ({ ...state, user: { id: 'chef-1', username: 'chef', nombre_completo: 'Chef', rol: 'chef', token: 'token' } }))
  })
  afterEach(cleanup)

  it('muestra las barquetas registradas sin derivarlas de las raciones', () => {
    render(<Dashboard />)
    expect(screen.getByText('Barquetas este mes').parentElement?.textContent).toContain('6')
    expect(screen.getAllByText('6 barq.')).toHaveLength(2)
    expect(screen.queryByText('12 barq.')).toBeNull()
  })
})
