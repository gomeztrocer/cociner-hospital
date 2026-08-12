import { describe, it, expect } from 'vitest'
import {
  calcularBandejasHorno,
  calcularBolsasIngrediente,
  calcularCoberturaGuarniciones,
  calcularDesgloseCentros,
  calcularEmbarquetadoCentros,
  calcularGuarnicion,
  calcularPesoRecetaKg,
  calcularProteina,
  escalarIngredientes,
  extraerPesoRacionObjetivoG,
  obtenerGramajeSugeridoGuarnicion,
  obtenerRacionesPorBarquetaGuarnicion,
} from './calculos'
import { CENTROS } from '../data/centros'
import { crearEstadoComensalesFallback } from './comensales'

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
    expect(result.totalPacientes).toBe(50)
    expect(result.racionG).toBe(120)
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
    expect(result.totalPacientes).toBe(414)
    expect(result.racionG).toBe(60)
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

describe('reglas operativas de guarniciones', () => {
  it('una guarnición cubre a todos los comensales y sugiere 120 g', () => {
    expect(calcularCoberturaGuarniciones(100, 1)).toEqual([100])
    expect(obtenerGramajeSugeridoGuarnicion(1)).toBe(120)
  })

  it('dos guarniciones cubren ambas a todos los comensales y sugieren 60 g cada una', () => {
    expect(calcularCoberturaGuarniciones(100, 2)).toEqual([100, 100])
    expect(obtenerGramajeSugeridoGuarnicion(2)).toBe(60)
  })

  it('limita la cobertura operativa a un máximo de dos guarniciones', () => {
    expect(calcularCoberturaGuarniciones(100, 3)).toEqual([100, 100])
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
      pacientes: { sur: 99, candelaria: 120, parque: 50, centro: 100, hogara: 12, hogarb: 12, tamaragua: 0 },
      unidadesPorRacion: 2,
    })

    expect(result).toHaveLength(6)
    const sur = result.find((c) => c.nombre === 'Sur')
    expect(sur?.pax).toBe(99)
    expect(sur?.unidades).toBe(198)
  })

  it('cena con 1 unidad por ración (Candelaria = 30)', () => {
    const result = calcularDesgloseCentros({
      centros,
      pacientes: { sur: 120, candelaria: 30, parque: 50, centro: 100, hogara: 12, hogarb: 12, tamaragua: 7 },
      unidadesPorRacion: 1,
    })

    const candelaria = result.find((c) => c.nombre === 'Candelaria')
    expect(candelaria?.pax).toBe(30)
    expect(candelaria?.unidades).toBe(30)
    expect(result.find((c) => c.nombre === 'Tamaragua')?.pax).toBe(7)
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

describe('extraerPesoRacionObjetivoG', () => {
  it('obtiene el peso final indicado en las notas', () => {
    expect(extraerPesoRacionObjetivoG('Peso final objetivo: 250 g por ración.')).toBe(250)
  })

  it('devuelve null cuando no existe un peso final objetivo', () => {
    expect(extraerPesoRacionObjetivoG('Receta pendiente de prueba.')).toBeNull()
  })
})

describe('calcularEmbarquetadoCentros', () => {
  it('una guarnición asigna todas las barquetas del centro a esa guarnición', () => {
    const racionesPorBarqueta = obtenerRacionesPorBarquetaGuarnicion(1)
    const result = calcularEmbarquetadoCentros({
      centros: CENTROS,
      pacientes: { sur: 120 },
      racionesPorBarqueta,
    })

    expect(racionesPorBarqueta).toBe(10)
    expect(result[0]).toMatchObject({
      raciones: 120,
      barquetasCompletas: 12,
      barquetasMultiporcion: 12,
    })
  })

  it('dos guarniciones reparten por igual las barquetas sin repartir los comensales', () => {
    const racionesPorBarqueta = obtenerRacionesPorBarquetaGuarnicion(2)
    const arroz = calcularEmbarquetadoCentros({
      centros: CENTROS,
      pacientes: { sur: 120 },
      racionesPorBarqueta,
    })
    const menestra = calcularEmbarquetadoCentros({
      centros: CENTROS,
      pacientes: { sur: 120 },
      racionesPorBarqueta,
    })

    expect(racionesPorBarqueta).toBe(20)
    expect(arroz[0]).toMatchObject({ raciones: 120, barquetasMultiporcion: 6 })
    expect(menestra[0]).toMatchObject({ raciones: 120, barquetasMultiporcion: 6 })
    expect(arroz[0].barquetasMultiporcion + menestra[0].barquetasMultiporcion).toBe(12)
  })

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

  it('calcula barquetas completas sin crear una parcial vacía', () => {
    const result = calcularEmbarquetadoCentros({
      centros: CENTROS,
      pacientes: { sur: 20 },
    })

    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({
      raciones: 20,
      barquetasCompletas: 2,
      racionesParcial: 0,
      barquetasMultiporcion: 2,
    })
  })

  it('26 raciones producen 2 completas y 1 parcial de 6', () => {
    const result = calcularEmbarquetadoCentros({
      centros: CENTROS,
      pacientes: { sur: 26 },
    })

    expect(result[0]).toMatchObject({
      raciones: 26,
      barquetasCompletas: 2,
      racionesParcial: 6,
      barquetasMultiporcion: 3,
    })
  })

  it('redondea independientemente por centro', () => {
    const result = calcularEmbarquetadoCentros({
      centros: CENTROS,
      pacientes: { sur: 26, candelaria: 11 },
    })

    expect(result.find((centro) => centro.id === 'sur')?.barquetasMultiporcion).toBe(3)
    expect(result.find((centro) => centro.id === 'candelaria')?.barquetasMultiporcion).toBe(2)
    expect(result.reduce((total, centro) => total + centro.barquetasMultiporcion, 0)).toBe(5)
  })

  it('usa los comensales diarios reales de Almuerzo y Cena, incluida Tamaragua', () => {
    const almuerzo = calcularEmbarquetadoCentros({
      centros: CENTROS,
      pacientes: { sur: 26, candelaria: 11, tamaragua: 7 },
    })
    const cena = calcularEmbarquetadoCentros({
      centros: CENTROS,
      pacientes: { sur: 19, candelaria: 4, tamaragua: 13 },
    })

    expect(almuerzo.map(({ id, raciones }) => ({ id, raciones }))).toEqual([
      { id: 'sur', raciones: 26 },
      { id: 'candelaria', raciones: 11 },
      { id: 'tamaragua', raciones: 7 },
    ])
    expect(cena.find((centro) => centro.id === 'candelaria')).toMatchObject({
      raciones: 4,
      barquetasCompletas: 0,
      racionesParcial: 4,
      barquetasMultiporcion: 1,
    })
    expect(cena.find((centro) => centro.id === 'tamaragua')?.raciones).toBe(13)
  })

  it('excluye un centro sin servicio aunque conserve una cantidad previa', () => {
    const estadoMartes = crearEstadoComensalesFallback('2026-08-11')
    const estadoMiercoles = crearEstadoComensalesFallback('2026-08-12')
    const cenaMartes = calcularEmbarquetadoCentros({
      centros: estadoMartes.centros,
      pacientes: { sur: 26, hogara: 12 },
      disponibilidad: estadoMartes.disponibilidad.cena,
    })
    const cenaMiercoles = calcularEmbarquetadoCentros({
      centros: estadoMiercoles.centros,
      pacientes: { sur: 26, hogarb: 12 },
      disponibilidad: estadoMiercoles.disponibilidad.cena,
    })

    expect(cenaMartes.find((centro) => centro.id === 'sur')?.raciones).toBe(26)
    expect(cenaMartes.some((centro) => centro.id === 'hogara')).toBe(false)
    expect(cenaMiercoles.some((centro) => centro.id === 'hogarb')).toBe(false)
  })
})

describe('calcularBolsasIngrediente', () => {
  it('62,1 kg de papa requieren 25 bolsas de 2,5 kg', () => {
    expect(calcularBolsasIngrediente({
      cantidad: 62.1,
      unidad: 'kg',
      pesoBolsaKg: 2.5,
    })).toEqual({
      kgNecesarios: 62.1,
      bolsasAbrir: 25,
      kgDisponibles: 62.5,
      sobranteKg: 0.4,
    })
  })

  it('también convierte gramos a kilos antes de calcular', () => {
    expect(calcularBolsasIngrediente({
      cantidad: 5100,
      unidad: 'g',
      pesoBolsaKg: 2.5,
    })?.bolsasAbrir).toBe(3)
  })
})
