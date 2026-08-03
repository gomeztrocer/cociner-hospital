import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAppStore } from '../store/useAppStore'

export interface RecetaIngrediente {
  id: string
  nombre: string
  cantidad: number
  unidad: string
  orden: number
  peso_bolsa_kg: number | null
}

export interface Receta {
  id: string
  nombre: string
  servicio: string | null
  raciones_base: number
  temperatura: string | null
  tiempo: string | null
  notas: string | null
  ingredientes: RecetaIngrediente[]
  created_at: string
}

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

export function useRecetas(): UseRecetasReturn {
  const [recetas, setRecetas] = useState<Receta[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const user = useAppStore((s) => s.user)

  const fetchRecetas = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const { data, error: rpcError } = await supabase.rpc('listar_recetas')
      if (rpcError) {
        setError('Error al cargar recetas')
        return
      }
      setRecetas((data as Receta[]) ?? [])
    } catch {
      setError('Error de conexión')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchRecetas()
  }, [fetchRecetas])

  const createReceta = useCallback(
    async (data: CreateRecetaInput): Promise<{ error?: string }> => {
      if (!user) return { error: 'Usuario no autenticado' }
      if (!data.nombre.trim()) return { error: 'El nombre es obligatorio' }

      try {
        const { error: rpcError } = await supabase.rpc('crear_receta', {
          p_nombre: data.nombre.trim(),
          p_servicio: data.servicio ?? null,
          p_raciones_base: data.raciones_base ?? 12,
          p_temperatura: data.temperatura ?? null,
          p_tiempo: data.tiempo ?? null,
          p_notas: data.notas ?? null,
          p_ingredientes: data.ingredientes.map((ing, i) => ({
            nombre: ing.nombre,
            cantidad: ing.cantidad,
            unidad: ing.unidad,
            orden: i,
            peso_bolsa_kg: ing.peso_bolsa_kg,
          })),
          p_usuario_rol: user.rol,
        })
        if (rpcError) return { error: 'Error al guardar la receta' }
        await fetchRecetas()
        return {}
      } catch {
        return { error: 'Error de conexión' }
      }
    },
    [user, fetchRecetas],
  )

  const updateReceta = useCallback(
    async (id: string, data: CreateRecetaInput): Promise<{ error?: string }> => {
      if (!user) return { error: 'Usuario no autenticado' }
      if (!data.nombre.trim()) return { error: 'El nombre es obligatorio' }

      try {
        const { error: rpcError } = await supabase.rpc('editar_receta', {
          p_receta_id: id,
          p_nombre: data.nombre.trim(),
          p_servicio: data.servicio ?? null,
          p_raciones_base: data.raciones_base ?? 12,
          p_temperatura: data.temperatura ?? null,
          p_tiempo: data.tiempo ?? null,
          p_notas: data.notas ?? null,
          p_ingredientes: data.ingredientes.map((ing, i) => ({
            nombre: ing.nombre,
            cantidad: ing.cantidad,
            unidad: ing.unidad,
            orden: i,
            peso_bolsa_kg: ing.peso_bolsa_kg,
          })),
          p_usuario_rol: user.rol,
        })
        if (rpcError) return { error: 'Error al actualizar la receta' }
        await fetchRecetas()
        return {}
      } catch {
        return { error: 'Error de conexión' }
      }
    },
    [user, fetchRecetas],
  )

  const deleteReceta = useCallback(
    async (id: string): Promise<{ error?: string }> => {
      if (!user) return { error: 'Usuario no autenticado' }

      try {
        const { error: rpcError } = await supabase.rpc('eliminar_receta', {
          p_receta_id: id,
          p_usuario_rol: user.rol,
        })
        if (rpcError) return { error: 'Error al eliminar la receta' }
        await fetchRecetas()
        return {}
      } catch {
        return { error: 'Error de conexión' }
      }
    },
    [user, fetchRecetas],
  )

  return { recetas, loading, error, createReceta, updateReceta, deleteReceta }
}
