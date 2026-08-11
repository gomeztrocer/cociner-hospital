const headers = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Content-Type': 'application/json' }
function response(body: Record<string, unknown>, status = 200): Response { return new Response(JSON.stringify(body), { status, headers }) }
function text(value: unknown): string | null { return typeof value === 'string' ? value : null }
async function hash(value: string): Promise<string> { const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)); return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('') }
function serviceKey(): string { const legacy = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'); if (legacy) return legacy; const keys = JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') ?? '{}') as Record<string, unknown>; if (typeof keys.default !== 'string') throw new Error('Falta clave de servidor'); return keys.default }
async function rpc(name: string, payload: Record<string, unknown>): Promise<{ ok: boolean; body: unknown }> { const url = Deno.env.get('SUPABASE_URL'); if (!url) throw new Error('Falta URL de Supabase'); const result = await fetch(`${url}/rest/v1/rpc/${name}`, { method: 'POST', headers: { apikey: serviceKey(), 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }); const raw = await result.text(); let body: unknown = null; try { body = raw ? JSON.parse(raw) : null } catch { body = raw }; return { ok: result.ok, body } }
function bearer(request: Request): string | null { const value = request.headers.get('authorization')?.replace(/^Bearer\s+/, '') ?? ''; return /^[a-f0-9]{64}$/.test(value) ? value : null }
function uuid(value: unknown): value is string { return typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value) }

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers })
  if (request.method !== 'POST') return response({ error: 'Método no permitido' }, 405)
  try {
    const input = await request.json() as Record<string, unknown>
    const rawToken = bearer(request)
    if (!rawToken) return response({ error: 'Tu sesión ha caducado. Inicia sesión de nuevo.' }, 401)
    const p_token_hash = await hash(rawToken)
    const action = text(input.action)
    let result: { ok: boolean; body: unknown }

    if (action === 'list') result = await rpc('cociner_catalogo_list', { p_token_hash })
    else if (action === 'save') {
      if (!input.datos || typeof input.datos !== 'object' || Array.isArray(input.datos)) return response({ error: 'Datos no válidos' }, 400)
      if (input.id != null && !uuid(input.id)) return response({ error: 'Preparación no válida' }, 400)
      result = await rpc('cociner_catalogo_save', { p_token_hash, p_datos: input.datos, p_id: input.id ?? null })
    } else if (action === 'archive') {
      if (!uuid(input.id)) return response({ error: 'Preparación no válida' }, 400)
      result = await rpc('cociner_catalogo_archive', { p_token_hash, p_id: input.id })
    } else return response({ error: 'Acción no permitida' }, 400)

    if (result.ok && result.body && typeof result.body === 'object') return response(result.body as Record<string, unknown>)
    const detail = JSON.stringify(result.body)
    if (detail.includes('UNAUTHORIZED')) return response({ error: 'Tu sesión ha caducado. Inicia sesión de nuevo.' }, 401)
    if (detail.includes('DUPLICATE_NAME')) return response({ error: 'Ya existe una preparación con ese nombre y categoría' }, 409)
    if (detail.includes('NOT_FOUND')) return response({ error: 'La preparación ya no está disponible' }, 404)
    if (detail.includes('INVALID_UNIT')) return response({ error: 'Selecciona una unidad válida' }, 400)
    console.error(result.body)
    return response({ error: 'No se pudo guardar el catálogo' }, 400)
  } catch (error) {
    console.error(error)
    return response({ error: 'Error temporal del servidor' }, 500)
  }
})
