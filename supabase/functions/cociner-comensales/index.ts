const headers = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Content-Type': 'application/json' }
function response(body: Record<string, unknown>, status = 200): Response { return new Response(JSON.stringify(body), { status, headers }) }
function text(value: unknown): string | null { return typeof value === 'string' ? value : null }
async function hash(value: string): Promise<string> { const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)); return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('') }
function serviceKey(): string { const legacy = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'); if (legacy) return legacy; const keys = JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') ?? '{}') as Record<string, unknown>; if (typeof keys.default !== 'string') throw new Error('Falta clave de servidor'); return keys.default }
async function rpc(name: string, payload: Record<string, unknown>): Promise<{ ok: boolean; body: unknown }> { const url = Deno.env.get('SUPABASE_URL'); if (!url) throw new Error('Falta URL de Supabase'); const result = await fetch(`${url}/rest/v1/rpc/${name}`, { method: 'POST', headers: { apikey: serviceKey(), 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }); const raw = await result.text(); let body: unknown = null; try { body = raw ? JSON.parse(raw) : null } catch { body = raw }; return { ok: result.ok, body } }
function bearer(request: Request): string | null { const value = request.headers.get('authorization')?.replace(/^Bearer\s+/, '') ?? ''; return /^[a-f0-9]{64}$/.test(value) ? value : null }
function validDate(value: unknown): value is string { return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) }

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers })
  if (request.method !== 'POST') return response({ error: 'Método no permitido' }, 405)
  try {
    const input = await request.json() as Record<string, unknown>
    const rawToken = bearer(request)
    if (!rawToken) return response({ error: 'Tu sesión ha caducado. Inicia sesión de nuevo.' }, 401)
    if (!validDate(input.fecha)) return response({ error: 'Fecha de trabajo no válida' }, 400)
    const p_token_hash = await hash(rawToken)
    const action = text(input.action)
    const payload = { p_token_hash, p_fecha: input.fecha }
    let result: { ok: boolean; body: unknown }
    if (action === 'get') result = await rpc('cociner_comensales_get', payload)
    else if (action === 'save') {
      if (!Array.isArray(input.valores)) return response({ error: 'Cantidades no válidas' }, 400)
      result = await rpc('cociner_comensales_save', { ...payload, p_valores: input.valores })
    } else if (action === 'copy-previous') result = await rpc('cociner_comensales_copy_previous', payload)
    else return response({ error: 'Acción no permitida' }, 400)

    if (result.ok && result.body && typeof result.body === 'object') return response(result.body as Record<string, unknown>)
    const detail = JSON.stringify(result.body)
    if (detail.includes('NO_PREVIOUS_DATA')) return response({ error: 'El día anterior no tiene comensales guardados' }, 404)
    if (detail.includes('UNAUTHORIZED')) return response({ error: 'Tu sesión ha caducado. Inicia sesión de nuevo.' }, 401)
    console.error(result.body)
    return response({ error: 'No se pudieron guardar los comensales' }, 400)
  } catch (error) {
    console.error(error)
    return response({ error: 'Error temporal del servidor' }, 500)
  }
})
