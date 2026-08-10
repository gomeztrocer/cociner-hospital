import { describe, expect, it } from 'vitest'
import {
  calcularTotalComensales,
  centroTieneServicio,
  crearEstadoComensalesFallback,
  getFechaLocalTenerife,
} from './comensales'

describe('comensales diarios', () => {
  it('usa el día local de Tenerife aunque UTC ya esté en el día siguiente', () => {
    expect(getFechaLocalTenerife(new Date('2026-07-01T23:30:00Z'))).toBe('2026-07-02')
  })

  it('aplica las excepciones de cena por día', () => {
    expect(centroTieneServicio('hogara', 'cena', '2026-08-11')).toBe(false)
    expect(centroTieneServicio('hogarb', 'cena', '2026-08-12')).toBe(false)
    expect(centroTieneServicio('hogara', 'almuerzo', '2026-08-11')).toBe(true)
  })

  it('mantiene almuerzo y cena como estados independientes e incluye Tamaragua', () => {
    const estado = crearEstadoComensalesFallback('2026-08-10')
    expect(estado.centros.some((centro) => centro.id === 'tamaragua')).toBe(true)
    expect(estado.pacientes.almuerzo).not.toBe(estado.pacientes.cena)
    expect(estado.pacientes.almuerzo.tamaragua).toBe(0)
  })

  it('excluye del total los centros sin servicio', () => {
    expect(calcularTotalComensales({ sur: 10, hogara: 99 }, { sur: true, hogara: false })).toBe(10)
  })
})
