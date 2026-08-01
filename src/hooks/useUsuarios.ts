import { useCallback, useEffect, useState } from 'react'
import { adminUsersRequest } from '../lib/cocinerApi'
import { useAppStore } from '../store/useAppStore'

export interface UsuarioAdmin {
  id: string
  username: string
  nombre_completo: string
  rol: string
  centro_id: string | null
  activo: boolean
  created_at: string
}

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

function getToken(): string | null {
  return useAppStore.getState().user?.token ?? null
}

export function useUsuarios(): UseUsuariosReturn {
  const [usuarios, setUsuarios] = useState<UsuarioAdmin[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchUsuarios = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const token = getToken()
      if (!token) {
        setError('Tu sesión ha caducado. Inicia sesión de nuevo.')
        return
      }

      const response = await adminUsersRequest<{ usuarios: UsuarioAdmin[] }>(token, { action: 'list' })
      setUsuarios(response.usuarios)
    } catch (requestError) {
      console.error('Error listing usuarios:', requestError)
      setError(errorMessage(requestError))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchUsuarios()
  }, [fetchUsuarios])

  const crearUsuario = async (data: CrearUsuarioInput): Promise<{ error?: string }> => {
    if (!data.nombre.trim()) return { error: 'El nombre es obligatorio' }
    if (!data.username.trim()) return { error: 'El username es obligatorio' }
    if (!/^\d{4}$/.test(data.pin)) return { error: 'El PIN debe tener exactamente 4 dígitos numéricos' }
    if (!data.rol) return { error: 'El rol es obligatorio' }

    try {
      const token = getToken()
      if (!token) return { error: 'Tu sesión ha caducado. Inicia sesión de nuevo.' }
      await adminUsersRequest(token, {
        action: 'create',
        nombre: data.nombre.trim(),
        username: data.username.trim().toLowerCase(),
        pin: data.pin,
        rol: data.rol,
        centro_id: data.centro_id ?? null,
      })
      await fetchUsuarios()
      return {}
    } catch (requestError) {
      console.error('Error creating user:', requestError)
      return { error: errorMessage(requestError) }
    }
  }

  const toggleUsuario = async (id: string): Promise<{ error?: string }> => {
    try {
      const token = getToken()
      if (!token) return { error: 'Tu sesión ha caducado. Inicia sesión de nuevo.' }
      await adminUsersRequest(token, { action: 'toggle', usuario_id: id })
      await fetchUsuarios()
      return {}
    } catch (requestError) {
      console.error('Error toggling user:', requestError)
      return { error: errorMessage(requestError) }
    }
  }

  const cambiarPinAdmin = async (usuarioId: string, pinNuevo: string): Promise<{ error?: string }> => {
    if (!/^\d{4}$/.test(pinNuevo)) return { error: 'El PIN debe tener exactamente 4 dígitos numéricos' }

    try {
      const token = getToken()
      if (!token) return { error: 'Tu sesión ha caducado. Inicia sesión de nuevo.' }
      await adminUsersRequest(token, { action: 'change-pin', usuario_id: usuarioId, pin: pinNuevo })
      return {}
    } catch (requestError) {
      console.error('Error changing pin admin:', requestError)
      return { error: errorMessage(requestError) }
    }
  }

  return { usuarios, loading, error, crearUsuario, toggleUsuario, cambiarPinAdmin, refresh: fetchUsuarios }
}
