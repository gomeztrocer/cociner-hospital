import { detectarMerma } from '../data/mermas'
import type { CategoriaCatalogo, PreparacionCatalogo, PreparacionCatalogoInput } from '../types/catalogo'

export interface MermaSugerida {
  valor: number
  fuente: string
}

export function sugerirMerma(nombre: string, categoria: CategoriaCatalogo): MermaSugerida | null {
  const resultado = detectarMerma(nombre, categoria === 'proteina' ? 'prot' : 'guar')
  return resultado.found ? { valor: resultado.merma, fuente: resultado.source } : null
}

export function validarPreparacionInput(input: PreparacionCatalogoInput): string | null {
  if (!input.nombre.trim()) return 'Escribe el nombre de la preparación'
  if (!input.unidadId && !input.unidadNueva?.trim()) return 'Selecciona una unidad'
  if (input.categoria === 'proteina') {
    if (!input.unidadesPorCaja || input.unidadesPorCaja <= 0) return 'Indica las unidades por caja'
    if (!input.unidadesPorRacion || input.unidadesPorRacion <= 0) return 'Indica las unidades por ración'
  } else {
    if (!input.pesoEnvaseKg || input.pesoEnvaseKg <= 0) return 'Indica el peso de la bolsa'
    if (!input.gramosPorRacion || input.gramosPorRacion <= 0) return 'Indica los gramos por ración'
  }
  if (input.mermaPorcentaje != null && (input.mermaPorcentaje < -300 || input.mermaPorcentaje > 80)) return 'La merma debe estar entre -300 % y 80 %'
  return null
}

export function inputDesdePreparacion(prep: PreparacionCatalogo): PreparacionCatalogoInput {
  return {
    nombre: prep.nombre, categoria: prep.categoria, unidadId: prep.unidadId, unidadNueva: null,
    unidadesPorCaja: prep.unidadesPorCaja, unidadesPorRacion: prep.unidadesPorRacion,
    pesoEnvaseKg: prep.pesoEnvaseKg, gramosPorRacion: prep.gramosPorRacion,
    mermaPorcentaje: prep.mermaPorcentaje, mermaFuente: prep.mermaFuente,
  }
}
