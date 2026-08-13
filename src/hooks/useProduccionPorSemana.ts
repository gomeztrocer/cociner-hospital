import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { z } from 'zod'
import { reportAppError } from '../store/useErrorTraceStore'

export interface SemanaProduccion {
  semana: number
  total_raciones: number
  total_barquetas: number
}

const semanaProduccionSchema = z.object({
  semana: z.number().int(),
  total_raciones: z.number().nonnegative(),
  total_barquetas: z.number().nonnegative(),
})

interface UseProduccionPorSemanaReturn {
  data: SemanaProduccion[]
  loading: boolean
  error: string | null
  refresh: () => void
}

export function useProduccionPorSemana(
  usuarioId: string | undefined,
  mes: string,
  categoria?: string,
): UseProduccionPorSemanaReturn {
  const [data, setData] = useState<SemanaProduccion[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const params: Record<string, unknown> = {
        p_usuario_id: usuarioId ?? null,
        p_mes: mes,
      }
      if (categoria) params.p_categoria = categoria

      const { data: raw, error: rpcError } = await supabase.rpc(
        'obtener_produccion_por_semana',
        params,
      )

      if (rpcError) {
        reportAppError({ fase: 'Dashboard', accion: 'Consultar producción semanal', error: rpcError, mensaje: 'No se pudo cargar la producción semanal.' })
        setError('Error al cargar producción semanal')
        return
      }

      setData(z.array(semanaProduccionSchema).parse(raw))
    } catch (err) {
      reportAppError({ fase: 'Dashboard', accion: 'Validar producción semanal', error: err, mensaje: 'Los datos semanales no tienen el formato esperado.' })
      setError('Error de conexión')
    } finally {
      setLoading(false)
    }
  }, [usuarioId, mes, categoria])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return { data, loading, error, refresh: fetchData }
}
