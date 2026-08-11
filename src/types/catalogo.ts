export type CategoriaCatalogo = 'proteina' | 'guarnicion'

export interface UnidadCatalogo {
  id: string
  nombre: string
}

export interface PreparacionCatalogo {
  id: string
  nombre: string
  categoria: CategoriaCatalogo
  unidadId: string
  unidad: string
  unidadesPorCaja: number | null
  unidadesPorRacion: number | null
  pesoEnvaseKg: number | null
  gramosPorRacion: number | null
  mermaPorcentaje: number | null
  mermaFuente: string | null
  activo: boolean
  createdAt: string
  updatedAt: string
}

export interface CatalogoPreparaciones {
  unidades: UnidadCatalogo[]
  preparaciones: PreparacionCatalogo[]
}

export interface PreparacionCatalogoInput {
  nombre: string
  categoria: CategoriaCatalogo
  unidadId: string | null
  unidadNueva: string | null
  unidadesPorCaja: number | null
  unidadesPorRacion: number | null
  pesoEnvaseKg: number | null
  gramosPorRacion: number | null
  mermaPorcentaje: number | null
  mermaFuente: string | null
}
