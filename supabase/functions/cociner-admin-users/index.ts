import bcrypt from 'npm:bcryptjs@3.0.3'

interface UsuarioRow {
  id: string
  username: string
  nombre_completo: string | null
  rol: string
  centro_id: string | null
  activo: boolean
  created_at: string
}

interface SessionRow {
  id: string
  user_id: string
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json; charset=utf-8',
}

const allowedRoles = new Set(['cocinero', 'chef_ejecutivo', 'admin'])

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

async function hashToken(token: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token))
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')
}

async function sessionUser(request: Request): Promise<{ session: SessionRow; user: UsuarioRow } | null> {
  const token = getBearerToken(request)
  if (!token) return null
  const tokenHash = await hashToken(token)
  const now = encodeURIComponent(new Date().toISOString())
  const sessionResult = await rest(`app_sessions?token_hash=eq.${tokenHash}&expires_at=gt.${now}&select=id,user_id`)
  const sessions = Array.isArray(sessionResult.body) ? sessionResult.body as SessionRow[] : []
  const session = sessions[0]
  if (!sessionResult.ok || !session) return null
  const userResult = await rest(`usuarios?id=eq.${session.user_id}&select=id,username,nombre_completo,rol,centro_id,activo,created_at`)
  const users = Array.isArray(userResult.body) ? userResult.body as UsuarioRow[] : []
  const user = users[0]
  if (!userResult.ok || !user || !user.activo) return null
  return { session, user }
}

async function activeAdminCount(): Promise<number> {
  const result = await rest('usuarios?rol=eq.admin&activo=is.true&select=id')
  return result.ok && Array.isArray(result.body) ? result.body.length : 0
}

Deno.serve(async (request: Request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (request.method !== 'POST') return json({ error: 'Método no permitido' }, 405)
  try {
    const input = await request.json() as unknown
    if (!isObject(input)) return json({ error: 'Solicitud inválida' }, 400)
    const authenticated = await sessionUser(request)
    if (!authenticated) return json({ error: 'Tu sesión ha caducado. Inicia sesión de nuevo.' }, 401)
    const action = asText(input.action)

    if (action === 'list') {
      if (!['admin', 'chef_ejecutivo'].includes(authenticated.user.rol)) return json({ error: 'No tienes permiso para ver usuarios' }, 403)
      const result = await rest('usuarios?select=id,username,nombre_completo,rol,centro_id,activo,created_at&order=nombre_completo.asc')
      if (!result.ok) return json({ error: 'No se pudo cargar usuarios' }, 500)
      return json({ usuarios: Array.isArray(result.body) ? result.body : [] })
    }

    if (authenticated.user.rol !== 'admin') return json({ error: 'No tienes permiso para administrar usuarios' }, 403)

    if (action === 'create') {
      const nombre = asText(input.nombre)?.trim()
      const username = asText(input.username)?.trim().toLowerCase()
      const pin = asText(input.pin)
      const rol = asText(input.rol)
      const centroId = input.centro_id === null ? null : asText(input.centro_id)
      if (!nombre || nombre.length > 120) return json({ error: 'El nombre es obligatorio' }, 400)
      if (!username || !/^[a-z0-9._-]{2,30}$/.test(username)) return json({ error: 'El usuario debe tener entre 2 y 30 caracteres válidos' }, 400)
      if (!/^\d{4}$/.test(pin ?? '')) return json({ error: 'El PIN debe tener 4 dígitos' }, 400)
      if (!rol || !allowedRoles.has(rol)) return json({ error: 'El rol no es válido' }, 400)
      const result = await rest('usuarios', {
        method: 'POST',
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify({ nombre_completo: nombre, username, pin_hash: bcrypt.hashSync(pin, 12), rol, centro_id: centroId, activo: true }),
      })
      if (!result.ok) {
        const resultText = JSON.stringify(result.body)
        if (resultText.includes('duplicate') || resultText.includes('23505')) return json({ error: 'El username ya está en uso' }, 409)
        return json({ error: 'No se pudo crear el usuario' }, 500)
      }
      return json({ ok: true }, 201)
    }

    const usuarioId = asText(input.usuario_id)
    if (!usuarioId || !/^[0-9a-f-]{36}$/i.test(usuarioId)) return json({ error: 'Usuario inválido' }, 400)
    const targetResult = await rest(`usuarios?id=eq.${usuarioId}&select=id,rol,activo`)
    const targets = Array.isArray(targetResult.body) ? targetResult.body as UsuarioRow[] : []
    const target = targets[0]
    if (!targetResult.ok || !target) return json({ error: 'Usuario no encontrado' }, 404)

    if (action === 'toggle') {
      if (target.id === authenticated.user.id && target.activo) return json({ error: 'No puedes desactivar tu propia cuenta' }, 400)
      if (target.rol === 'admin' && target.activo && await activeAdminCount() <= 1) return json({ error: 'Debe quedar al menos un administrador activo' }, 400)
      const result = await rest(`usuarios?id=eq.${target.id}`, {
        method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ activo: !target.activo }),
      })
      if (!result.ok) return json({ error: 'No se pudo cambiar el estado' }, 500)
      return json({ ok: true })
    }

    if (action === 'change-pin') {
      const pin = asText(input.pin)
      if (!/^\d{4}$/.test(pin ?? '')) return json({ error: 'El PIN debe tener 4 dígitos' }, 400)
      const result = await rest(`usuarios?id=eq.${target.id}`, {
        method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ pin_hash: bcrypt.hashSync(pin, 12) }),
      })
      if (!result.ok) return json({ error: 'No se pudo cambiar el PIN' }, 500)
      return json({ ok: true })
    }
    return json({ error: 'Acción no permitida' }, 400)
  } catch (error) {
    console.error('cociner-admin-users error', error)
    return json({ error: 'Error temporal del servidor' }, 500)
  }
})
