import { describe, it, expect } from 'vitest'
import { calcularProteina, calcularGuarnicion, calcularBandejasHorno, calcularDesgloseCentros, escalarIngredientes, calcularReparto, calcularPesoRecetaKg, calcularEmbarquetadoCentros } from './calculos'
import { CENTROS } from '../data/centros'

describe('calcularProteina', () => {
  it('albóndigas: 5 × 414 = 2070 → CEIL(2070/52) = 40 cajas', () => {
    const result = calcularProteina({
      totalPacientes: 414,
      unidadesPorCaja: 52,
      unidadesPorRacion: 5,
      mermaP: 20,
    })

    expect(result.unidadesNecesarias).toBe(2070)
    expect(result.cajasAbrir).toBe(40)
    expect(result.unidadesDisponibles).toBe(2080)
    expect(result.sobrante).toBe(10)
    expect(result.sobranteRaciones).toBe(2)
  })

  it('muslo pollo: 2 × 50 = 100 → CEIL(100/20) = 5 cajas, 0 sobrante', () => {
    const result = calcularProteina({
      totalPacientes: 50,
      unidadesPorCaja: 20,
      unidadesPorRacion: 2,
      mermaP: 30,
    })

    expect(result.unidadesNecesarias).toBe(100)
    expect(result.cajasAbrir).toBe(5)
    expect(result.unidadesDisponibles).toBe(100)
    expect(result.sobrante).toBe(0)
    expect(result.sobranteRaciones).toBe(0)
  })

  it('hamburguesa: 1 × 414 = 414 → CEIL(414/52) = 8 cajas, sobrante = 2', () => {
    const result = calcularProteina({
      totalPacientes: 414,
      unidadesPorCaja: 52,
      unidadesPorRacion: 1,
      mermaP: 25,
    })

    expect(result.unidadesNecesarias).toBe(414)
    expect(result.cajasAbrir).toBe(8)
    expect(result.unidadesDisponibles).toBe(416)
    expect(result.sobrante).toBe(2)
    expect(result.sobranteRaciones).toBe(2)
  })

  it('quiché con caja=0 retorna 0 cajas', () => {
    const result = calcularProteina({
      totalPacientes: 100,
      unidadesPorCaja: 0,
      unidadesPorRacion: 0,
      mermaP: 10,
    })

    expect(result.cajasAbrir).toBe(0)
    expect(result.unidadesDisponibles).toBe(0)
  })
})

describe('calcularGuarnicion', () => {
  it('habichuelas (22% merma): 50 pac → neto=6000g, bruto=7692g → 4 bolsas', () => {
    const result = calcularGuarnicion({
      totalPacientes: 50,
      bolsaKg: 2.5,
      mermaP: 22,
      racionG: 120,
    })

    expect(result.netoNecesario).toBe(6000)
    expect(result.bolsas).toBe(4)
    // brutoReal = 4 × 2500 = 10000g
    // netoReal = 10000 × (1 - 0.22) = 7800g
    expect(result.netoReal).toBe(7800)
    expect(result.sobrante).toBe(1800)
  })

  it('arroz (absorción ×3): 50 pac → neto=6000g, bruto=2000g → 1 bolsa', () => {
    const result = calcularGuarnicion({
      totalPacientes: 50,
      bolsaKg: 2.5,
      mermaP: -200,
      racionG: 120,
    })

    expect(result.netoNecesario).toBe(6000)
    expect(result.bolsas).toBe(1)
    // factor = 1 + 2.0 = 3
    // brutoReal = 1 × 2500 = 2500g
    // netoReal = 2500 × 3 = 7500g
    expect(result.netoReal).toBe(7500)
  })

  it('2 guarniciones (60g + 60g) con menestra 22% merma', () => {
    const result = calcularGuarnicion({
      totalPacientes: 414,
      bolsaKg: 2.5,
      mermaP: 22,
      racionG: 60,
    })

    expect(result.netoNecesario).toBe(24840)
    expect(result.bolsas).toBe(13)
  })

  it('merma negativa liviana: macarrones -150%', () => {
    const result = calcularGuarnicion({
      totalPacientes: 100,
      bolsaKg: 2.5,
      mermaP: -150,
      racionG: 120,
    })

    expect(result.netoNecesario).toBe(12000)
    // factor = 1 + 1.5 = 2.5
    // brutoNecesario = 12000 / 2.5 = 4800
    // bolsas = CEIL(4800/2500) = 2
    expect(result.bolsas).toBe(2)
  })
})

