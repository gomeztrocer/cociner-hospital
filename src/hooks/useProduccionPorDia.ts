import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { z } from 'zod'

export interface DiaProduccion {
  fecha: string
  total_raciones: number
  total_barquetas: number
}

const diaProduccionSchema = z.object({
  fecha: z.string(),
  total_raciones: z.number().nonnegative(),
  total_barquetas: z.number().nonnegative(),
})

interface UseProduccionPorDiaReturn {
  data: DiaProduccion[]
  loading: boolean
  error: string | null
  refresh: () => void
}

export function useProduccionPorDia(
  usuarioId: string | undefined,
  desde: string,
  hasta: string,
  categoria?: string,
): UseProduccionPorDiaReturn {
  const [data, setData] = useState<DiaProduccion[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const params: Record<string, unknown> = {
        p_usuario_id: usuarioId ?? null,
        p_desde: desde,
        p_hasta: hasta,
      }
      if (categoria) params.p_categoria = categoria

      const { data: raw, error: rpcError } = await supabase.rpc(
        'obtener_produccion_por_dia',
        params,
      )

      if (rpcError) {
        console.error('Error fetching produccion por dia:', rpcError)
        setError('Error al cargar producción diaria')
        return
      }

      setData(z.array(diaProduccionSchema).parse(raw))
    } catch (err) {
      console.error('Error in fetchProduccionPorDia:', err)
      setError('Error de conexión')
    } finally {
      setLoading(false)
    }
  }, [usuarioId, desde, hasta, categoria])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return { data, loading, error, refresh: fetchData }
}
