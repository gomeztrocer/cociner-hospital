import { useCallback, useEffect, useState } from 'react'
import { z } from 'zod'
import { supabase } from '../lib/supabase'
import { useAppStore } from '../store/useAppStore'
import { reportAppError } from '../store/useErrorTraceStore'

const recetaIngredienteSchema = z.object({
  id: z.string(), nombre: z.string(), cantidad: z.number(), unidad: z.string(),
  orden: z.number(), peso_bolsa_kg: z.number().nullable(),
})
const recetaSchema = z.object({
  id: z.string(), nombre: z.string(), servicio: z.string().nullable(),
  raciones_base: z.number().positive(), temperatura: z.string().nullable(),
  tiempo: z.string().nullable(), notas: z.string().nullable(),
  ingredientes: z.array(recetaIngredienteSchema), created_at: z.string(),
})

export type RecetaIngrediente = z.infer<typeof recetaIngredienteSchema>
export type Receta = z.infer<typeof recetaSchema>

export interface CreateRecetaInput {
  nombre: string
  servicio?: string | null
  raciones_base?: number
  temperatura?: string | null
  tiempo?: string | null
  notas?: string | null
  ingredientes: Omit<RecetaIngrediente, 'id'>[]
}

export interface UseRecetasReturn {
  recetas: Receta[]
  loading: boolean
  error: string | null
  createReceta: (data: CreateRecetaInput) => Promise<{ error?: string }>
  updateReceta: (id: string, data: CreateRecetaInput) => Promise<{ error?: string }>
  deleteReceta: (id: string) => Promise<{ error?: string }>
}

function trace(accion: string, error: unknown, mensaje: string): string {
  reportAppError({ fase: 'Recetas', accion, error, mensaje })
  return mensaje
}

export function useRecetas(): UseRecetasReturn {
  const [recetas, setRecetas] = useState<Receta[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const user = useAppStore((state) => state.user)

  const fetchRecetas = useCallback(async (): Promise<void> => {
    try {
      setLoading(true); setError(null)
      const { data, error: rpcError } = await supabase.rpc('listar_recetas')
      if (rpcError) {
        setError(trace('Consultar recetas', rpcError, 'No se pudieron cargar las recetas.'))
        return
      }
      setRecetas(z.array(recetaSchema).parse(data ?? []))
    } catch (cause) {
      setError(trace('Consultar recetas', cause, 'La respuesta de recetas no tiene el formato esperado.'))
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { void fetchRecetas() }, [fetchRecetas])

  const createReceta = useCallback(async (data: CreateRecetaInput): Promise<{ error?: string }> => {
    if (!user) {
      const message = 'Usuario no autenticado'
      trace('Crear receta', new Error(message), message)
      return { error: message }
    }
    if (!data.nombre.trim()) return { error: 'El nombre es obligatorio' }
    try {
      const { error: rpcError } = await supabase.rpc('crear_receta', {
        p_nombre: data.nombre.trim(), p_servicio: data.servicio ?? null,
        p_raciones_base: data.raciones_base ?? 12, p_temperatura: data.temperatura ?? null,
        p_tiempo: data.tiempo ?? null, p_notas: data.notas ?? null,
        p_ingredientes: data.ingredientes.map((ingrediente, index) => ({
          nombre: ingrediente.nombre, cantidad: ingrediente.cantidad, unidad: ingrediente.unidad,
          orden: index, peso_bolsa_kg: ingrediente.peso_bolsa_kg,
        })),
        p_usuario_rol: user.rol,
      })
      if (rpcError) return { error: trace('Crear receta', rpcError, 'No se pudo guardar la receta.') }
      await fetchRecetas()
      return {}
    } catch (cause) { return { error: trace('Crear receta', cause, 'No se pudo conectar para guardar la receta.') } }
  }, [user, fetchRecetas])

  const updateReceta = useCallback(async (id: string, data: CreateRecetaInput): Promise<{ error?: string }> => {
    if (!user) {
      const message = 'Usuario no autenticado'
      trace('Editar receta', new Error(message), message)
      return { error: message }
    }
    if (!data.nombre.trim()) return { error: 'El nombre es obligatorio' }
    try {
      const { error: rpcError } = await supabase.rpc('editar_receta', {
        p_receta_id: id, p_nombre: data.nombre.trim(), p_servicio: data.servicio ?? null,
        p_raciones_base: data.raciones_base ?? 12, p_temperatura: data.temperatura ?? null,
        p_tiempo: data.tiempo ?? null, p_notas: data.notas ?? null,
        p_ingredientes: data.ingredientes.map((ingrediente, index) => ({
          nombre: ingrediente.nombre, cantidad: ingrediente.cantidad, unidad: ingrediente.unidad,
          orden: index, peso_bolsa_kg: ingrediente.peso_bolsa_kg,
        })),
        p_usuario_rol: user.rol,
      })
      if (rpcError) return { error: trace('Editar receta', rpcError, 'No se pudo actualizar la receta.') }
      await fetchRecetas()
      return {}
    } catch (cause) { return { error: trace('Editar receta', cause, 'No se pudo conectar para actualizar la receta.') } }
  }, [user, fetchRecetas])

  const deleteReceta = useCallback(async (id: string): Promise<{ error?: string }> => {
    if (!user) {
      const message = 'Usuario no autenticado'
      trace('Eliminar receta', new Error(message), message)
      return { error: message }
    }
    try {
      const { error: rpcError } = await supabase.rpc('eliminar_receta', {
        p_receta_id: id, p_usuario_rol: user.rol,
      })
      if (rpcError) return { error: trace('Eliminar receta', rpcError, 'No se pudo eliminar la receta.') }
      await fetchRecetas()
      return {}
    } catch (cause) { return { error: trace('Eliminar receta', cause, 'No se pudo conectar para eliminar la receta.') } }
  }, [user, fetchRecetas])

  return { recetas, loading, error, createReceta, updateReceta, deleteReceta }
}
