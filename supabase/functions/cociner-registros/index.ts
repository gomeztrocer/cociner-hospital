const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
}

interface RpcResult {
  ok: boolean
  body: unknown
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
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
}

function positiveInteger(value: unknown): number | null {
  return typeof value === 'number' && Number.isInteger(value) && value > 0 ? value : null
}

function nonNegativeInteger(value: unknown): number | null {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 ? value : null
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

async function rpc(name: string, payload: Record<string, unknown>): Promise<RpcResult> {
  const url = Deno.env.get('SUPABASE_URL')
  if (!url) throw new Error('Falta URL de Supabase')
  const result = await fetch(`${url}/rest/v1/rpc/${name}`, {
    method: 'POST',
    headers: { apikey: serviceKey(), 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const raw = await result.text()
  let body: unknown = null
  try { body = raw ? JSON.parse(raw) : null } catch { body = raw }
  return { ok: result.ok, body }
}

function bearer(request: Request): string | null {
  const value = request.headers.get('authorization')?.replace(/^Bearer\s+/, '') ?? ''
  return /^[a-f0-9]{64}$/.test(value) ? value : null
}

function rpcFailure(result: RpcResult, fallback: string): { message: string; status: number } {
  const serialized = JSON.stringify(result.body)
  if (/No autorizado/i.test(serialized)) return { message: 'Solo una administradora puede realizar esta acción.', status: 403 }
  if (/Sesión no válida/i.test(serialized)) return { message: 'Tu sesión ha caducado. Inicia sesión de nuevo.', status: 401 }
  if (/fecha no puede ser futura/i.test(serialized)) return { message: 'La fecha no puede ser futura.', status: 400 }
  if (/Registro no encontrado/i.test(serialized)) return { message: 'El registro ya no está disponible.', status: 404 }
  return { message: fallback, status: 400 }
}

function optionalInteger(value: unknown): number | null | undefined {
  if (value == null) return null
  const parsed = nonNegativeInteger(value)
  return parsed == null ? undefined : parsed
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
      const result = await rpc('cociner_registros_list_v2', {
        p_token_hash,
        p_fecha: fecha,
        p_incluir_todos: input.incluir_todos === true,
      })
      if (!result.ok) {
        const failure = rpcFailure(result, 'No se pudo cargar el historial.')
        return response({ error: failure.message }, failure.status)
      }
      return response({ registros: Array.isArray(result.body) ? result.body : [] })
    }

    if (action === 'create') {
      const plato = text(input.plato)?.trim() ?? ''
      const servicio = text(input.servicio)
      const raciones = positiveInteger(input.raciones)
      const fecha = text(input.fecha)
      const barquetas = optionalInteger(input.barquetas)
      if (!plato || plato.length > 200) return response({ error: 'El plato es obligatorio.' }, 400)
      if (!servicio || !['Almuerzo', 'Cena'].includes(servicio)) return response({ error: 'Servicio no válido.' }, 400)
      if (!raciones) return response({ error: 'Las raciones deben ser al menos 1.' }, 400)
      if (!isDate(fecha)) return response({ error: 'Fecha no válida.' }, 400)
      if (barquetas === undefined) return response({ error: 'Las barquetas no son válidas.' }, 400)

      const result = await rpc('cociner_registros_create_v2', {
        p_token_hash,
        p_plato: plato,
        p_servicio: servicio,
        p_raciones: raciones,
        p_fecha: fecha,
        p_notas: text(input.notas),
        p_categoria: text(input.categoria)?.trim() || 'manual',
        p_barquetas: barquetas,
        p_cantidad_calculada_g: optionalInteger(input.cantidad_calculada_g),
        p_cantidad_producida_g: optionalInteger(input.cantidad_producida_g),
        p_distribucion_centros: Array.isArray(input.distribucion_centros) ? input.distribucion_centros : null,
      })
      if (!result.ok) {
        const failure = rpcFailure(result, 'No se pudo guardar el registro.')
        return response({ error: failure.message }, failure.status)
      }
      return response({ id: result.body }, 201)
    }

    if (action === 'create-batch') {
      const fecha = text(input.fecha)
      const servicio = text(input.servicio)
      const producciones = Array.isArray(input.producciones) ? input.producciones : []
      if (!isDate(fecha)) return response({ error: 'Fecha no válida.' }, 400)
      if (!servicio || !['Almuerzo', 'Cena'].includes(servicio)) return response({ error: 'Servicio no válido.' }, 400)
      if (producciones.length < 1 || producciones.length > 2) return response({ error: 'Debe haber una o dos guarniciones.' }, 400)

      for (const item of producciones) {
        if (!item || typeof item !== 'object' || Array.isArray(item)) return response({ error: 'Producción no válida.' }, 400)
        const produccion = item as Record<string, unknown>
        if (!text(produccion.plato)?.trim() || !positiveInteger(produccion.raciones)) return response({ error: 'Preparación o raciones no válidas.' }, 400)
        if (!positiveInteger(produccion.cantidad_calculada_g) || !positiveInteger(produccion.cantidad_producida_g)) return response({ error: 'Las cantidades calculada y producida deben ser mayores que 0.' }, 400)
        if (nonNegativeInteger(produccion.barquetas) == null) return response({ error: 'Las barquetas no son válidas.' }, 400)
        if (!Array.isArray(produccion.distribucion_centros)) return response({ error: 'La distribución por centro no es válida.' }, 400)
      }

      const result = await rpc('cociner_registros_create_batch', {
        p_token_hash,
        p_fecha: fecha,
        p_servicio: servicio,
        p_producciones: producciones,
      })
      if (!result.ok) {
        const failure = rpcFailure(result, 'No se pudo registrar la producción.')
        return response({ error: failure.message }, failure.status)
      }
      return response({ resultado: result.body }, 201)
    }

    if (action === 'update') {
      const registroId = text(input.registro_id)
      const plato = text(input.plato)?.trim() ?? ''
      const servicio = text(input.servicio)
      const raciones = positiveInteger(input.raciones)
      const fecha = text(input.fecha)
      const barquetas = optionalInteger(input.barquetas)
      if (!isUuid(registroId)) return response({ error: 'Registro no válido.' }, 400)
      if (!plato || plato.length > 200) return response({ error: 'El plato es obligatorio.' }, 400)
      if (!servicio || !['Almuerzo', 'Cena'].includes(servicio)) return response({ error: 'Servicio no válido.' }, 400)
      if (!raciones) return response({ error: 'Las raciones deben ser al menos 1.' }, 400)
      if (!isDate(fecha)) return response({ error: 'Fecha no válida.' }, 400)
      if (barquetas === undefined) return response({ error: 'Las barquetas no son válidas.' }, 400)

      const result = await rpc('cociner_registros_update_v2', {
        p_token_hash,
        p_registro_id: registroId,
        p_plato: plato,
        p_servicio: servicio,
        p_raciones: raciones,
        p_fecha: fecha,
        p_notas: text(input.notas),
        p_barquetas: barquetas,
        p_cantidad_calculada_g: optionalInteger(input.cantidad_calculada_g),
        p_cantidad_producida_g: optionalInteger(input.cantidad_producida_g),
        p_distribucion_centros: Array.isArray(input.distribucion_centros) ? input.distribucion_centros : null,
      })
      if (!result.ok) {
        const failure = rpcFailure(result, 'No se pudo editar el registro.')
        return response({ error: failure.message }, failure.status)
      }
      return response({ ok: true })
    }

    if (action === 'delete') {
      const registroId = text(input.registro_id)
      if (!isUuid(registroId)) return response({ error: 'Registro no válido.' }, 400)
      const result = await rpc('cociner_registros_delete', { p_token_hash, p_registro_id: registroId })
      if (!result.ok) {
        const failure = rpcFailure(result, 'No se pudo eliminar el registro.')
        return response({ error: failure.message }, failure.status)
      }
      return response({ ok: true })
    }

    return response({ error: 'Acción no permitida' }, 400)
  } catch (error) {
    console.error(error)
    return response({ error: 'Error temporal del servidor' }, 500)
  }
})
