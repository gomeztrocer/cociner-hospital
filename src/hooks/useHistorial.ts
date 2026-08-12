import { useCallback, useEffect, useState } from 'react'
import { registrosRequest } from '../lib/cocinerApi'
import { getFechaLocalTenerife } from '../lib/comensales'
import { useAppStore } from '../store/useAppStore'

export interface Registro {
  id: string
  usuario_id: string
  usuario_nombre: string
  plato: string
  servicio: string
  raciones: number
  fecha: string
  notas: string | null
  categoria: string
  created_at: string
  updated_at: string | null
}

export interface RegistroInput {
  plato: string
  servicio: string
  raciones: number
  fecha?: string
  notas?: string
  categoria?: string
}

export interface RegistroUpdateInput {
  id: string
  plato: string
  servicio: string
  raciones: number
  fecha: string
  notas?: string
}

export interface UseHistorialReturn {
  registros: Registro[]
  loading: boolean
  error: string | null
  addRegistro: (params: RegistroInput) => Promise<{ error?: string }>
  updateRegistro: (params: RegistroUpdateInput) => Promise<{ error?: string }>
  deleteRegistro: (id: string) => Promise<{ error?: string }>
  refresh: () => Promise<void>
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Error de conexión'
}

function validateRegistro(params: Omit<RegistroInput, 'categoria'> & { fecha: string }): string | null {
  if (!params.plato.trim()) return 'Escribí el nombre del plato'
  if (!Number.isInteger(params.raciones) || params.raciones < 1) {
    return 'Las raciones deben ser al menos 1'
  }
  if (!['Almuerzo', 'Cena'].includes(params.servicio)) return 'Seleccioná un servicio válido'
  if (!/^\d{4}-\d{2}-\d{2}$/.test(params.fecha)) return 'Seleccioná una fecha válida'
  if (params.fecha > getFechaLocalTenerife()) return 'La fecha no puede ser futura'
  return null
}

export function useHistorial(
  usuarioId: string | undefined,
  fecha = getFechaLocalTenerife(),
  incluirTodos = false,
): UseHistorialReturn {
  const token = useAppStore((state) => state.user?.token)
  const [registros, setRegistros] = useState<Registro[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchRegistros = useCallback(async () => {
    if (!usuarioId || !token) {
      setRegistros([])
      return
    }

    try {
      setLoading(true)
      setError(null)
      const response = await registrosRequest<{ registros: Registro[] }>(token, {
        action: 'list',
        fecha,
        incluir_todos: incluirTodos,
      })
      setRegistros(response.registros)
    } catch (requestError) {
      console.error('Error fetching registros:', requestError)
      setError(errorMessage(requestError))
    } finally {
      setLoading(false)
    }
  }, [usuarioId, token, fecha, incluirTodos])

  useEffect(() => {
    void fetchRegistros()
  }, [fetchRegistros])

  const addRegistro = useCallback(async (params: RegistroInput): Promise<{ error?: string }> => {
    if (!usuarioId || !token) return { error: 'Tu sesión ha caducado. Inicia sesión de nuevo.' }

    const fechaRegistro = params.fecha ?? fecha
    const validationError = validateRegistro({ ...params, fecha: fechaRegistro })
    if (validationError) return { error: validationError }

    try {
      await registrosRequest(token, {
        action: 'create',
        plato: params.plato.trim(),
        servicio: params.servicio,
        raciones: params.raciones,
        fecha: fechaRegistro,
        notas: params.notas ?? null,
        categoria: params.categoria ?? 'manual',
      })
      await fetchRegistros()
      return {}
    } catch (requestError) {
      console.error('Error inserting registro:', requestError)
      return { error: errorMessage(requestError) }
    }
  }, [usuarioId, token, fecha, fetchRegistros])

  const updateRegistro = useCallback(async (params: RegistroUpdateInput): Promise<{ error?: string }> => {
    if (!usuarioId || !token) return { error: 'Tu sesión ha caducado. Inicia sesión de nuevo.' }

    const validationError = validateRegistro(params)
    if (validationError) return { error: validationError }

    try {
      await registrosRequest(token, {
        action: 'update',
        registro_id: params.id,
        plato: params.plato.trim(),
        servicio: params.servicio,
        raciones: params.raciones,
        fecha: params.fecha,
        notas: params.notas ?? null,
      })
      await fetchRegistros()
      return {}
    } catch (requestError) {
      console.error('Error updating registro:', requestError)
      return { error: errorMessage(requestError) }
    }
  }, [usuarioId, token, fetchRegistros])

  const deleteRegistro = useCallback(async (id: string): Promise<{ error?: string }> => {
    if (!usuarioId || !token) return { error: 'Tu sesión ha caducado. Inicia sesión de nuevo.' }
    if (!id) return { error: 'Registro no válido' }

    try {
      await registrosRequest(token, { action: 'delete', registro_id: id })
      await fetchRegistros()
      return {}
    } catch (requestError) {
      console.error('Error deleting registro:', requestError)
      return { error: errorMessage(requestError) }
    }
  }, [usuarioId, token, fetchRegistros])

  return {
    registros,
    loading,
    error,
    addRegistro,
    updateRegistro,
    deleteRegistro,
    refresh: fetchRegistros,
  }
}
