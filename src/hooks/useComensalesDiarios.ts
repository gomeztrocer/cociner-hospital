import { useCallback, useEffect, useState } from 'react'
import type { Centro } from '../data/centros'
import {
  copyComensalesDiaAnterior,
  getComensalesDia,
  saveComensalesDia,
  type ComensalesDiaResponse,
} from '../lib/cocinerApi'
import { crearEstadoComensalesFallback } from '../lib/comensales'
import { useAppStore } from '../store/useAppStore'

function aplicarRespuesta(response: ComensalesDiaResponse): void {
  const centros: Centro[] = response.centros.map((centro) => ({
    id: centro.id,
    nombre: centro.nombre,
    color: centro.color,
    paxAlmuerzo: centro.pax_almuerzo,
    paxCena: centro.pax_cena,
  }))
  useAppStore.getState().cargarComensalesDia(
    response.fecha,
    centros,
    {
      almuerzo: Object.fromEntries(response.centros.map((c) => [c.id, c.almuerzo.cantidad ?? 0])),
      cena: Object.fromEntries(response.centros.map((c) => [c.id, c.cena.cantidad ?? 0])),
    },
    {
      almuerzo: Object.fromEntries(response.centros.map((c) => [c.id, c.almuerzo.disponible])),
      cena: Object.fromEntries(response.centros.map((c) => [c.id, c.cena.disponible])),
    },
    {
      almuerzo: Object.fromEntries(response.centros.map((c) => [c.id, c.almuerzo.guardado])),
      cena: Object.fromEntries(response.centros.map((c) => [c.id, c.cena.guardado])),
    },
  )
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'No se pudo completar la operación'
}

export function useComensalesDiarios() {
  const token = useAppStore((state) => state.user?.token)
  const fecha = useAppStore((state) => state.fechaTrabajo)
  const centros = useAppStore((state) => state.centros)
  const pacientesPorServicio = useAppStore((state) => state.pacientesPorServicio)
  const definidosPorServicio = useAppStore((state) => state.definidosPorServicio)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const cargar = useCallback(async (nuevaFecha: string) => {
    setMessage('')
    setError('')
    if (!token) {
      const fallback = crearEstadoComensalesFallback(nuevaFecha)
      useAppStore.getState().cargarComensalesDia(
        fallback.fecha, fallback.centros, fallback.pacientes, fallback.disponibilidad, fallback.definidos,
      )
      return
    }
    setLoading(true)
    try {
      aplicarRespuesta(await getComensalesDia(token, nuevaFecha))
    } catch (requestError) {
      setError(getErrorMessage(requestError))
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    void cargar(useAppStore.getState().fechaTrabajo)
  }, [cargar])

  const guardar = async () => {
    if (!token) return setError('No hay sesión activa')
    setSaving(true)
    setMessage('')
    setError('')
    try {
      const valores = centros.map((centro) => ({
        centro_id: centro.id,
        almuerzo: definidosPorServicio.almuerzo[centro.id]
          ? pacientesPorServicio.almuerzo[centro.id] ?? 0
          : null,
        cena: definidosPorServicio.cena[centro.id]
          ? pacientesPorServicio.cena[centro.id] ?? 0
          : null,
      }))
      aplicarRespuesta(await saveComensalesDia(token, fecha, valores))
      setMessage('Comensales guardados')
    } catch (requestError) {
      setError(getErrorMessage(requestError))
    } finally {
      setSaving(false)
    }
  }

  const copiarAnterior = async () => {
    if (!token) return setError('No hay sesión activa')
    setSaving(true)
    setMessage('')
    setError('')
    try {
      const response = await copyComensalesDiaAnterior(token, fecha)
      aplicarRespuesta(response)
      setMessage(`Datos copiados desde ${response.copiado_desde ?? 'el día anterior'}`)
    } catch (requestError) {
      setError(getErrorMessage(requestError))
    } finally {
      setSaving(false)
    }
  }

  return { loading, saving, message, error, cargar, guardar, copiarAnterior }
}
