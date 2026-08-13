import { useCallback, useEffect, useState } from 'react'
import { UNIDADES_CATALOGO_FALLBACK } from '../data/unidadesCatalogo'
import { archiveCatalogoPreparacion, fetchCatalogo, saveCatalogoPreparacion } from '../lib/catalogoApi'
import { validarPreparacionInput } from '../lib/catalogo'
import { useAppStore } from '../store/useAppStore'
import { reportAppError } from '../store/useErrorTraceStore'
import type { CatalogoPreparaciones, PreparacionCatalogo, PreparacionCatalogoInput } from '../types/catalogo'

const fallback: CatalogoPreparaciones = { unidades: UNIDADES_CATALOGO_FALLBACK, preparaciones: [] }
let cache: CatalogoPreparaciones | null = null
const listeners = new Set<(data: CatalogoPreparaciones) => void>()
function publish(data: CatalogoPreparaciones): void { cache = data; listeners.forEach((listener) => listener(data)) }
function message(error: unknown): string { return error instanceof Error ? error.message : 'No se pudo actualizar el catálogo' }
function trace(accion: string, error: unknown): void { reportAppError({ fase: 'Fase 2 · Catálogos', accion, error }) }

export interface UseCatalogoReturn {
  data: CatalogoPreparaciones
  loading: boolean
  error: string | null
  save: (input: PreparacionCatalogoInput, id?: string) => Promise<{ preparacion?: PreparacionCatalogo; error?: string }>
  archive: (id: string) => Promise<{ error?: string }>
  reload: () => Promise<void>
}

export function useCatalogoPreparaciones(): UseCatalogoReturn {
  const token = useAppStore((state) => state.user?.token)
  const [data, setData] = useState<CatalogoPreparaciones>(cache ?? fallback)
  const [loading, setLoading] = useState(!cache)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async (): Promise<void> => {
    if (!token) return
    setLoading(true)
    try { const fresh = await fetchCatalogo(token); publish(fresh); setError(null) }
    catch (cause) { trace('Consultar catálogo', cause); setError(message(cause)) }
    finally { setLoading(false) }
  }, [token])

  useEffect(() => {
    listeners.add(setData)
    if (!cache) void reload()
    return () => { listeners.delete(setData) }
  }, [reload])

  const save = useCallback(async (input: PreparacionCatalogoInput, id?: string) => {
    const validation = validarPreparacionInput(input)
    if (validation) return { error: validation }
    if (!token) {
      const detail = 'Inicia sesión para guardar el catálogo'
      trace('Guardar preparación', new Error(detail))
      return { error: detail }
    }
    try {
      const fresh = await saveCatalogoPreparacion(token, input, id)
      publish(fresh); setError(null)
      const saved = fresh.preparaciones.find((prep) => prep.categoria === input.categoria && prep.nombre.toLocaleLowerCase() === input.nombre.trim().toLocaleLowerCase())
      return { preparacion: saved }
    } catch (cause) {
      const detail = message(cause); trace('Guardar preparación', cause); setError(detail); return { error: detail }
    }
  }, [token])

  const archive = useCallback(async (id: string) => {
    if (!token) {
      const detail = 'Inicia sesión para archivar el catálogo'
      trace('Archivar preparación', new Error(detail))
      return { error: detail }
    }
    try { publish(await archiveCatalogoPreparacion(token, id)); setError(null); return {} }
    catch (cause) { const detail = message(cause); trace('Archivar preparación', cause); setError(detail); return { error: detail } }
  }, [token])

  return { data, loading, error, save, archive, reload }
}
