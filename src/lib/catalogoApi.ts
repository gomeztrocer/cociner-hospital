import { z } from 'zod'
import { callFunction } from './cocinerApi'
import type { CatalogoPreparaciones, PreparacionCatalogoInput } from '../types/catalogo'

const numeroNullable = z.union([z.number(), z.string().transform(Number), z.null()])
const catalogoSchema = z.object({
  unidades: z.array(z.object({ id: z.string().uuid(), nombre: z.string().min(1) })),
  preparaciones: z.array(z.object({
    id: z.string().uuid(), nombre: z.string().min(1), categoria: z.enum(['proteina', 'guarnicion']),
    unidad_id: z.string().uuid(), unidad: z.string().min(1),
    unidades_por_caja: numeroNullable, unidades_por_racion: numeroNullable,
    peso_envase_kg: numeroNullable, gramos_por_racion: numeroNullable,
    merma_porcentaje: numeroNullable, merma_fuente: z.string().nullable(), activo: z.boolean(),
    created_at: z.string(), updated_at: z.string(),
  })),
})

function parseCatalogo(value: unknown): CatalogoPreparaciones {
  const parsed = catalogoSchema.parse(value)
  return {
    unidades: parsed.unidades,
    preparaciones: parsed.preparaciones.map((prep) => ({
      id: prep.id, nombre: prep.nombre, categoria: prep.categoria,
      unidadId: prep.unidad_id, unidad: prep.unidad,
      unidadesPorCaja: prep.unidades_por_caja, unidadesPorRacion: prep.unidades_por_racion,
      pesoEnvaseKg: prep.peso_envase_kg, gramosPorRacion: prep.gramos_por_racion,
      mermaPorcentaje: prep.merma_porcentaje, mermaFuente: prep.merma_fuente,
      activo: prep.activo, createdAt: prep.created_at, updatedAt: prep.updated_at,
    })),
  }
}

function apiInput(input: PreparacionCatalogoInput): Record<string, unknown> {
  return {
    nombre: input.nombre.trim(), categoria: input.categoria,
    unidad_id: input.unidadId, unidad_nueva: input.unidadNueva?.trim() || null,
    unidades_por_caja: input.unidadesPorCaja, unidades_por_racion: input.unidadesPorRacion,
    peso_envase_kg: input.pesoEnvaseKg, gramos_por_racion: input.gramosPorRacion,
    merma_porcentaje: input.mermaPorcentaje, merma_fuente: input.mermaFuente,
  }
}

export async function fetchCatalogo(token: string): Promise<CatalogoPreparaciones> {
  return parseCatalogo(await callFunction<unknown>('cociner-catalogo', { action: 'list' }, { token }))
}

export async function saveCatalogoPreparacion(token: string, input: PreparacionCatalogoInput, id?: string): Promise<CatalogoPreparaciones> {
  return parseCatalogo(await callFunction<unknown>('cociner-catalogo', { action: 'save', datos: apiInput(input), id }, { token }))
}

export async function archiveCatalogoPreparacion(token: string, id: string): Promise<CatalogoPreparaciones> {
  return parseCatalogo(await callFunction<unknown>('cociner-catalogo', { action: 'archive', id }, { token }))
}
