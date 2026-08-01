const headers = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Content-Type': 'application/json' }
function response(body: Record<string, unknown>, status = 200): Response { return new Response(JSON.stringify(body), { status, headers }) }
function text(value: unknown): string | null { return typeof value === 'string' ? value : null }
async function hash(value: string): Promise<string> { const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)); return Array.from(new Uint8Array(d), (b) => b.toString(16).padStart(2, '0')).join('') }
function serviceKey(): string { const legacy = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'); if (legacy) return legacy; const keys = JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') ?? '{}') as Record<string, unknown>; if (typeof keys.default !== 'string') throw new Error('Falta clave de servidor'); return keys.default }
async function rpc(name: string, payload: Record<string, unknown>): Promise<{ ok: boolean; body: unknown }> { const url = Deno.env.get('SUPABASE_URL'); if (!url) throw new Error('Falta URL de Supabase'); const result = await fetch(`${url}/rest/v1/rpc/${name}`, { method: 'POST', headers: { apikey: serviceKey(), 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }); const raw = await result.text(); let body: unknown = null; try { body = raw ? JSON.parse(raw) : null } catch { body = raw }; return { ok: result.ok, body } }
function bearer(request: Request): string | null { const value = request.headers.get('authorization')?.replace(/^Bearer\s+/, '') ?? ''; return /^[a-f0-9]{64}$/.test(value) ? value : null }

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers })
  if (request.method !== 'POST') return response({ error: 'Método no permitido' }, 405)
  try {
    const input = await request.json() as Record<string, unknown>; const rawToken = bearer(request)
    if (!rawToken) return response({ error: 'Tu sesión ha caducado. Inicia sesión de nuevo.' }, 401)
    const p_token_hash = await hash(rawToken); const action = text(input.action)
    if (action === 'list') { const result = await rpc('cociner_admin_list', { p_token_hash }); return result.ok ? response({ usuarios: Array.isArray(result.body) ? result.body : [] }) : response({ error: 'No tienes permiso para ver usuarios' }, 403) }
    if (action === 'create') {
      const nombre = text(input.nombre)?.trim(); const username = text(input.username)?.trim().toLowerCase(); const pin = text(input.pin); const rol = text(input.rol); const centro = input.centro_id === null ? null : text(input.centro_id)
      if (!nombre || !username || !/^[a-z0-9._-]{2,30}$/.test(username) || !/^\d{4}$/.test(pin ?? '') || !['cocinero', 'chef_ejecutivo', 'admin'].includes(rol ?? '')) return response({ error: 'Datos de usuario no válidos' }, 400)
      const result = await rpc('cociner_admin_create', { p_token_hash, p_nombre: nombre, p_username: username, p_pin: pin, p_rol: rol, p_centro_id: centro })
      if (result.ok) return response({ ok: true }, 201); return response({ error: JSON.stringify(result.body).includes('duplicate') ? 'El username ya está en uso' : 'No tienes permiso para crear usuarios' }, 403)
    }
    const usuarioId = text(input.usuario_id); if (!usuarioId) return response({ error: 'Usuario inválido' }, 400)
    if (action === 'toggle') { const result = await rpc('cociner_admin_toggle', { p_token_hash, p_usuario_id: usuarioId }); return result.ok ? response({ ok: true }) : response({ error: 'No se pudo cambiar el estado' }, 400) }
    if (action === 'change-pin') { const pin = text(input.pin); if (!/^\d{4}$/.test(pin ?? '')) return response({ error: 'El PIN debe tener 4 dígitos' }, 400); const result = await rpc('cociner_admin_change_pin', { p_token_hash, p_usuario_id: usuarioId, p_pin: pin }); return result.ok ? response({ ok: true }) : response({ error: 'No se pudo cambiar el PIN' }, 400) }
    return response({ error: 'Acción no permitida' }, 400)
  } catch (error) { console.error(error); return response({ error: 'Error temporal del servidor' }, 500) }
})
