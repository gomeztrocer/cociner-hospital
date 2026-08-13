import { reportAppError } from '../store/useErrorTraceStore'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_ANON_KEY

interface ApiErrorBody { error?: string }

export class CocinerApiError extends Error {
  readonly status: number
  readonly traceId: string

  constructor(message: string, status: number, traceId: string) {
    super(message)
    this.name = 'CocinerApiError'
    this.status = status
    this.traceId = traceId
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

interface RequestOptions { token?: string }

const ACTION_LABELS: Record<string, string> = {
  login: 'Iniciar sesión', logout: 'Cerrar sesión', 'change-pin': 'Cambiar PIN',
  list: 'Consultar datos', create: 'Crear registro', 'create-batch': 'Registrar producciones',
  update: 'Editar registro', delete: 'Eliminar registro', get: 'Consultar comensales',
  save: 'Guardar cambios', 'copy-previous': 'Copiar día anterior',
  archive: 'Archivar preparación', toggle: 'Cambiar estado de usuario',
}

function traceContext(functionName: string, payload: Record<string, unknown>): { fase: string; accion: string } {
  const phases: Record<string, string> = {
    'cociner-auth': 'Acceso y sesión',
    'cociner-admin-users': 'Usuarios',
    'cociner-comensales': 'Fase 1 · Comensales',
    'cociner-catalogo': 'Fase 2 · Catálogos',
    'cociner-registros': 'Control de producción e historial',
  }
  const action = typeof payload.action === 'string' ? payload.action : ''
  return {
    fase: phases[functionName] ?? 'Comunicación con el servidor',
    accion: (ACTION_LABELS[action] ?? action) || 'Completar operación',
  }
}

export async function callFunction<T>(
  functionName: string,
  payload: Record<string, unknown>,
  options: RequestOptions = {},
): Promise<T> {
  const context = traceContext(functionName, payload)
  if (!supabaseUrl || !supabasePublishableKey) {
    const error = new Error('Falta configurar Supabase')
    const trace = reportAppError({ ...context, error })
    throw new CocinerApiError(error.message, 0, trace.id)
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    apikey: supabasePublishableKey,
  }
  if (options.token) headers.Authorization = `Bearer ${options.token}`

  let response: Response
  try {
    response = await fetch(`${supabaseUrl}/functions/v1/${functionName}`, {
      method: 'POST', headers, body: JSON.stringify(payload),
    })
  } catch (error) {
    const trace = reportAppError({
      ...context, error,
      mensaje: 'No se pudo conectar con el servidor. Revisa la conexión e inténtalo de nuevo.',
    })
    throw new CocinerApiError(trace.mensaje, 0, trace.id)
  }

  const body = await response.json().catch(() => ({})) as ApiErrorBody & T
  if (!response.ok) {
    const message = body.error ?? 'No se pudo completar la operación'
    const trace = reportAppError({
      ...context,
      error: { status: response.status, message },
      mensaje: message,
    })
    throw new CocinerApiError(message, response.status, trace.id)
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
  return callFunction<void>('cociner-auth', { action: 'change-pin', currentPin, newPin }, { token })
}

export function adminUsersRequest<T>(token: string, payload: Record<string, unknown>): Promise<T> {
  return callFunction<T>('cociner-admin-users', payload, { token })
}

export function registrosRequest<T>(token: string, payload: Record<string, unknown>): Promise<T> {
  return callFunction<T>('cociner-registros', payload, { token })
}

export function getComensalesDia(token: string, fecha: string): Promise<ComensalesDiaResponse> {
  return callFunction<ComensalesDiaResponse>('cociner-comensales', { action: 'get', fecha }, { token })
}

export function saveComensalesDia(
  token: string,
  fecha: string,
  valores: ValorComensalesDia[],
): Promise<ComensalesDiaResponse> {
  return callFunction<ComensalesDiaResponse>(
    'cociner-comensales', { action: 'save', fecha, valores }, { token },
  )
}

export function copyComensalesDiaAnterior(token: string, fecha: string): Promise<ComensalesDiaResponse> {
  return callFunction<ComensalesDiaResponse>(
    'cociner-comensales', { action: 'copy-previous', fecha }, { token },
  )
}
