import { describe, expect, it } from 'vitest'
import { inputDesdePreparacion, sugerirMerma, validarPreparacionInput } from './catalogo'
import type { PreparacionCatalogo, PreparacionCatalogoInput } from '../types/catalogo'

const base: PreparacionCatalogoInput = {
  nombre: 'Lomo de cerdo', categoria: 'proteina', unidadId: 'unidad-id', unidadNueva: null,
  unidadesPorCaja: 20, unidadesPorRacion: 1, pesoEnvaseKg: null, gramosPorRacion: null,
  mermaPorcentaje: null, mermaFuente: null,
}

describe('catálogo de preparaciones', () => {
  it('sugiere merma solo cuando encuentra una referencia razonable', () => {
    expect(sugerirMerma('Lomo de cerdo', 'proteina')?.valor).toBe(18)
    expect(sugerirMerma('Preparación inventada', 'proteina')).toBeNull()
  })

  it('permite aceptar, modificar o dejar la merma sin definir', () => {
    expect(validarPreparacionInput(base)).toBeNull()
    expect(validarPreparacionInput({ ...base, mermaPorcentaje: 18 })).toBeNull()
    expect(validarPreparacionInput({ ...base, mermaPorcentaje: 17 })).toBeNull()
  })

  it('valida los datos específicos de cada calculadora', () => {
    expect(validarPreparacionInput({ ...base, unidadesPorCaja: null })).toContain('caja')
    expect(validarPreparacionInput({ ...base, categoria: 'guarnicion', unidadesPorCaja: null, unidadesPorRacion: null, pesoEnvaseKg: 2.5, gramosPorRacion: 120 })).toBeNull()
  })

  it('recupera una preparación para editar sin perder sus datos', () => {
    const prep: PreparacionCatalogo = { id: 'id', nombre: base.nombre, categoria: base.categoria, unidadId: 'unidad-id', unidad: 'unidad', unidadesPorCaja: 20, unidadesPorRacion: 1, pesoEnvaseKg: null, gramosPorRacion: null, mermaPorcentaje: null, mermaFuente: null, activo: true, createdAt: '2026-08-11', updatedAt: '2026-08-11' }
    expect(inputDesdePreparacion(prep)).toEqual(base)
  })
})
