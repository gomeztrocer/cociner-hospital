import { beforeEach, describe, expect, it } from 'vitest'
import { CENTROS } from '../data/centros'
import type {
  DefinidosPorServicio,
  DisponibilidadPorServicio,
  PacientesPorServicio,
} from '../lib/comensales'
import { useAppStore, type PreparacionGuarnicion } from './useAppStore'

const pacientesPorServicio: PacientesPorServicio = {
  almuerzo: { sur: 26, candelaria: 11, tamaragua: 7 },
  cena: { sur: 19, candelaria: 4, hogara: 12, hogarb: 5 },
}

const disponibilidadPorServicio: DisponibilidadPorServicio = {
  almuerzo: Object.fromEntries(CENTROS.map((centro) => [centro.id, true])),
  cena: Object.fromEntries(CENTROS.map((centro) => [centro.id, centro.id !== 'hogara'])),
}

const definidosPorServicio: DefinidosPorServicio = {
  almuerzo: Object.fromEntries(CENTROS.map((centro) => [centro.id, true])),
  cena: Object.fromEntries(CENTROS.map((centro) => [centro.id, true])),
}

function crearGuarnicion(id: string): PreparacionGuarnicion {
  return {
    id,
    nombre: id,
    bolsaKg: 2.5,
    merma: 20,
    mermaDefinida: true,
    mermaAuto: false,
    mermaSource: '',
    gramos: 120,
    gramosManual: false,
    pacientesAsignados: 0,
  }
}

describe('store de guarniciones', () => {
  beforeEach(() => {
    useAppStore.setState({
      servicio: 'almuerzo',
      fechaTrabajo: '2026-08-10',
      centros: CENTROS,
      pacientes: pacientesPorServicio.almuerzo,
      pacientesPorServicio,
      disponibilidadPorServicio,
      definidosPorServicio,
      guarniciones: [crearGuarnicion('guarnicion-1')],
      resultadosGuarniciones: {},
    })
    useAppStore.getState().recalcularAsignaciones()
  })

  it('una guarnición usa todos los comensales reales y 120 g', () => {
    const [guarnicion] = useAppStore.getState().guarniciones

    expect(guarnicion.pacientesAsignados).toBe(44)
    expect(guarnicion.gramos).toBe(120)
  })

  it('dos guarniciones usan ambas todos los comensales y 60 g + 60 g', () => {
    useAppStore.getState().addGuarnicion({ nombre: 'guarnicion-2' })
    const guarniciones = useAppStore.getState().guarniciones

    expect(guarniciones).toHaveLength(2)
    expect(guarniciones.map((guarnicion) => guarnicion.pacientesAsignados)).toEqual([44, 44])
    expect(guarniciones.map((guarnicion) => guarnicion.gramos)).toEqual([60, 60])

    for (const guarnicion of guarniciones) {
      useAppStore.getState().calcularGuarnicionPrep(guarnicion.id)
    }
    const resultados = useAppStore.getState().resultadosGuarniciones
    expect(guarniciones.map((guarnicion) => resultados[guarnicion.id]?.netoNecesario)).toEqual([2640, 2640])
    expect(guarniciones.map((guarnicion) => resultados[guarnicion.id]?.totalPacientes)).toEqual([44, 44])
  })

  it('recalcula la primera guarnición al añadir la segunda y permite completar el lote', () => {
    const primeraId = useAppStore.getState().guarniciones[0].id
    useAppStore.getState().calcularGuarnicionPrep(primeraId)
    expect(useAppStore.getState().resultadosGuarniciones[primeraId]?.racionG).toBe(120)

    useAppStore.getState().addGuarnicion({ nombre: 'guarnicion-2' })

    const estado = useAppStore.getState()
    expect(estado.resultadosGuarniciones[primeraId]).toMatchObject({
      totalPacientes: 44,
      racionG: 60,
      netoNecesario: 2640,
    })
  })

  it('conserva el gramaje manual al cambiar el número de guarniciones y los comensales', () => {
    const primeraId = useAppStore.getState().guarniciones[0].id
    useAppStore.getState().updateGuarnicion(primeraId, { gramos: 75, gramosManual: true })
    useAppStore.getState().addGuarnicion({ nombre: 'guarnicion-2' })

    let guarniciones = useAppStore.getState().guarniciones
    expect(guarniciones[0].gramos).toBe(75)
    expect(guarniciones[1].gramos).toBe(60)

    useAppStore.getState().setPaciente('sur', 31)
    guarniciones = useAppStore.getState().guarniciones
    expect(guarniciones[0]).toMatchObject({ gramos: 75, pacientesAsignados: 49 })
    expect(guarniciones[1]).toMatchObject({ gramos: 60, pacientesAsignados: 49 })

    useAppStore.getState().calcularGuarnicionPrep(primeraId)
    expect(useAppStore.getState().resultadosGuarniciones[primeraId]).toMatchObject({
      totalPacientes: 49,
      racionG: 75,
      netoNecesario: 3675,
    })
  })

  it('respeta Cena y excluye Hogar A cuando no tiene servicio', () => {
    useAppStore.getState().setServicio('cena')
    const [guarnicion] = useAppStore.getState().guarniciones

    expect(guarnicion.pacientesAsignados).toBe(28)
    expect(guarnicion.gramos).toBe(120)
  })

  it('no permite añadir una tercera guarnición', () => {
    useAppStore.getState().addGuarnicion({ nombre: 'guarnicion-2' })
    useAppStore.getState().addGuarnicion({ nombre: 'guarnicion-3' })

    expect(useAppStore.getState().guarniciones).toHaveLength(2)
  })
})
