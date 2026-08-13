import { create } from 'zustand'
import { type Centro } from '../data/centros'
import {
  crearEstadoComensalesFallback,
  calcularTotalComensales,
  getFechaLocalTenerife,
  type DisponibilidadPorServicio,
  type DefinidosPorServicio,
  type PacientesPorServicio,
} from '../lib/comensales'
import {
  calcularProteina,
  calcularGuarnicion,
  calcularDesgloseCentros,
  calcularCoberturaGuarniciones,
  obtenerGramajeSugeridoGuarnicion,
  type ProteinaResult,
  type GuarnicionResult,
  type DesgloseCentro,
} from '../lib/calculos'

// ── Types ──

export interface PreparacionProteina {
  id: string
  nombre: string
  unidadesPorCaja: number
  unidadesPorRacion: number
  nombreUnidad: string
  merma: number
  mermaDefinida: boolean
  mermaAuto: boolean
  mermaSource: string
}

export interface PreparacionGuarnicion {
  id: string
  nombre: string
  bolsaKg: number
  merma: number
  mermaDefinida: boolean
  mermaAuto: boolean
  mermaSource: string
  gramos: number
  gramosManual: boolean
  pacientesAsignados: number
}

export interface UserSession {
  id: string
  username: string
  nombre_completo: string
  rol: string
  token: string
  expiresAt?: string
}

export interface AppState {
  servicio: 'almuerzo' | 'cena'
  fechaTrabajo: string
  centros: Centro[]
  pacientes: Record<string, number>
  pacientesPorServicio: PacientesPorServicio
  disponibilidadPorServicio: DisponibilidadPorServicio
  definidosPorServicio: DefinidosPorServicio
  tabActivo: 'proteina' | 'guarnicion'
  proteinas: PreparacionProteina[]
  guarniciones: PreparacionGuarnicion[]
  resultadosProteinas: Record<string, ProteinaResult | DesgloseCentro[] | null>
  resultadosGuarniciones: Record<string, GuarnicionResult | null>
  user: UserSession | null

  setServicio: (s: 'almuerzo' | 'cena') => void
  cargarComensalesDia: (
    fecha: string,
    centros: Centro[],
    pacientes: PacientesPorServicio,
    disponibilidad: DisponibilidadPorServicio,
    definidos: DefinidosPorServicio,
  ) => void
  setPaciente: (centroId: string, valor: number | null) => void
  setTab: (tab: 'proteina' | 'guarnicion') => void

  addProteina: (preset?: Partial<PreparacionProteina>) => void
  removeProteina: (id: string) => void
  updateProteina: (id: string, changes: Partial<PreparacionProteina>) => void
  calcularProteinaPrep: (id: string) => void

  addGuarnicion: (preset?: Partial<PreparacionGuarnicion>) => void
  removeGuarnicion: (id: string) => void
  updateGuarnicion: (id: string, changes: Partial<PreparacionGuarnicion>) => void
  calcularGuarnicionPrep: (id: string) => void

  recalcularAsignaciones: () => void
  resetResultados: () => void
  getTotalPacientes: () => number
  setUser: (user: UserSession | null) => void
}

// ── Helpers ──

function createDefaultProteina(): PreparacionProteina {
  return {
    id: crypto.randomUUID(),
    nombre: '',
    unidadesPorCaja: 52,
    unidadesPorRacion: 1,
    nombreUnidad: 'piezas',
    merma: 25,
    mermaDefinida: true,
    mermaAuto: false,
    mermaSource: 'Escribí el nombre para autocompletar',
  }
}

