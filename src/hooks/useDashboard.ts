import { useCallback, useEffect, useState } from 'react'
import { z } from 'zod'
import { supabase } from '../lib/supabase'
import { reportAppError } from '../store/useErrorTraceStore'

const topPlatoSchema = z.object({
  plato: z.string(),
  raciones: z.number().nonnegative(),
  barquetas: z.number().nonnegative(),
})

const ultimoRegistroSchema = z.object({
  id: z.string(),
  plato: z.string(),
  raciones: z.number().nonnegative(),
  barquetas: z.number().nonnegative(),
  cantidad_calculada_g: z.number().nonnegative().nullable(),
  cantidad_producida_g: z.number().nonnegative().nullable(),
  distribucion_centros: z.unknown().nullable(),
  servicio: z.string(),
  categoria: z.string(),
  fecha: z.string(),
  created_at: z.string(),
  chef: z.string().nullable(),
})

const dashboardSchema = z.object({
  total_raciones: z.number().nonnegative(),
  total_barquetas: z.number().nonnegative(),
  total_elaboraciones: z.number().int().nonnegative(),
  dias_con_registro: z.number().int().nonnegative(),
  media_diaria: z.number().nonnegative(),
  media_barquetas_diaria: z.number().nonnegative(),
  hechos_hoy: z.number().int().nonnegative(),
  barquetas_hoy: z.number().nonnegative(),
  top_platos: z.array(topPlatoSchema),
  ultimos_registros: z.array(ultimoRegistroSchema),
})

export type TopPlato = z.infer<typeof topPlatoSchema>
export type UltimoRegistro = z.infer<typeof ultimoRegistroSchema>
export type DashboardData = z.infer<typeof dashboardSchema>

interface UseDashboardReturn {
  data: DashboardData | null
  loading: boolean
  error: string | null
  refresh: () => void
}

function getCurrentMonth(): string {
  const date = new Date()
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

export function useDashboard(
  usuarioId: string | undefined,
  mes?: string,
  categoria?: string,
): UseDashboardReturn {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const month = mes ?? getCurrentMonth()

  const fetchDashboard = useCallback(async (): Promise<void> => {
    try {
      setLoading(true)
      setError(null)
      const params: Record<string, unknown> = { p_usuario_id: usuarioId ?? null, p_mes: month }
      if (categoria) params.p_categoria = categoria
      const { data: raw, error: rpcError } = await supabase.rpc('obtener_dashboard', params)
      if (rpcError) {
        reportAppError({ fase: 'Dashboard', accion: 'Consultar resumen', error: rpcError, mensaje: 'No se pudo cargar el Dashboard.' })
        setError('Error al cargar el dashboard')
        return
      }
      setData(dashboardSchema.parse(raw))
    } catch (requestError) {
      reportAppError({ fase: 'Dashboard', accion: 'Validar resumen', error: requestError, mensaje: 'Los datos del Dashboard no tienen el formato esperado.' })
      setError('Los datos del Dashboard no tienen el formato esperado')
    } finally {
      setLoading(false)
    }
  }, [usuarioId, month, categoria])

  useEffect(() => { void fetchDashboard() }, [fetchDashboard])
  return { data, loading, error, refresh: () => { void fetchDashboard() } }
}
