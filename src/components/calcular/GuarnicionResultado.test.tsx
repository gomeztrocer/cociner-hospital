// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import type { EmbarquetadoCentro, GuarnicionResult } from '../../lib/calculos'
import GuarnicionResultado from './GuarnicionResultado'

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
  id: 'sur', nombre: 'Sur', color: '#1B5E3F', raciones: 26, envasesMonoporcion: 26,
  barquetasCompletas: 2, racionesParcial: 6, barquetasMultiporcion: 3, pesoEstimadoKg: null,
}]

const distribucionDoble: EmbarquetadoCentro[] = [{
  ...distribucion[0], raciones: 120, envasesMonoporcion: 120,
  barquetasCompletas: 6, racionesParcial: 0, barquetasMultiporcion: 6,
}]

describe('GuarnicionResultado', () => {
  afterEach(cleanup)

  it('muestra completas, parcial, raciones de la parcial y total por centro', () => {
    render(<GuarnicionResultado nombre="Arroz" resultado={resultado} distribucion={distribucion} racionesPorBarqueta={10} />)
    expect(screen.getByText('Sur')).toBeTruthy()
    expect(screen.getByText('26 raciones')).toBeTruthy()
    expect(screen.getByText(/2 completas/)).toBeTruthy()
    expect(screen.getByText(/1 parcial \(6 raciones\)/)).toBeTruthy()
    expect(screen.getByText('Total: 3 barquetas')).toBeTruthy()
  })

  it('muestra seis barquetas por guarnición y doce físicas en total para Sur', () => {
    render(<><GuarnicionResultado nombre="Arroz" resultado={resultado} distribucion={distribucionDoble} racionesPorBarqueta={20} /><GuarnicionResultado nombre="Menestra" resultado={resultado} distribucion={distribucionDoble} racionesPorBarqueta={20} /></>)
    expect(screen.getAllByText('120 raciones')).toHaveLength(2)
    expect(screen.getAllByText('Total: 6 barquetas')).toHaveLength(2)
  })

  it('no registra directamente sin pasar por la confirmación conjunta', () => {
    render(<GuarnicionResultado nombre="Arroz" resultado={resultado} distribucion={distribucion} racionesPorBarqueta={10} />)
    expect(screen.queryByRole('button', { name: 'Guardar como preparación' })).toBeNull()
    expect(screen.getByText(/Resultado · Arroz/)).toBeTruthy()
  })
})