function createDefaultGuarnicion(): PreparacionGuarnicion {
  return {
    id: crypto.randomUUID(),
    nombre: '',
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

function createEjemploProteina(): PreparacionProteina {
  return {
    id: crypto.randomUUID(),
    nombre: 'Muslo pollo',
    unidadesPorCaja: 20,
    unidadesPorRacion: 2,
    nombreUnidad: 'muslos',
    merma: 30,
    mermaDefinida: true,
    mermaAuto: true,
    mermaSource: 'Muslo/pernil horno ~30% (tabla mermas hospitalaria)',
  }
}

function createEjemploGuarnicion(): PreparacionGuarnicion {
  return {
    id: crypto.randomUUID(),
    nombre: 'Arroz',
    bolsaKg: 2.5,
    merma: -200,
    mermaDefinida: true,
    mermaAuto: true,
    mermaSource: 'Arroz: absorbe agua, triplica peso (factor ×3)',
    gramos: 120,
    gramosManual: false,
    pacientesAsignados: 0,
  }
}

// ── Store ──

const estadoInicialComensales = crearEstadoComensalesFallback(getFechaLocalTenerife())

export const useAppStore = create<AppState>((set, get) => ({
  servicio: 'almuerzo',
  fechaTrabajo: estadoInicialComensales.fecha,
  centros: estadoInicialComensales.centros,
  pacientes: estadoInicialComensales.pacientes.almuerzo,
  pacientesPorServicio: estadoInicialComensales.pacientes,
  disponibilidadPorServicio: estadoInicialComensales.disponibilidad,
  definidosPorServicio: estadoInicialComensales.definidos,
  tabActivo: 'proteina',
  proteinas: [createEjemploProteina()],
  guarniciones: [createEjemploGuarnicion()],
  resultadosProteinas: {},
  resultadosGuarniciones: {},
  user: null,

  setServicio: (servicio) => {
    set((state) => ({ servicio, pacientes: state.pacientesPorServicio[servicio] }))
    get().recalcularAsignaciones()
  },

  cargarComensalesDia: (fecha, centros, pacientesPorServicio, disponibilidadPorServicio, definidosPorServicio) => {
    set((state) => ({
      fechaTrabajo: fecha,
      centros,
      pacientesPorServicio,
      disponibilidadPorServicio,
      definidosPorServicio,
      pacientes: pacientesPorServicio[state.servicio],
    }))
    get().recalcularAsignaciones()
  },

  setPaciente: (centroId, valor) => {
    set((state) => {
      if (state.disponibilidadPorServicio[state.servicio][centroId] === false) return state
      const pacientesServicio = {
        ...state.pacientesPorServicio[state.servicio],
        [centroId]: valor == null ? 0 : Math.max(0, Math.floor(valor)),
      }
      return {
        pacientes: pacientesServicio,
        pacientesPorServicio: {
          ...state.pacientesPorServicio,
          [state.servicio]: pacientesServicio,
        },
        definidosPorServicio: {
          ...state.definidosPorServicio,
          [state.servicio]: {
            ...state.definidosPorServicio[state.servicio],
            [centroId]: valor != null,
          },
        },
      }
    })
    get().recalcularAsignaciones()
  },

  setTab: (tab) => {
    set({ tabActivo: tab })
  },

  addProteina: (preset) => {
    set((state) => {
      const nueva = createDefaultProteina()
      if (preset) Object.assign(nueva, preset)
      return { proteinas: [...state.proteinas, nueva] }
    })
  },

  removeProteina: (id) => {
    set((state) => ({
      proteinas: state.proteinas.filter((p) => p.id !== id),
    }))
  },

  updateProteina: (id, changes) => {
    set((state) => ({
      proteinas: state.proteinas.map((p) =>
        p.id === id ? { ...p, ...changes } : p,
      ),
    }))
  },

  calcularProteinaPrep: (id) => {
    const state = get()
    const totalPacientes = Object.values(state.pacientes).reduce(
      (a, b) => a + b,
      0,
    )
    const prep = state.proteinas.find((p) => p.id === id)
    if (!prep || totalPacientes === 0) return

    const proteina = calcularProteina({
      totalPacientes,
      unidadesPorCaja: prep.unidadesPorCaja,
      unidadesPorRacion: prep.unidadesPorRacion,
      mermaP: prep.merma,
    })

    const desglose = calcularDesgloseCentros({
      centros: state.centros,
      pacientes: state.pacientes,
      unidadesPorRacion: prep.unidadesPorRacion,
    })

    set((s) => ({
      resultadosProteinas: {
        ...s.resultadosProteinas,
        [id]: { ...proteina, desglose, nombre: prep.nombre, nombreUnidad: prep.nombreUnidad, servicio: state.servicio === 'almuerzo' ? 'Almuerzo' : 'Cena' },
      },
    }))
  },

  addGuarnicion: (preset) => {
    const state = get()
    if (state.guarniciones.length >= 2) return
    const guarnicionesCalculadas = state.guarniciones
      .filter((guarnicion) => state.resultadosGuarniciones[guarnicion.id] != null)
      .map((guarnicion) => guarnicion.id)
    set((s) => {
      const nueva = createDefaultGuarnicion()
      if (preset) Object.assign(nueva, preset)
      return { guarniciones: [...s.guarniciones, nueva] }
    })
    get().recalcularAsignaciones()
    guarnicionesCalculadas.forEach((id) => get().calcularGuarnicionPrep(id))
  },

  removeGuarnicion: (id) => {
    set((state) => ({
      guarniciones: state.guarniciones.filter((g) => g.id !== id),
    }))
    get().recalcularAsignaciones()
  },

  updateGuarnicion: (id, changes) => {
    set((state) => ({
      guarniciones: state.guarniciones.map((g) =>
        g.id === id ? { ...g, ...changes } : g,
      ),
      resultadosGuarniciones: {
        ...state.resultadosGuarniciones,
        [id]: null,
      },
    }))
  },

  calcularGuarnicionPrep: (id) => {
    const state = get()
    const prep = state.guarniciones.find((g) => g.id === id)
    if (!prep || prep.pacientesAsignados === 0) return

    const resultado = calcularGuarnicion({
      totalPacientes: prep.pacientesAsignados,
      bolsaKg: prep.bolsaKg,
      mermaP: prep.merma,
      racionG: prep.gramos,
    })

    set((s) => ({
      resultadosGuarniciones: {
        ...s.resultadosGuarniciones,
        [id]: resultado,
      },
    }))
  },

  recalcularAsignaciones: () => {
    const state = get()
    const total = calcularTotalComensales(
      state.pacientes,
      state.disponibilidadPorServicio[state.servicio],
    )
    const coberturas = calcularCoberturaGuarniciones(total, state.guarniciones.length)
    const gramosSugeridos = obtenerGramajeSugeridoGuarnicion(state.guarniciones.length)
    set({
      guarniciones: state.guarniciones.map((g, i) => ({
        ...g,
        gramos: g.gramosManual ? g.gramos : gramosSugeridos,
        pacientesAsignados: coberturas[i] ?? total,
      })),
      // Clear stale results — old cálculos ya no corresponden
      resultadosGuarniciones: {},
    })
  },

  resetResultados: () => {
    set({ resultadosProteinas: {}, resultadosGuarniciones: {} })
  },

  setUser: (user) => {
    set({ user })
  },

  getTotalPacientes: () => {
    return Object.values(get().pacientes).reduce((a, b) => a + b, 0)
  },
}))

// Inicializa la cobertura completa y el gramaje habitual de la primera guarnición.
useAppStore.getState().recalcularAsignaciones()
