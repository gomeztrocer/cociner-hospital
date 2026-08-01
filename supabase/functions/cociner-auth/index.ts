const headers = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Content-Type': 'application/json' }

function response(body: Record<string, unknown>, status = 200): Response { return new Response(JSON.stringify(body), { status, headers }) }
function text(value: unknown): string | null { return typeof value === 'string' ? value : null }
function token(): string { return Array.from(crypto.getRandomValues(new Uint8Array(32)), (b) => b.toString(16).padStart(2, '0')).join('') }
async function hash(value: string): Promise<string> { const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)); return Array.from(new Uint8Array(d), (b) => b.toString(16).padStart(2, '0')).join('') }
function serviceKey(): string { const legacy = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'); if (legacy) return legacy; const keys = JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') ?? '{}') as Record<string, unknown>; if (typeof keys.default !== 'string') throw new Error('Falta clave de servidor'); return keys.default }
async function rpc(name: string, payload: Record<string, unknown>): Promise<{ ok: boolean; body: unknown }> {
  const url = Deno.env.get('SUPABASE_URL'); if (!url) throw new Error('Falta URL de Supabase')
  const result = await fetch(`${url}/rest/v1/rpc/${name}`, { method: 'POST', headers: { apikey: serviceKey(), 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
  const raw = await result.text(); let body: unknown = null; try { body = raw ? JSON.parse(raw) : null } catch { body = raw }; return { ok: result.ok, body }
}
function bearer(request: Request): string | null { const value = request.headers.get('authorization')?.replace(/^Bearer\s+/, '') ?? ''; return /^[a-f0-9]{64}$/.test(value) ? value : null }

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers })
  if (request.method !== 'POST') return response({ error: 'Método no permitido' }, 405)
  try {
    const input = await request.json() as Record<string, unknown>
    if (input.action === 'login') {
      const username = text(input.username)?.trim().toLowerCase(); const pin = text(input.pin)
      if (!username || !/^\d{4}$/.test(pin ?? '')) return response({ error: 'Usuario o PIN incorrecto' }, 401)
      const rawToken = token(); const expiresAt = new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString()
      const result = await rpc('cociner_auth_login', { p_username: username, p_pin: pin, p_token_hash: await hash(rawToken), p_expires_at: expiresAt })
      const users = Array.isArray(result.body) ? result.body as Array<Record<string, unknown>> : []; const user = users[0]
      if (!result.ok || !user) return response({ error: 'Usuario o PIN incorrecto' }, 401)
      return response({ profile: { id: user.id, username: user.username, nombre_completo: user.nombre_completo, rol: user.rol }, token: rawToken, expiresAt })
    }
    const rawToken = bearer(request); if (!rawToken) return response({ error: 'Tu sesión ha caducado. Inicia sesión de nuevo.' }, 401)
    const tokenHash = await hash(rawToken)
    if (input.action === 'logout') { const result = await rpc('cociner_logout', { p_token_hash: tokenHash }); return result.ok ? response({ ok: true }) : response({ error: 'No se pudo cerrar sesión' }, 500) }
    if (input.action === 'change-pin') {
      const currentPin = text(input.currentPin); const newPin = text(input.newPin)
      if (!/^\d{4}$/.test(currentPin ?? '') || !/^\d{4}$/.test(newPin ?? '')) return response({ error: 'El PIN debe tener 4 dígitos' }, 400)
      const result = await rpc('cociner_change_own_pin', { p_token_hash: tokenHash, p_current_pin: currentPin, p_new_pin: newPin })
      return result.ok ? response({ ok: true }) : response({ error: 'El PIN actual no es correcto' }, 400)
    }
    return response({ error: 'Acción no permitida' }, 400)
  } catch (error) { console.error(error); return response({ error: 'Error temporal del servidor' }, 500) }
})
