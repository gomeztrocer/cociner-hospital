import { useEffect, useState } from 'react'
import { changeOwnPin, loginWithPin, logoutWithToken } from '../lib/cocinerApi'
import { useAppStore } from '../store/useAppStore'

const SESSION_KEY = 'cocinerhosp_session'

export interface UserProfile {
  id: string
  username: string
  nombre_completo: string
  rol: string
  token: string
}

export interface UseAuthReturn {
  user: UserProfile | null
  session: UserProfile | null
  loading: boolean
  signIn: (username: string, pin: string) => Promise<{ error?: string }>
  signOut: () => Promise<void>
  cambiarPin: (pinActual: string, pinNuevo: string) => Promise<{ error?: string }>
}

function loadSession(): UserProfile | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as UserProfile
    if (parsed?.id && parsed.username && parsed.token) return parsed
    return null
  } catch {
    return null
  }
}

function saveSession(profile: UserProfile): void {
  localStorage.setItem(SESSION_KEY, JSON.stringify(profile))
}

function clearSession(): void {
  localStorage.removeItem(SESSION_KEY)
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Error de conexión. Verificá tu conexión a internet.'
}

export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<UserProfile | null>(() => {
    const loaded = loadSession()
    if (loaded) useAppStore.getState().setUser(loaded)
    return loaded
  })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setLoading(false)
  }, [])

  const signIn = async (username: string, pin: string): Promise<{ error?: string }> => {
    if (!username.trim()) return { error: 'Ingresá tu usuario' }
    if (!/^\d{4}$/.test(pin)) return { error: 'El PIN debe tener 4 dígitos' }

    try {
      const response = await loginWithPin(username.trim().toLowerCase(), pin)
      const profile: UserProfile = { ...response.profile, token: response.token }
      saveSession(profile)
      setUser(profile)
      useAppStore.getState().setUser(profile)
      return {}
    } catch (error) {
      console.error('Login error:', error)
      return { error: errorMessage(error) }
    }
  }

  const cambiarPin = async (pinActual: string, pinNuevo: string): Promise<{ error?: string }> => {
    if (!/^\d{4}$/.test(pinActual)) return { error: 'El PIN actual debe tener 4 dígitos' }
    if (!/^\d{4}$/.test(pinNuevo)) return { error: 'El PIN nuevo debe tener exactamente 4 dígitos numéricos' }

    const currentUser = user ?? useAppStore.getState().user
    if (!currentUser) return { error: 'No hay sesión activa' }

    try {
      await changeOwnPin(currentUser.token, pinActual, pinNuevo)
      return {}
    } catch (error) {
      console.error('Error en cambiarPin:', error)
      return { error: errorMessage(error) }
    }
  }

  const signOut = async (): Promise<void> => {
    const currentUser = user ?? useAppStore.getState().user
    if (currentUser?.token) await logoutWithToken(currentUser.token).catch(() => undefined)
    clearSession()
    setUser(null)
    useAppStore.getState().setUser(null)
  }

  return { user, session: user, loading, signIn, signOut, cambiarPin }
}
