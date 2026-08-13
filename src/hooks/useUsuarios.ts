import { useCallback, useEffect, useState } from 'react'
import { z } from 'zod'
import { adminUsersRequest } from '../lib/cocinerApi'
import { useAppStore } from '../store/useAppStore'
import { reportAppError } from '../store/useErrorTraceStore'

const usuarioAdminSchema = z.object({
  id: z.string(), username: z.string(), nombre_completo: z.string(), rol: z.string(),
  centro_id: z.string().nullable(), activo: z.boolean(), created_at: z.string(),
})

export type UsuarioAdmin = z.infer<typeof usuarioAdminSchema>

export interface CrearUsuarioInput {
  nombre: string
  username: string
  pin: string
  rol: string
  centro_id?: string
}

export interface UseUsuariosReturn {
  usuarios: UsuarioAdmin[]
  loading: boolean
  error: string | null
  crearUsuario: (data: CrearUsuarioInput) => Promise<{ error?: string }>
  toggleUsuario: (id: string) => Promise<{ error?: string }>
  cambiarPinAdmin: (usuarioId: string, pinNuevo: string) => Promise<{ error?: string }>
  refresh: () => void
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Error de conexión'
}

function getToken(): string | null { return useAppStore.getState().user?.token ?? null }
function trace(accion: string, error: unknown): void { reportAppError({ fase: 'Usuarios', accion, error }) }
function sessionError(accion: string): string {
  const detail = 'Tu sesión ha caducado. Inicia sesión de nuevo.'
  trace(accion, new Error(detail))
  return detail
}

export function useUsuarios(): UseUsuariosReturn {
  const [usuarios, setUsuarios] = useState<UsuarioAdmin[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchUsuarios = useCallback(async () => {
    try {
      setLoading(true); setError(null)
      const token = getToken()
      if (!token) { setError(sessionError('Consultar usuarios')); return }
      const response = await adminUsersRequest<{ usuarios: unknown }>(token, { action: 'list' })
      setUsuarios(z.array(usuarioAdminSchema).parse(response.usuarios))
    } catch (cause) {
      trace('Consultar usuarios', cause)
      setError(errorMessage(cause))
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { void fetchUsuarios() }, [fetchUsuarios])

  const crearUsuario = async (data: CrearUsuarioInput): Promise<{ error?: string }> => {
    if (!data.nombre.trim()) return { error: 'El nombre es obligatorio' }
    if (!data.username.trim()) return { error: 'El username es obligatorio' }
    if (!/^\d{4}$/.test(data.pin)) return { error: 'El PIN debe tener exactamente 4 dígitos numéricos' }
    if (!data.rol) return { error: 'El rol es obligatorio' }
    try {
      const token = getToken()
      if (!token) return { error: sessionError('Crear usuario') }
      await adminUsersRequest(token, {
        action: 'create', nombre: data.nombre.trim(), username: data.username.trim().toLowerCase(),
        pin: data.pin, rol: data.rol, centro_id: data.centro_id ?? null,
      })
      await fetchUsuarios()
      return {}
    } catch (cause) { trace('Crear usuario', cause); return { error: errorMessage(cause) } }
  }

  const toggleUsuario = async (id: string): Promise<{ error?: string }> => {
    try {
      const token = getToken()
      if (!token) return { error: sessionError('Cambiar estado de usuario') }
      await adminUsersRequest(token, { action: 'toggle', usuario_id: id })
      await fetchUsuarios()
      return {}
    } catch (cause) { trace('Cambiar estado de usuario', cause); return { error: errorMessage(cause) } }
  }

  const cambiarPinAdmin = async (usuarioId: string, pinNuevo: string): Promise<{ error?: string }> => {
    if (!/^\d{4}$/.test(pinNuevo)) return { error: 'El PIN debe tener exactamente 4 dígitos numéricos' }
    try {
      const token = getToken()
      if (!token) return { error: sessionError('Cambiar PIN de usuario') }
      await adminUsersRequest(token, { action: 'change-pin', usuario_id: usuarioId, pin: pinNuevo })
      return {}
    } catch (cause) { trace('Cambiar PIN de usuario', cause); return { error: errorMessage(cause) } }
  }

  return { usuarios, loading, error, crearUsuario, toggleUsuario, cambiarPinAdmin, refresh: fetchUsuarios }
}
