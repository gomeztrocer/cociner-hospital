// @vitest-environment jsdom

import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useAppStore } from '../store/useAppStore'
import { useAuth } from './useAuth'

const api = vi.hoisted(() => ({
  loginWithPin: vi.fn(),
  logoutWithToken: vi.fn(),
  changeOwnPin: vi.fn(),
}))

vi.mock('../lib/cocinerApi', () => api)

describe('useAuth', () => {
  beforeEach(() => {
    localStorage.clear()
    useAppStore.getState().setUser(null)
    api.loginWithPin.mockReset()
    api.logoutWithToken.mockReset()
    api.changeOwnPin.mockReset()
  })
  afterEach(cleanup)

  it('descarta una sesión persistida cuando ya venció', async () => {
    localStorage.setItem('cocinerhosp_session', JSON.stringify({
      id: 'chef-1', username: 'chef', nombre_completo: 'Chef', rol: 'chef', token: 'token-vencido',
      expiresAt: '2020-01-01T00:00:00.000Z',
    }))
    const { result } = renderHook(() => useAuth())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.user).toBeNull()
    expect(localStorage.getItem('cocinerhosp_session')).toBeNull()
  })

  it('conserva la caducidad devuelta por la autenticación actual', async () => {
    api.loginWithPin.mockResolvedValue({
      profile: { id: 'chef-1', username: 'chef', nombre_completo: 'Chef', rol: 'chef' },
      token: 'token-activo',
      expiresAt: '2099-01-01T00:00:00.000Z',
    })
    const { result } = renderHook(() => useAuth())
    await waitFor(() => expect(result.current.loading).toBe(false))
    await act(async () => { expect(await result.current.signIn('chef', '1234')).toEqual({}) })
    const persisted = JSON.parse(localStorage.getItem('cocinerhosp_session') ?? '{}') as { expiresAt?: string }
    expect(persisted.expiresAt).toBe('2099-01-01T00:00:00.000Z')
  })
})
