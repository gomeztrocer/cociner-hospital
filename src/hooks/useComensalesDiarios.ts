import { useCallback, useEffect, useState } from 'react'
import type { Centro } from '../data/centros'
import {
  copyComensalesDiaAnterior, getComensalesDia, saveComensalesDia,
  type ComensalesDiaResponse,
} from '../lib/cocinerApi'
import { useAppStore } from '../store/useAppStore'
import { reportAppError } from '../store/useErrorTraceStore'

function aplicarRespuesta(response: ComensalesDiaResponse): void {
  const centros: Centro[] = response.centros.map((centro) => ({
    id: centro.id, nombre: centro.nombre, color: centro.color,
    paxAlmuerzo: centro.pax_almuerzo, paxCena: centro.pax_cena,
  }))
  useAppStore.getState().cargarComensalesDia(
    response.fecha,
    centros,
    {
      almuerzo: Object.fromEntries(response.centros.map((centro) => [centro.id, centro.almuerzo.cantidad ?? 0])),
      cena: Object.fromEntries(response.centros.map((centro) => [centro.id, centro.cena.cantidad ?? 0])),
    },
    {
      almuerzo: Object.fromEntries(response.centros.map((centro) => [centro.id, centro.almuerzo.disponible])),
      cena: Object.fromEntries(response.centros.map((centro) => [centro.id, centro.cena.disponible])),
    },
    {
      almuerzo: Object.fromEntries(response.centros.map((centro) => [centro.id, centro.almuerzo.guardado])),
      cena: Object.fromEntries(response.centros.map((centro) => [centro.id, centro.cena.guardado])),
    },
  )
}

function message(error: unknown): string {
  return error instanceof Error ? error.message : 'No se pudo completar la operación'
}

export function useComensalesDiarios() {
  const token = useAppStore((state) => state.user?.token)
  const fecha = useAppStore((state) => state.fechaTrabajo)
  const centros = useAppStore((state) => state.centros)
  const pacientes = useAppStore((state) => state.pacientesPorServicio)
  const definidos = useAppStore((state) => state.definidosPorServicio)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')

  const fail = useCallback((accion: string, cause: unknown): void => {
    reportAppError({ fase: 'Fase 1 · Comensales', accion, error: cause })
    setError(message(cause))
  }, [])

  const cargar = useCallback(async (nuevaFecha: string) => {
    setStatus(''); setError('')
    if (!token) return fail('Consultar comensales', new Error('Tu sesión ha caducado. Inicia sesión de nuevo.'))
    setLoading(true)
    try { aplicarRespuesta(await getComensalesDia(token, nuevaFecha)) }
    catch (cause) { fail('Consultar comensales', cause) }
    finally { setLoading(false) }
  }, [token, fail])

  useEffect(() => { void cargar(useAppStore.getState().fechaTrabajo) }, [cargar])

  const guardar = async (): Promise<void> => {
    if (!token) return fail('Guardar comensales', new Error('No hay sesión activa'))
    setSaving(true); setStatus(''); setError('')
    try {
      const valores = centros.map((centro) => ({
        centro_id: centro.id,
        almuerzo: definidos.almuerzo[centro.id] ? pacientes.almuerzo[centro.id] ?? 0 : null,
        cena: definidos.cena[centro.id] ? pacientes.cena[centro.id] ?? 0 : null,
      }))
      aplicarRespuesta(await saveComensalesDia(token, fecha, valores))
      setStatus('Comensales guardados')
    } catch (cause) { fail('Guardar comensales', cause) }
    finally { setSaving(false) }
  }

  const copiarAnterior = async (): Promise<void> => {
    if (!token) return fail('Copiar día anterior', new Error('No hay sesión activa'))
    setSaving(true); setStatus(''); setError('')
    try {
      const response = await copyComensalesDiaAnterior(token, fecha)
      aplicarRespuesta(response)
      setStatus(`Datos copiados desde ${response.copiado_desde ?? 'el día anterior'}`)
    } catch (cause) { fail('Copiar día anterior', cause) }
    finally { setSaving(false) }
  }

  return { loading, saving, message: status, error, cargar, guardar, copiarAnterior }
}
