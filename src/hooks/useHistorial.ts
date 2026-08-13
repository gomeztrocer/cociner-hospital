import { useCallback, useEffect, useState } from 'react'
import { z } from 'zod'
import { isSessionExpiredError, registrosRequest } from '../lib/cocinerApi'
import { getFechaLocalTenerife } from '../lib/comensales'
import { useAppStore } from '../store/useAppStore'

const distribucionCentroSchema = z.object({
  id: z.string(),
  nombre: z.string(),
  raciones: z.number().int().nonnegative(),
  barquetas_completas: z.number().int().nonnegative(),
  raciones_parcial: z.number().int().nonnegative(),
  total_barquetas: z.number().int().nonnegative(),
})

const registroSchema = z.object({
  id: z.string(),
  usuario_id: z.string(),
  usuario_nombre: z.string(),
  plato: z.string(),
  servicio: z.string(),
  raciones: z.number().int().nonnegative(),
  fecha: z.string(),
  notas: z.string().nullable(),
  categoria: z.string(),
  barquetas: z.number().int().nonnegative().default(0),
  cantidad_calculada_g: z.number().int().nonnegative().nullish().transform((value) => value ?? null),
  cantidad_producida_g: z.number().int().nonnegative().nullish().transform((value) => value ?? null),
  distribucion_centros: z.array(distribucionCentroSchema).nullish().transform((value) => value ?? []),
  grupo_produccion: z.string().nullable().optional().transform((value) => value ?? null),
  created_at: z.string(),
  updated_at: z.string().nullable().optional().transform((value) => value ?? null),
})

export type DistribucionCentroRegistro = z.infer<typeof distribucionCentroSchema>
export type Registro = z.infer<typeof registroSchema>

export interface RegistroInput {
  plato: string
  servicio: string
  raciones: number
  fecha?: string
  notas?: string
  categoria?: string
  barquetas?: number
  cantidadCalculadaG?: number | null
  cantidadProducidaG?: number | null
  distribucionCentros?: DistribucionCentroRegistro[]
}

export interface ProduccionGuarnicionInput extends Omit<RegistroInput, 'fecha' | 'servicio' | 'categoria'> {
  clientId: string
}

export interface RegistroUpdateInput {
  id: string
  plato: string
  servicio: string
  raciones: number
  fecha: string
  notas?: string
  barquetas?: number
  cantidadCalculadaG?: number | null
  cantidadProducidaG?: number | null
  distribucionCentros?: DistribucionCentroRegistro[]
}

export interface HistorialResult {
  error?: string
  sessionExpired?: boolean
}

export interface UseHistorialReturn {
  registros: Registro[]
  loading: boolean
  error: string | null
  addRegistro: (params: RegistroInput) => Promise<HistorialResult>
  addRegistrosProduccion: (params: {
    fecha: string
    servicio: string
    producciones: ProduccionGuarnicionInput[]
  }) => Promise<HistorialResult>
  updateRegistro: (params: RegistroUpdateInput) => Promise<HistorialResult>
  deleteRegistro: (id: string) => Promise<HistorialResult>
  refresh: () => Promise<void>
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Error de conexión'
}

function failure(error: unknown): HistorialResult {
  return {
    error: errorMessage(error),
    sessionExpired: isSessionExpiredError(error),
  }
}

