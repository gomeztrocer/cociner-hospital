const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_ANON_KEY

interface ApiErrorBody {
  error?: string
}

export class CocinerApiError extends Error {
  readonly status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'CocinerApiError'
    this.status = status
  }
}

export function isSessionExpiredError(error: unknown): boolean {
  return error instanceof CocinerApiError
    && (error.status === 401 || /sesi.n.*(?:caduc|v.lida)/i.test(error.message))
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

export interface ComensalesServicioResponse {
  disponible: boolean
  cantidad: number | null
  guardado: boolean
}

export interface CentroComensalesResponse {
  id: string
  nombre: string
  color: string
  pax_almuerzo: number
  pax_cena: number
  almuerzo: ComensalesServicioResponse
  cena: ComensalesServicioResponse
}

export interface ComensalesDiaResponse {
  fecha: string
  centros: CentroComensalesResponse[]
  copiado_desde?: string
}

export interface ValorComensalesDia {
  centro_id: string
  almuerzo: number | null
  cena: number | null
}

interface RequestOptions {
  token?: string
}

export async function callFunction<T>(
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
    throw new CocinerApiError(body.error ?? 'No se pudo completar la operación', response.status)
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

export function registrosRequest<T>(
  token: string,
  payload: Record<string, unknown>,
): Promise<T> {
  return callFunction<T>('cociner-registros', payload, { token })
}

export function getComensalesDia(token: string, fecha: string): Promise<ComensalesDiaResponse> {
  return callFunction<ComensalesDiaResponse>(
    'cociner-comensales',
    { action: 'get', fecha },
    { token },
  )
}

export function saveComensalesDia(
  token: string,
  fecha: string,
  valores: ValorComensalesDia[],
): Promise<ComensalesDiaResponse> {
  return callFunction<ComensalesDiaResponse>(
    'cociner-comensales',
    { action: 'save', fecha, valores },
    { token },
  )
}

export function copyComensalesDiaAnterior(
  token: string,
  fecha: string,
): Promise<ComensalesDiaResponse> {
  return callFunction<ComensalesDiaResponse>(
    'cociner-comensales',
    { action: 'copy-previous', fecha },
    { token },
  )
}
