import { create } from 'zustand'
import { getPacientesPorServicio, CENTROS } from '../data/centros'
import {
  calcularProteina,
  calcularGuarnicion,
  calcularDesgloseCentros,
  calcularReparto,
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
  mermaAuto: boolean
  mermaSource: string
}

export interface PreparacionGuarnicion {
  id: string
  nombre: string
  bolsaKg: number
  merma: number
  mermaAuto: boolean
  mermaSource: string
  gramos: number
  pacientesAsignados: number
}

export interface UserSession {
  id: string
  username: string
  nombre_completo: string
  rol: string
  token: string
}

export interface AppState {
  servicio: 'almuerzo' | 'cena'
  pacientes: Record<string, number>
  tabActivo: 'proteina' | 'guarnicion'
  proteinas: PreparacionProteina[]
  guarniciones: PreparacionGuarnicion[]
  resultadosProteinas: Record<string, ProteinaResult | DesgloseCentro[] | null>
  resultadosGuarniciones: Record<string, GuarnicionResult | null>
  user: UserSession | null

  setServicio: (s: 'almuerzo' | 'cena') => void
  setPaciente: (centroId: string, valor: number) => void
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
    mermaAuto: false,
    mermaSource: '',
    gramos: 120,
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
    mermaAuto: true,
    mermaSource: 'Arroz: absorbe agua, triplica peso (factor ×3)',
    gramos: 120,
    pacientesAsignados: 0,
  }
}

// ── Store ──

export const useAppStore = create<AppState>((set, get) => ({
  servicio: 'almuerzo',
  pacientes: getPacientesPorServicio('almuerzo'),
  tabActivo: 'proteina',
  proteinas: [createEjemploProteina()],
  guarniciones: [createEjemploGuarnicion()],
  resultadosProteinas: {},
  resultadosGuarniciones: {},
  user: null,

  setServicio: (servicio) => {
    set({
      servicio,
      pacientes: getPacientesPorServicio(servicio),
    })
    get().recalcularAsignaciones()
  },

  setPaciente: (centroId, valor) => {
    set((state) => ({
      pacientes: {
        ...state.pacientes,
        [centroId]: Math.max(0, valor),
      },
    }))
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
      centros: CENTROS,
      servicio: state.servicio,
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
    if (state.guarniciones.length >= 3) return  // max 3
    set((s) => {
      const nueva = createDefaultGuarnicion()
      if (preset) Object.assign(nueva, preset)
      return { guarniciones: [...s.guarniciones, nueva] }
    })
    get().recalcularAsignaciones()
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
    const total = Object.values(state.pacientes).reduce((a, b) => a + b, 0)
    const shares = calcularReparto(total, state.guarniciones.length)
    set({
      guarniciones: state.guarniciones.map((g, i) => ({
        ...g,
        pacientesAsignados: shares[i] ?? total,
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

// Initialize reparto — la guarnición por defecto arranca con pacientesAsignados correctos
useAppStore.getState().recalcularAsignaciones()
