import { describe, expect, it } from 'vitest'
import {
  CHINOS_RECETAS,
  PURE_RECETAS,
  calcularPedidoPapaPorCajas,
  escalarReceta,
} from './blandas'

describe('recetas de Dietas Blandas', () => {
  it('todas las variantes de Chino usan 2 bolsas de papa y 2 de verdura', () => {
    for (const receta of CHINOS_RECETAS) {
      expect(receta.ingredientes[0]).toMatchObject({ nombre: 'Papas congeladas', cantidadBase: 2 })
      expect(receta.ingredientes[1].cantidadBase).toBe(2)
      const resultado = escalarReceta(receta, receta.barquetasBase * 2)
      expect(resultado.ingredientes[0].cantidadBase).toBe(4)
      expect(resultado.ingredientes[1].cantidadBase).toBe(4)
    }
  })

  it('mantiene intacta la receta de Puré: 3 bolsas cada 2 barquetas', () => {
    const pure = PURE_RECETAS[0]!
    expect(pure.barquetasBase).toBe(2)
    expect(pure.ingredientes[0].cantidadBase).toBe(3)
    expect(escalarReceta(pure, 4).ingredientes[0].cantidadBase).toBe(6)
  })

  it('redondea las cajas de papa hacia arriba y conserva bolsas y sobrante', () => {
    expect(calcularPedidoPapaPorCajas(7)).toEqual({
      bolsasNecesarias: 7,
      cajasNecesarias: 2,
      bolsasDisponibles: 8,
      bolsasSobrantes: 1,
    })
  })

  it('calcula correctamente cantidades fraccionarias de bolsas', () => {
    expect(calcularPedidoPapaPorCajas(1.5)).toEqual({
      bolsasNecesarias: 1.5,
      cajasNecesarias: 1,
      bolsasDisponibles: 4,
      bolsasSobrantes: 2.5,
    })
  })
})