function validateRegistro(params: Omit<RegistroInput, 'categoria'> & { fecha: string }): string | null {
  if (!params.plato.trim()) return 'Escribí el nombre del plato'
  if (!Number.isInteger(params.raciones) || params.raciones < 1) return 'Las raciones deben ser al menos 1'
  if (!['Almuerzo', 'Cena'].includes(params.servicio)) return 'Seleccioná un servicio válido'
  if (!/^\d{4}-\d{2}-\d{2}$/.test(params.fecha)) return 'Seleccioná una fecha válida'
  if (params.fecha > getFechaLocalTenerife()) return 'La fecha no puede ser futura'
  if (params.barquetas != null && (!Number.isInteger(params.barquetas) || params.barquetas < 0)) {
    return 'Las barquetas deben ser un número entero igual o mayor que 0'
  }
  if (params.cantidadCalculadaG != null && params.cantidadCalculadaG < 0) return 'La cantidad calculada no es válida'
  if (params.cantidadProducidaG != null && params.cantidadProducidaG <= 0) return 'La cantidad producida debe ser mayor que 0'
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

  const fetchRegistros = useCallback(async (): Promise<void> => {
    if (!usuarioId || !token) {
      setRegistros([])
      return
    }

    try {
      setLoading(true)
      setError(null)
      const response = await registrosRequest<{ registros: unknown }>(token, {
        action: 'list',
        fecha,
        incluir_todos: incluirTodos,
      })
      setRegistros(z.array(registroSchema).parse(response.registros))
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

  const addRegistro = useCallback(async (params: RegistroInput): Promise<HistorialResult> => {
    if (!usuarioId || !token) return { error: 'Tu sesión ha caducado. Inicia sesión de nuevo.', sessionExpired: true }

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
        barquetas: params.barquetas ?? null,
        cantidad_calculada_g: params.cantidadCalculadaG ?? null,
        cantidad_producida_g: params.cantidadProducidaG ?? null,
        distribucion_centros: params.distribucionCentros ?? null,
      })
      await fetchRegistros()
      return {}
    } catch (requestError) {
      console.error('Error inserting registro:', requestError)
      return failure(requestError)
    }
  }, [usuarioId, token, fecha, fetchRegistros])

  const addRegistrosProduccion = useCallback(async (params: {
    fecha: string
    servicio: string
    producciones: ProduccionGuarnicionInput[]
  }): Promise<HistorialResult> => {
    if (!usuarioId || !token) return { error: 'Tu sesión ha caducado. Inicia sesión de nuevo.', sessionExpired: true }
    if (params.producciones.length < 1 || params.producciones.length > 2) {
      return { error: 'Debe haber una o dos guarniciones para registrar' }
    }

    for (const produccion of params.producciones) {
      const validationError = validateRegistro({
        ...produccion,
        servicio: params.servicio,
        fecha: params.fecha,
      })
      if (validationError) return { error: `${produccion.plato}: ${validationError}` }
    }

    try {
      await registrosRequest(token, {
        action: 'create-batch',
        fecha: params.fecha,
        servicio: params.servicio,
        producciones: params.producciones.map((produccion) => ({
          client_id: produccion.clientId,
          plato: produccion.plato.trim(),
          raciones: produccion.raciones,
          notas: produccion.notas ?? null,
          categoria: 'guarnicion',
          barquetas: produccion.barquetas,
          cantidad_calculada_g: produccion.cantidadCalculadaG,
          cantidad_producida_g: produccion.cantidadProducidaG,
          distribucion_centros: produccion.distribucionCentros ?? [],
        })),
      })
      await fetchRegistros()
      return {}
    } catch (requestError) {
      console.error('Error inserting production batch:', requestError)
      return failure(requestError)
    }
  }, [usuarioId, token, fetchRegistros])

  const updateRegistro = useCallback(async (params: RegistroUpdateInput): Promise<HistorialResult> => {
    if (!usuarioId || !token) return { error: 'Tu sesión ha caducado. Inicia sesión de nuevo.', sessionExpired: true }

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
        barquetas: params.barquetas ?? null,
        cantidad_calculada_g: params.cantidadCalculadaG ?? null,
        cantidad_producida_g: params.cantidadProducidaG ?? null,
        distribucion_centros: params.distribucionCentros ?? null,
      })
      await fetchRegistros()
      return {}
    } catch (requestError) {
      console.error('Error updating registro:', requestError)
      return failure(requestError)
    }
  }, [usuarioId, token, fetchRegistros])

  const deleteRegistro = useCallback(async (id: string): Promise<HistorialResult> => {
    if (!usuarioId || !token) return { error: 'Tu sesión ha caducado. Inicia sesión de nuevo.', sessionExpired: true }
    if (!id) return { error: 'Registro no válido' }

    try {
      await registrosRequest(token, { action: 'delete', registro_id: id })
      await fetchRegistros()
      return {}
    } catch (requestError) {
      console.error('Error deleting registro:', requestError)
      return failure(requestError)
    }
  }, [usuarioId, token, fetchRegistros])

  return {
    registros,
    loading,
    error,
    addRegistro,
    addRegistrosProduccion,
    updateRegistro,
    deleteRegistro,
    refresh: fetchRegistros,
  }
}
