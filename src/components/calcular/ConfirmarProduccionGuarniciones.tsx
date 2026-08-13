import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { IconAlertCircle, IconCheck, IconClipboardCheck } from '@tabler/icons-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { useHistorial, type DistribucionCentroRegistro } from '../../hooks/useHistorial'
import {
  calcularEmbarquetadoCentros,
  obtenerRacionesPorBarquetaGuarnicion,
} from '../../lib/calculos'
import { getFechaLocalTenerife } from '../../lib/comensales'
import { useAppStore } from '../../store/useAppStore'
import Spinner from '../ui/Spinner'
import ProduccionGuarnicionConfirmacionItem, {
  type ProduccionGuarnicionCalculada,
  type ProduccionGuarnicionDraft,
} from './ProduccionGuarnicionConfirmacionItem'

function distribucionRegistro(produccion: ProduccionGuarnicionCalculada): DistribucionCentroRegistro[] {
  return produccion.distribucion.map((centro) => ({
    id: centro.id,
    nombre: centro.nombre,
    raciones: centro.raciones,
    barquetas_completas: centro.barquetasCompletas,
    raciones_parcial: centro.racionesParcial,
    total_barquetas: centro.barquetasMultiporcion,
  }))
}

const ConfirmarProduccionGuarniciones = () => {
  const navigate = useNavigate()
  const { user, signOut } = useAuth()
  const servicioActivo = useAppStore((state) => state.servicio)
  const fechaTrabajo = useAppStore((state) => state.fechaTrabajo)
  const centros = useAppStore((state) => state.centros)
  const pacientes = useAppStore((state) => state.pacientes)
  const disponibilidad = useAppStore((state) => state.disponibilidadPorServicio[state.servicio])
  const guarniciones = useAppStore((state) => state.guarniciones)
  const resultados = useAppStore((state) => state.resultadosGuarniciones)
  const servicio = servicioActivo === 'almuerzo' ? 'Almuerzo' : 'Cena'
  const racionesPorBarqueta = obtenerRacionesPorBarquetaGuarnicion(guarniciones.length)
  const { addRegistrosProduccion } = useHistorial(user?.id, fechaTrabajo)
  const [abierto, setAbierto] = useState(false)
  const [fecha, setFecha] = useState(fechaTrabajo)
  const [drafts, setDrafts] = useState<Record<string, ProduccionGuarnicionDraft>>({})
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sesionCaducada, setSesionCaducada] = useState(false)
  const [guardado, setGuardado] = useState<string | null>(null)

  const distribucion = useMemo(() => calcularEmbarquetadoCentros({
    centros,
    pacientes,
    disponibilidad,
    racionesPorBarqueta,
  }), [centros, pacientes, disponibilidad, racionesPorBarqueta])

  const producciones = useMemo(() => guarniciones.map((guarnicion) => {
    const resultado = resultados[guarnicion.id]
    return resultado && guarnicion.nombre.trim()
      ? { id: guarnicion.id, nombre: guarnicion.nombre.trim(), resultado, distribucion }
      : null
  }).filter((item): item is ProduccionGuarnicionCalculada => item !== null), [guarniciones, resultados, distribucion])

  const firma = producciones.map((item) => `${item.id}:${item.nombre}:${item.resultado.netoNecesario}`).join('|')
  const completas = producciones.length > 0 && producciones.length === guarniciones.length
  const pendientes = guarniciones
    .filter((guarnicion) => !resultados[guarnicion.id] || !guarnicion.nombre.trim())
    .map((guarnicion, index) => guarnicion.nombre.trim() || `Guarnición ${index + 1}`)

  useEffect(() => {
    setFecha(fechaTrabajo)
    setAbierto(false)
    setError(null)
    setSesionCaducada(false)
  }, [fechaTrabajo, servicioActivo, firma])

  const abrirConfirmacion = (): void => {
    const nuevosDrafts = Object.fromEntries(producciones.map((produccion) => [produccion.id, {
      producidoKg: String(produccion.resultado.netoNecesario / 1000),
      barquetas: String(produccion.distribucion.reduce((total, centro) => total + centro.barquetasMultiporcion, 0)),
      notas: '',
    }]))
    setDrafts(nuevosDrafts)
    setError(null)
    setAbierto(true)
  }

  const registrar = async (event: FormEvent): Promise<void> => {
    event.preventDefault()
    setError(null)
    setSesionCaducada(false)
    const produccionesInput = producciones.map((produccion) => ({ produccion, draft: drafts[produccion.id] }))
    if (produccionesInput.some(({ draft }) => !draft)) return setError('Faltan datos de producción')

    setGuardando(true)
    const result = await addRegistrosProduccion({
      fecha,
      servicio,
      producciones: produccionesInput.map(({ produccion, draft }) => ({
        clientId: produccion.id,
        plato: produccion.nombre,
        raciones: produccion.resultado.totalPacientes,
        cantidadCalculadaG: Math.round(produccion.resultado.netoNecesario),
        cantidadProducidaG: Math.round(Number(draft.producidoKg) * 1000),
        barquetas: Number(draft.barquetas),
        distribucionCentros: distribucionRegistro(produccion),
        notas: draft.notas,
      })),
    })
    setGuardando(false)
    if (result.error) {
      setError(result.error)
      setSesionCaducada(result.sessionExpired === true)
      return
    }
    setGuardado(firma)
    setAbierto(false)
  }

  if (!completas) {
    const hayAlgunCalculo = Object.values(resultados).some((resultado) => resultado != null)
    if (!hayAlgunCalculo) return null

    return (
      <div className="mt-3 space-y-2">
        <button type="button" disabled className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-accent px-3 text-sm font-semibold text-white opacity-50">
          <IconClipboardCheck size={17} />Confirmar y registrar producción
        </button>
        <div role="status" className="rounded-lg bg-warn-light px-3 py-2 text-xs text-warn">
          Calcula {pendientes.join(' y ')} para confirmar juntas todas las guarniciones.
        </div>
      </div>
    )
  }
  if (guardado === firma) return <p className="mt-3 flex items-center justify-center gap-2 rounded-lg bg-accent-light py-3 text-xs font-semibold text-accent"><IconCheck size={16} />Producción registrada en Historial y Dashboard</p>
  if (!abierto) return <button type="button" onClick={abrirConfirmacion} className="mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-accent px-3 text-sm font-semibold text-white"><IconClipboardCheck size={17} />Confirmar y registrar producción</button>

  return (
    <form onSubmit={registrar} className="mt-3 space-y-3 rounded-xl border border-accent bg-accent-light p-3">
      <h3 className="text-sm font-semibold text-text">Confirmar producción real</h3>
      <div className="grid grid-cols-2 gap-3">
        <div><label htmlFor="produccion-fecha" className="mb-1 block text-[11px] text-text2">Fecha de producción</label><input id="produccion-fecha" type="date" max={getFechaLocalTenerife()} value={fecha} onChange={(event) => setFecha(event.target.value)} className="w-full rounded-lg border border-border bg-surface px-2 py-[10px] text-sm" /></div>
        <div><span className="mb-1 block text-[11px] text-text2">Servicio</span><div className="rounded-lg border border-border bg-surface px-3 py-[10px] text-sm font-medium">{servicio}</div></div>
      </div>
      {producciones.map((produccion) => <ProduccionGuarnicionConfirmacionItem key={produccion.id} produccion={produccion} draft={drafts[produccion.id]} racionesPorBarqueta={racionesPorBarqueta} onChange={(draft) => setDrafts((actual) => ({ ...actual, [produccion.id]: draft }))} />)}
      {error && <div role="alert" className="flex items-start gap-2 rounded-lg bg-redLight p-3 text-xs text-red"><IconAlertCircle size={16} className="shrink-0" /><span>{error}</span></div>}
      {sesionCaducada && <button type="button" onClick={() => void signOut().then(() => navigate('/login', { replace: true }))} className="min-h-11 w-full rounded-lg border border-red bg-surface text-sm font-semibold text-red">Iniciar sesión de nuevo</button>}
      <div className="grid grid-cols-2 gap-2"><button type="button" disabled={guardando} onClick={() => setAbierto(false)} className="min-h-11 rounded-xl border border-border bg-surface text-sm font-semibold text-text2">Cancelar</button><button type="submit" disabled={guardando} className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-accent text-sm font-semibold text-white disabled:opacity-60">{guardando ? <><Spinner size="sm" />Guardando…</> : 'Registrar producción'}</button></div>
    </form>
  )
}

export default ConfirmarProduccionGuarniciones
