// @vitest-environment jsdom

import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useAppStore } from '../store/useAppStore'
import { useErrorTraceStore } from '../store/useErrorTraceStore'
import { useHistorial, type Registro } from './useHistorial'

const api = vi.hoisted(() => ({
  registrosRequest: vi.fn(),
  isSessionExpiredError: vi.fn(),
}))

vi.mock('../lib/cocinerApi', () => ({
  registrosRequest: api.registrosRequest,
  isSessionExpiredError: api.isSessionExpiredError,
}))

const registro: Registro = {
  id: '11111111-1111-4111-8111-111111111111',
  usuario_id: '22222222-2222-4222-8222-222222222222',
  usuario_nombre: 'Chef Prueba',
  plato: 'Arroz',
  servicio: 'Almuerzo',
  raciones: 120,
  fecha: '2026-08-10',
  notas: null,
  categoria: 'manual',
  barquetas: 12,
  cantidad_calculada_g: null,
  cantidad_producida_g: null,
  distribucion_centros: [],
  grupo_produccion: null,
  created_at: '2026-08-10T10:00:00.000Z',
  updated_at: null,
}

describe('useHistorial', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    api.registrosRequest.mockReset()
    api.isSessionExpiredError.mockReset()
    api.isSessionExpiredError.mockReturnValue(false)
    api.registrosRequest.mockResolvedValue({ registros: [] })
    useErrorTraceStore.getState().clear()
    useAppStore.setState({
      user: {
        id: 'admin-1',
        username: 'admin',
        nombre_completo: 'Administradora',
        rol: 'admin',
        token: 'token-sesion',
      },
    })
  })

  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  it('consulta la fecha seleccionada y permite al admin incluir todos los usuarios', async () => {
    api.registrosRequest.mockResolvedValueOnce({ registros: [registro] })

    const { result } = renderHook(() => useHistorial('admin-1', '2026-08-10', true))

    await waitFor(() => expect(result.current.registros).toEqual([registro]))
    expect(api.registrosRequest).toHaveBeenCalledWith('token-sesion', {
      action: 'list',
      fecha: '2026-08-10',
      incluir_todos: true,
    })
  })

  it('crea una producción con una fecha anterior y refresca el historial', async () => {
    const { result } = renderHook(() => useHistorial('admin-1', '2026-08-10', true))
    await waitFor(() => expect(api.registrosRequest).toHaveBeenCalledTimes(1))

    await act(async () => {
      expect(await result.current.addRegistro({
        plato: 'Menestra',
        servicio: 'Cena',
        raciones: 80,
        fecha: '2026-08-09',
      })).toEqual({})
    })

    expect(api.registrosRequest).toHaveBeenCalledWith('token-sesion', {
      action: 'create',
      plato: 'Menestra',
      servicio: 'Cena',
      raciones: 80,
      fecha: '2026-08-09',
      notas: null,
      categoria: 'manual',
      barquetas: null,
      cantidad_calculada_g: null,
      cantidad_producida_g: null,
      distribucion_centros: null,
    })
    expect(api.registrosRequest).toHaveBeenCalledTimes(3)
  })

  it('envía las ediciones y eliminaciones al endpoint protegido y refresca después', async () => {
    const { result } = renderHook(() => useHistorial('admin-1', '2026-08-10', true))
    await waitFor(() => expect(api.registrosRequest).toHaveBeenCalledTimes(1))

    await act(async () => {
      expect(await result.current.updateRegistro({
        id: registro.id,
        plato: 'Arroz integral',
        servicio: 'Cena',
        raciones: 100,
        fecha: '2026-08-08',
        notas: 'Corregido',
      })).toEqual({})
    })
    expect(api.registrosRequest).toHaveBeenCalledWith('token-sesion', {
      action: 'update',
      registro_id: registro.id,
      plato: 'Arroz integral',
      servicio: 'Cena',
      raciones: 100,
      fecha: '2026-08-08',
      notas: 'Corregido',
      barquetas: null,
      cantidad_calculada_g: null,
      cantidad_producida_g: null,
      distribucion_centros: null,
    })

    await act(async () => {
      expect(await result.current.deleteRegistro(registro.id)).toEqual({})
    })
    expect(api.registrosRequest).toHaveBeenCalledWith('token-sesion', {
      action: 'delete',
      registro_id: registro.id,
    })
    expect(api.registrosRequest).toHaveBeenCalledTimes(5)
  })

  it('rechaza fechas futuras antes de llamar al servidor', async () => {
    const { result } = renderHook(() => useHistorial('admin-1', '2026-08-10'))
    await waitFor(() => expect(api.registrosRequest).toHaveBeenCalledTimes(1))
    api.registrosRequest.mockClear()

    await act(async () => {
      expect(await result.current.addRegistro({
        plato: 'Arroz',
        servicio: 'Almuerzo',
        raciones: 20,
        fecha: '2999-01-01',
      })).toEqual({ error: 'La fecha no puede ser futura' })
    })

    expect(api.registrosRequest).not.toHaveBeenCalled()
  })

  it('registra dos guarniciones en una única petición atómica', async () => {
    const { result } = renderHook(() => useHistorial('admin-1', '2026-08-10', true))
    await waitFor(() => expect(api.registrosRequest).toHaveBeenCalledTimes(1))

    await act(async () => {
      expect(await result.current.addRegistrosProduccion({
        fecha: '2026-08-10',
        servicio: 'Almuerzo',
        producciones: [
          { clientId: 'arroz', plato: 'Arroz', raciones: 120, barquetas: 6, cantidadCalculadaG: 7200, cantidadProducidaG: 7500, distribucionCentros: [] },
          { clientId: 'menestra', plato: 'Menestra', raciones: 120, barquetas: 6, cantidadCalculadaG: 7200, cantidadProducidaG: 7200, distribucionCentros: [] },
        ],
      })).toEqual({})
    })

    expect(api.registrosRequest).toHaveBeenCalledWith('token-sesion', {
      action: 'create-batch',
      fecha: '2026-08-10',
      servicio: 'Almuerzo',
      producciones: [
        { client_id: 'arroz', plato: 'Arroz', raciones: 120, notas: null, categoria: 'guarnicion', barquetas: 6, cantidad_calculada_g: 7200, cantidad_producida_g: 7500, distribucion_centros: [] },
        { client_id: 'menestra', plato: 'Menestra', raciones: 120, notas: null, categoria: 'guarnicion', barquetas: 6, cantidad_calculada_g: 7200, cantidad_producida_g: 7200, distribucion_centros: [] },
      ],
    })
  })

  it('devuelve el error de guardado y lo deja disponible para el popup', async () => {
    const { result } = renderHook(() => useHistorial('admin-1', '2026-08-10'))
    await waitFor(() => expect(api.registrosRequest).toHaveBeenCalledTimes(1))
    api.registrosRequest.mockRejectedValueOnce(new Error('Base de datos no disponible'))

    await act(async () => {
      expect(await result.current.addRegistro({
        plato: 'Arroz', servicio: 'Almuerzo', raciones: 20, fecha: '2026-08-10', barquetas: 2,
      })).toEqual({ error: 'Base de datos no disponible', sessionExpired: false })
    })

    expect(useErrorTraceStore.getState().errors[0]).toMatchObject({
      fase: 'Control de producción e historial', accion: 'Crear registro', mensaje: 'Base de datos no disponible',
    })
  })
})