describe('calcularReparto', () => {
  it('1 guarnición = 100% pacientes', () => {
    expect(calcularReparto(414, 1)).toEqual([414])
  })

  it('2 guarniciones = 50% cada una', () => {
    expect(calcularReparto(414, 2)).toEqual([207, 207])
  })

  it('3 guarniciones = división exacta', () => {
    expect(calcularReparto(414, 3)).toEqual([138, 138, 138])
  })

  it('3 guarniciones con sobrante — primera absorbe', () => {
    expect(calcularReparto(415, 3)).toEqual([139, 138, 138])
  })

  it('2 guarniciones con sobrante — primera absorbe', () => {
    expect(calcularReparto(101, 2)).toEqual([51, 50])
  })

  it('0 pacientes = todo ceros', () => {
    expect(calcularReparto(0, 3)).toEqual([0, 0, 0])
  })
})

describe('calcularBandejasHorno', () => {
  it('25 muslos por bandeja, 100 necesarios → 4 bandejas', () => {
    const result = calcularBandejasHorno({
      unidadesNecesarias: 100,
      capacidadBandeja: 25,
    })

    expect(result).toBe(4)
  })

  it('default capacity is 25', () => {
    const result = calcularBandejasHorno({
      unidadesNecesarias: 110,
    })

    expect(result).toBe(5)
  })
})

describe('calcularDesgloseCentros', () => {
  const centros = CENTROS

  it('almuerzo con 2 unidades por ración', () => {
    const result = calcularDesgloseCentros({
      centros,
      servicio: 'almuerzo',
      unidadesPorRacion: 2,
    })

    expect(result).toHaveLength(6)
    const sur = result.find((c) => c.nombre === 'Sur')
    expect(sur?.pax).toBe(120)
    expect(sur?.unidades).toBe(240)
  })

  it('cena con 1 unidad por ración (Candelaria = 30)', () => {
    const result = calcularDesgloseCentros({
      centros,
      servicio: 'cena',
      unidadesPorRacion: 1,
    })

    const candelaria = result.find((c) => c.nombre === 'Candelaria')
    expect(candelaria?.pax).toBe(30)
    expect(candelaria?.unidades).toBe(30)
  })
})

describe('escalarIngredientes', () => {
  it('414 pacientes, 12 raciones base, 2kg → 69kg', () => {
    const result = escalarIngredientes(
      [{ nombre: 'Pollo', cantidad: 2, unidad: 'kg' }],
      414, 12,
    )
    expect(result[0].cantidad).toBe(69)
  })

  it('raciones_base=0 devuelve ingredientes sin cambios', () => {
    const input = [{ nombre: 'Pollo', cantidad: 2, unidad: 'kg' }]
    const result = escalarIngredientes(input, 414, 0)
    expect(result).toEqual(input)
  })

  it('múltiples ingredientes escalan proporcionalmente', () => {
    const result = escalarIngredientes(
      [
        { nombre: 'Huevo', cantidad: 12, unidad: 'unidades' },
        { nombre: 'Queso', cantidad: 400, unidad: 'g' },
        { nombre: 'Jamón', cantidad: 300, unidad: 'g' },
      ],
      414, 12,
    )
    expect(result[0].cantidad).toBe(414)
    expect(result[1].cantidad).toBe(13800)
    expect(result[2].cantidad).toBe(10350)
  })
})

describe('calcularPesoRecetaKg', () => {
  it('suma ingredientes expresados en kg y g', () => {
    expect(calcularPesoRecetaKg([
      { nombre: 'Papas', cantidad: 67.5, unidad: 'kg' },
      { nombre: 'Sal', cantidad: 450, unidad: 'g' },
    ])).toBe(67.95)
  })
})

describe('calcularEmbarquetadoCentros', () => {
  it('separa barquetas completas y parciales por centro', () => {
    const result = calcularEmbarquetadoCentros({
      centros: CENTROS,
      pacientes: { sur: 120, candelaria: 30, parque: 50, centro: 100, hogara: 12, hogarb: 12 },
      racionesPorBarqueta: 10,
      pesoPorRacionKg: 0.25,
    })

    const hogarA = result.find((centro) => centro.id === 'hogara')
    expect(hogarA).toMatchObject({
      envasesMonoporcion: 12,
      barquetasCompletas: 1,
      racionesParcial: 2,
      barquetasMultiporcion: 2,
      pesoEstimadoKg: 3,
    })
  })
})
