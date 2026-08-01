const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_ANON_KEY

interface ApiErrorBody {
  error?: string
}

export interface CocinerSessionProfile {
  id: string
  username: string
  nombre_completo: string
  rol: string
}

export interface LoginResponse {
  profile: CocinerSessionProfile
  token: string
  expiresAt: string
}

export interface UsuarioAdminResponse {
  id: string
  username: string
  nombre_completo: string
  rol: string
  centro_id: string | null
  activo: boolean
  created_at: string
}

interface RequestOptions {
  token?: string
}

async function callFunction<T>(
  functionName: string,
  payload: Record<string, unknown>,
  options: RequestOptions = {},
): Promise<T> {
  if (!supabaseUrl || !supabasePublishableKey) {
    throw new Error('Falta configurar Supabase')
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    apikey: supabasePublishableKey,
  }

  if (options.token) {
    headers.Authorization = `Bearer ${options.token}`
  }

  const response = await fetch(`${supabaseUrl}/functions/v1/${functionName}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  })

  const body = await response.json().catch(() => ({})) as ApiErrorBody & T
  if (!response.ok) {
    throw new Error(body.error ?? 'No se pudo completar la operación')
  }

  return body as T
}

export function loginWithPin(username: string, pin: string): Promise<LoginResponse> {
  return callFunction<LoginResponse>('cociner-auth', { action: 'login', username, pin })
}

export function logoutWithToken(token: string): Promise<void> {
  return callFunction<void>('cociner-auth', { action: 'logout' }, { token })
}

export function changeOwnPin(token: string, currentPin: string, newPin: string): Promise<void> {
  return callFunction<void>(
    'cociner-auth',
    { action: 'change-pin', currentPin, newPin },
    { token },
  )
}

export function adminUsersRequest<T>(
  token: string,
  payload: Record<string, unknown>,
): Promise<T> {
  return callFunction<T>('cociner-admin-users', payload, { token })
}
