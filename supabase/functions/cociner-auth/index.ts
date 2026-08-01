import bcrypt from 'npm:bcryptjs@3.0.3'

interface UsuarioRow {
  id: string
  username: string
  nombre_completo: string | null
  rol: string
  activo: boolean
  pin_hash: string
}

interface SessionRow {
  id: string
  user_id: string
  expires_at: string
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json; charset=utf-8',
}

const sessionHours = 12

function json(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders })
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function asText(value: unknown): string | null {
  return typeof value === 'string' ? value : null
}

function serviceKey(): string {
  const legacyKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (legacyKey) return legacyKey
  const keys = Deno.env.get('SUPABASE_SECRET_KEYS')
  if (!keys) throw new Error('No hay una clave de servidor configurada')
  const parsed = JSON.parse(keys) as Record<string, unknown>
  if (typeof parsed.default !== 'string') throw new Error('No hay una clave de servidor predeterminada')
  return parsed.default
}

async function rest(path: string, init: RequestInit = {}): Promise<{ ok: boolean; body: unknown }> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  if (!supabaseUrl) throw new Error('Falta la URL de Supabase')
  const response = await fetch(`${supabaseUrl}/rest/v1/${path}`, {
    ...init,
    headers: { apikey: serviceKey(), 'Content-Type': 'application/json', ...(init.headers ?? {}) },
  })
  const text = await response.text()
  let body: unknown = null
  if (text) {
    try { body = JSON.parse(text) as unknown } catch { body = text }
  }
  return { ok: response.ok, body }
}

function getBearerToken(request: Request): string | null {
  const authorization = request.headers.get('authorization')
  if (!authorization?.startsWith('Bearer ')) return null
  const token = authorization.slice('Bearer '.length).trim()
  return /^[a-f0-9]{64}$/.test(token) ? token : null
}

function randomToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32))
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
}

async function hashToken(token: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token))
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')
}

async function sessionForRequest(request: Request): Promise<{ session: SessionRow; user: UsuarioRow } | null> {
  const token = getBearerToken(request)
  if (!token) return null
  const tokenHash = await hashToken(token)
  const now = encodeURIComponent(new Date().toISOString())
  const result = await rest(`app_sessions?token_hash=eq.${tokenHash}&expires_at=gt.${now}&select=id,user_id,expires_at`)
  const sessions = Array.isArray(result.body) ? result.body as SessionRow[] : []
  const session = sessions[0]
  if (!result.ok || !session) return null
  const userResult = await rest(`usuarios?id=eq.${session.user_id}&select=id,username,nombre_completo,rol,activo,pin_hash`)
  const users = Array.isArray(userResult.body) ? userResult.body as UsuarioRow[] : []
  const user = users[0]
  if (!userResult.ok || !user || !user.activo) return null
  return { session, user }
}

function profile(user: UsuarioRow): Record<string, string> {
  return { id: user.id, username: user.username, nombre_completo: user.nombre_completo ?? user.username, rol: user.rol }
}

Deno.serve(async (request: Request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (request.method !== 'POST') return json({ error: 'Método no permitido' }, 405)
  try {
    const input = await request.json() as unknown
    if (!isObject(input)) return json({ error: 'Solicitud inválida' }, 400)
    const action = asText(input.action)
    if (action === 'login') {
      const username = asText(input.username)?.trim().toLowerCase()
      const pin = asText(input.pin)
      if (!username || !/^\d{4}$/.test(pin ?? '')) return json({ error: 'Usuario o PIN incorrecto' }, 401)
      const userResult = await rest(`usuarios?username=eq.${encodeURIComponent(username)}&activo=is.true&select=id,username,nombre_completo,rol,activo,pin_hash`)
      const users = Array.isArray(userResult.body) ? userResult.body as UsuarioRow[] : []
      const user = users[0]
      if (!userResult.ok || !user || !bcrypt.compareSync(pin, user.pin_hash)) return json({ error: 'Usuario o PIN incorrecto' }, 401)
      const token = randomToken()
      const expiresAt = new Date(Date.now() + sessionHours * 60 * 60 * 1000).toISOString()
      const insertResult = await rest('app_sessions', {
        method: 'POST',
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify({ user_id: user.id, token_hash: await hashToken(token), expires_at: expiresAt }),
      })
      if (!insertResult.ok) return json({ error: 'No se pudo iniciar sesión' }, 500)
      return json({ profile: profile(user), token, expiresAt })
    }
    const authenticated = await sessionForRequest(request)
    if (!authenticated) return json({ error: 'Tu sesión ha caducado. Inicia sesión de nuevo.' }, 401)
    if (action === 'logout') {
      await rest(`app_sessions?id=eq.${authenticated.session.id}`, { method: 'DELETE' })
      return json({ ok: true })
    }
    if (action === 'change-pin') {
      const currentPin = asText(input.currentPin)
      const newPin = asText(input.newPin)
      if (!/^\d{4}$/.test(currentPin ?? '') || !bcrypt.compareSync(currentPin, authenticated.user.pin_hash)) return json({ error: 'El PIN actual no es correcto' }, 400)
      if (!/^\d{4}$/.test(newPin ?? '')) return json({ error: 'El PIN nuevo debe tener 4 dígitos' }, 400)
      const updateResult = await rest(`usuarios?id=eq.${authenticated.user.id}`, {
        method: 'PATCH',
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify({ pin_hash: bcrypt.hashSync(newPin, 12) }),
      })
      if (!updateResult.ok) return json({ error: 'No se pudo cambiar el PIN' }, 500)
      return json({ ok: true })
    }
    return json({ error: 'Acción no permitida' }, 400)
  } catch (error) {
    console.error('cociner-auth error', error)
    return json({ error: 'Error temporal del servidor' }, 500)
  }
})
