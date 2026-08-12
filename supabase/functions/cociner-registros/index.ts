const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
}

function response(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers })
}

function text(value: unknown): string | null {
  return typeof value === 'string' ? value : null
}

function isUuid(value: string | null): value is string {
  return Boolean(value && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value))
}

function isDate(value: string | null): value is string {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  return date.getUTCFullYear() === year
    && date.getUTCMonth() === month - 1
    && date.getUTCDate() === day
}

function positiveInteger(value: unknown): number | null {
  return typeof value === 'number' && Number.isInteger(value) && value > 0 ? value : null
}

async function hash(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')
}

function serviceKey(): string {
  const legacy = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (legacy) return legacy

  const keys = JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') ?? '{}') as Record<string, unknown>
  if (typeof keys.default !== 'string') throw new Error('Falta clave de servidor')
  return keys.default
}

async function rpc(name: string, payload: Record<string, unknown>): Promise<{ ok: boolean; body: unknown }> {
  const url = Deno.env.get('SUPABASE_URL')
  if (!url) throw new Error('Falta URL de Supabase')

  const result = await fetch(`${url}/rest/v1/rpc/${name}`, {
    method: 'POST',
    headers: {
      apikey: serviceKey(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  const raw = await result.text()
  let body: unknown = null
  try {
    body = raw ? JSON.parse(raw) : null
  } catch {
    body = raw
  }
  return { ok: result.ok, body }
}

function bearer(request: Request): string | null {
  const value = request.headers.get('authorization')?.replace(/^Bearer\s+/, '') ?? ''
  return /^[a-f0-9]{64}$/.test(value) ? value : null
}

function rpcError(result: { body: unknown }, fallback: string): string {
  const serialized = JSON.stringify(result.body)
  if (/No autorizado/i.test(serialized)) return 'Solo una administradora puede realizar esta acción.'
  if (/Sesión no válida/i.test(serialized)) return 'Tu sesión ha caducado. Inicia sesión de nuevo.'
  if (/fecha no puede ser futura/i.test(serialized)) return 'La fecha no puede ser futura.'
  if (/Registro no encontrado/i.test(serialized)) return 'El registro ya no está disponible.'
  return fallback
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers })
  if (request.method !== 'POST') return response({ error: 'Método no permitido' }, 405)

  try {
    const input = await request.json() as Record<string, unknown>
    const rawToken = bearer(request)
    if (!rawToken) return response({ error: 'Tu sesión ha caducado. Inicia sesión de nuevo.' }, 401)

    const p_token_hash = await hash(rawToken)
    const action = text(input.action)

    if (action === 'list') {
      const fecha = text(input.fecha)
      if (!isDate(fecha)) return response({ error: 'Fecha no válida' }, 400)

      const result = await rpc('cociner_registros_list', {
        p_token_hash,
        p_fecha: fecha,
        p_incluir_todos: input.incluir_todos === true,
      })
      if (!result.ok) return response({ error: rpcError(result, 'No se pudo cargar el historial.') }, 400)
      return response({ registros: Array.isArray(result.body) ? result.body : [] })
    }

    if (action === 'create') {
      const plato = text(input.plato)?.trim() ?? ''
      const servicio = text(input.servicio)
      const raciones = positiveInteger(input.raciones)
      const fecha = text(input.fecha)
      const notas = text(input.notas)
      const categoria = text(input.categoria)?.trim() || 'manual'

      if (!plato || plato.length > 200) return response({ error: 'El plato es obligatorio.' }, 400)
      if (!servicio || !['Almuerzo', 'Cena'].includes(servicio)) return response({ error: 'Servicio no válido.' }, 400)
      if (!raciones) return response({ error: 'Las raciones deben ser al menos 1.' }, 400)
      if (!isDate(fecha)) return response({ error: 'Fecha no válida.' }, 400)

      const result = await rpc('cociner_registros_create', {
        p_token_hash,
        p_plato: plato,
        p_servicio: servicio,
        p_raciones: raciones,
        p_fecha: fecha,
        p_notas: notas,
        p_categoria: categoria,
      })
      if (!result.ok) return response({ error: rpcError(result, 'No se pudo guardar el registro.') }, 400)
      return response({ id: result.body }, 201)
    }

    if (action === 'update') {
      const registroId = text(input.registro_id)
      const plato = text(input.plato)?.trim() ?? ''
      const servicio = text(input.servicio)
      const raciones = positiveInteger(input.raciones)
      const fecha = text(input.fecha)
      const notas = text(input.notas)

      if (!isUuid(registroId)) return response({ error: 'Registro no válido.' }, 400)
      if (!plato || plato.length > 200) return response({ error: 'El plato es obligatorio.' }, 400)
      if (!servicio || !['Almuerzo', 'Cena'].includes(servicio)) return response({ error: 'Servicio no válido.' }, 400)
      if (!raciones) return response({ error: 'Las raciones deben ser al menos 1.' }, 400)
      if (!isDate(fecha)) return response({ error: 'Fecha no válida.' }, 400)

      const result = await rpc('cociner_registros_update', {
        p_token_hash,
        p_registro_id: registroId,
        p_plato: plato,
        p_servicio: servicio,
        p_raciones: raciones,
        p_fecha: fecha,
        p_notas: notas,
      })
      if (!result.ok) return response({ error: rpcError(result, 'No se pudo editar el registro.') }, 403)
      return response({ ok: true })
    }

    if (action === 'delete') {
      const registroId = text(input.registro_id)
      if (!isUuid(registroId)) return response({ error: 'Registro no válido.' }, 400)

      const result = await rpc('cociner_registros_delete', {
        p_token_hash,
        p_registro_id: registroId,
      })
      if (!result.ok) return response({ error: rpcError(result, 'No se pudo eliminar el registro.') }, 403)
      return response({ ok: true })
    }

    return response({ error: 'Acción no permitida' }, 400)
  } catch (error) {
    console.error(error)
    return response({ error: 'Error temporal del servidor' }, 500)
  }
})
