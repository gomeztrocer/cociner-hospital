// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { EmbarquetadoCentro, GuarnicionResult } from '../../lib/calculos'
import { useAppStore } from '../../store/useAppStore'
import GuarnicionResultado from './GuarnicionResultado'

const historial = vi.hoisted(() => ({
  addRegistro: vi.fn(),
}))

vi.mock('../../hooks/useHistorial', () => ({
  useHistorial: () => ({
    registros: [],
    loading: false,
    error: null,
    addRegistro: historial.addRegistro,
  }),
}))

const resultado: GuarnicionResult = {
  totalPacientes: 26,
  racionG: 60,
  netoNecesario: 1560,
  brutoNecesario: 2500,
  netoReal: 2000,
  bolsas: 1,
  sobrante: 440,
  mermaP: 20,
}

const distribucion: EmbarquetadoCentro[] = [{
  id: 'sur',
  nombre: 'Sur',
  color: '#1B5E3F',
  raciones: 26,
  envasesMonoporcion: 26,
  barquetasCompletas: 2,
  racionesParcial: 6,
  barquetasMultiporcion: 3,
  pesoEstimadoKg: null,
}]

const distribucionDoble: EmbarquetadoCentro[] = [{
  ...distribucion[0],
  raciones: 120,
  envasesMonoporcion: 120,
  barquetasCompletas: 6,
  racionesParcial: 0,
  barquetasMultiporcion: 6,
}]

describe('GuarnicionResultado', () => {
  afterEach(() => {
    cleanup()
  })

  beforeEach(() => {
    historial.addRegistro.mockReset()
    historial.addRegistro.mockResolvedValue({})
    useAppStore.setState({
      servicio: 'cena',
      user: {
        id: 'chef-1',
        username: 'chef',
        nombre_completo: 'Chef de prueba',
        rol: 'chef',
        token: 'token-prueba',
      },
    })
  })

  it('muestra completas, parcial, raciones de la parcial y total por centro', () => {
    render(<GuarnicionResultado nombre="Arroz" resultado={resultado} distribucion={distribucion} racionesPorBarqueta={10} />)

    expect(screen.getByText('Sur')).toBeTruthy()
    expect(screen.getByText('26 raciones')).toBeTruthy()
    expect(screen.getByText(/2 completas/)).toBeTruthy()
    expect(screen.getByText(/1 parcial \(6 raciones\)/)).toBeTruthy()
    expect(screen.getByText('Total: 3 barquetas')).toBeTruthy()
  })

  it('muestra seis barquetas por guarnición y doce físicas en total para Sur', () => {
    render(<>
      <GuarnicionResultado nombre="Arroz" resultado={resultado} distribucion={distribucionDoble} racionesPorBarqueta={20} />
      <GuarnicionResultado nombre="Menestra" resultado={resultado} distribucion={distribucionDoble} racionesPorBarqueta={20} />
    </>)

    expect(screen.getAllByText('120 raciones')).toHaveLength(2)
    expect(screen.getAllByText('Barquetas por centro · 20 raciones de guarnición cada una')).toHaveLength(2)
    expect(screen.getAllByText('Total: 6 barquetas')).toHaveLength(2)
  })

  it('guarda en el historial los mismos comensales usados por el cálculo', async () => {
    render(<GuarnicionResultado nombre="Arroz" resultado={resultado} distribucion={distribucion} racionesPorBarqueta={10} />)

    fireEvent.click(screen.getByRole('button', { name: 'Guardar como preparación' }))

    await waitFor(() => {
      expect(historial.addRegistro).toHaveBeenCalledWith({
        plato: 'Arroz',
        servicio: 'Cena',
        raciones: 26,
        categoria: 'guarnicion',
      })
    })
  })
})
