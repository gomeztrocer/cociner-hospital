import { useEffect, useState } from 'react'
import { changeOwnPin, loginWithPin, logoutWithToken } from '../lib/cocinerApi'
import { useAppStore } from '../store/useAppStore'
import { reportAppError } from '../store/useErrorTraceStore'

const SESSION_KEY = 'cocinerhosp_session'

export interface UserProfile {
  id: string
  username: string
  nombre_completo: string
  rol: string
  token: string
  expiresAt?: string
}

export interface UseAuthReturn {
  user: UserProfile | null
  session: UserProfile | null
  loading: boolean
  signIn: (username: string, pin: string) => Promise<{ error?: string }>
  signOut: () => Promise<void>
  cambiarPin: (pinActual: string, pinNuevo: string) => Promise<{ error?: string }>
}

function clearSession(): void { localStorage.removeItem(SESSION_KEY) }

function loadSession(): UserProfile | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as UserProfile
    if (parsed?.expiresAt && Date.parse(parsed.expiresAt) <= Date.now()) {
      clearSession()
      return null
    }
    if (parsed?.id && parsed.username && parsed.token) return parsed
    return null
  } catch (error) {
    reportAppError({ fase: 'Acceso y sesión', accion: 'Restaurar sesión', error })
    return null
  }
}

function saveSession(profile: UserProfile): void {
  localStorage.setItem(SESSION_KEY, JSON.stringify(profile))
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Error de conexión. Verifica tu conexión a internet.'
}

export function useAuth(): UseAuthReturn {
  const user = useAppStore((state) => state.user)
  const setUser = useAppStore((state) => state.setUser)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!useAppStore.getState().user) setUser(loadSession())
    setLoading(false)
  }, [setUser])

  const signIn = async (username: string, pin: string): Promise<{ error?: string }> => {
    if (!username.trim()) return { error: 'Ingresa tu usuario' }
    if (!/^\d{4}$/.test(pin)) return { error: 'El PIN debe tener 4 dígitos' }
    try {
      const response = await loginWithPin(username.trim().toLowerCase(), pin)
      const profile: UserProfile = { ...response.profile, token: response.token, expiresAt: response.expiresAt }
      saveSession(profile)
      setUser(profile)
      return {}
    } catch (error) {
      reportAppError({ fase: 'Acceso y sesión', accion: 'Iniciar sesión', error })
      return { error: errorMessage(error) }
    }
  }

  const cambiarPin = async (pinActual: string, pinNuevo: string): Promise<{ error?: string }> => {
    if (!/^\d{4}$/.test(pinActual)) return { error: 'El PIN actual debe tener 4 dígitos' }
    if (!/^\d{4}$/.test(pinNuevo)) return { error: 'El PIN nuevo debe tener exactamente 4 dígitos numéricos' }
    if (!user) {
      const error = new Error('No hay sesión activa')
      reportAppError({ fase: 'Acceso y sesión', accion: 'Cambiar PIN', error })
      return { error: error.message }
    }
    try {
      await changeOwnPin(user.token, pinActual, pinNuevo)
      return {}
    } catch (error) {
      reportAppError({ fase: 'Acceso y sesión', accion: 'Cambiar PIN', error })
      return { error: errorMessage(error) }
    }
  }

  const signOut = async (): Promise<void> => {
    if (user?.token) {
      try { await logoutWithToken(user.token) }
      catch (error) { reportAppError({ fase: 'Acceso y sesión', accion: 'Cerrar sesión', error }) }
    }
    clearSession()
    setUser(null)
  }

  return { user, session: user, loading, signIn, signOut, cambiarPin }
}
