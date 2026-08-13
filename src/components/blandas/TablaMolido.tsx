import { useEffect, useState } from 'react'
import { IconBlender, IconCalculator, IconCheck } from '@tabler/icons-react'
import { useAppStore } from '../../store/useAppStore'
import { useHistorial } from '../../hooks/useHistorial'
import {
  MOLIDO_RECETAS,
  MOLIDO_PROTEINA,
  escalarReceta,
  type ResultadoBlando,
} from '../../data/blandas'

const MOLIDO_RECETA = MOLIDO_RECETAS[0]!

interface Props {
  fechaProduccion: string
}

export default function TablaMolido({ fechaProduccion }: Props) {
  const user = useAppStore((s) => s.user)
  const servicio = useAppStore((s) => s.servicio)
  const { addRegistro } = useHistorial(user?.id, fechaProduccion)

  const [barquetas, setBarquetas] = useState(String(MOLIDO_RECETA.barquetasBase))
  const [resultado, setResultado] = useState<ResultadoBlando | null>(null)
  const [guardado, setGuardado] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [errorRegistro, setErrorRegistro] = useState<string | null>(null)

  useEffect(() => {
    setGuardado(false)
    setErrorRegistro(null)
  }, [servicio, fechaProduccion])

  const handleCalcular = () => {
    const b = parseInt(barquetas) || 0
    if (b < 1) return
    setResultado(escalarReceta(MOLIDO_RECETA, b))
    setGuardado(false)
    setErrorRegistro(null)
  }

  const handleRegistrar = async () => {
    const b = parseInt(barquetas) || 0
    if (b < 1) return
    setGuardando(true)
    setErrorRegistro(null)
    const r = await addRegistro({
      plato: 'Blandas - Molido',
      servicio: servicio === 'almuerzo' ? 'Almuerzo' : 'Cena',
      raciones: b * 10,
      categoria: 'blandas',
      fecha: fechaProduccion,
      barquetas: b,
    })
    setGuardando(false)
    if (r.error) {
      setErrorRegistro(r.error)
      return
    }
    setGuardado(true)
  }

  const fmtIngrediente = (cant: number, unidad: string, nota?: string) => {
    let u: string
    if (unidad === 'g' && cant >= 1000) u = `${cant / 1000} kg`
    else u = `${cant} ${unidad}`
    return nota ? `${u} (${nota})` : u
  }

  return (
    <div className="bg-surface border border-border rounded-xl p-[14px] mb-[10px] shadow-sm">
      <div className="flex items-center gap-[7px] text-sm font-semibold text-text mb-3">
        <IconBlender size={17} className="text-accent" />
        <span>
          Molido{' '}
          <span className="font-normal text-text2 text-xs">
            — indicá las barquetas para calcular los ingredientes
          </span>
        </span>
      </div>

      {/* Receta base */}
      <div className="bg-surface2 rounded-sm p-3 mb-3">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-text3 mb-[6px]">
          Receta base ({MOLIDO_RECETA.barquetasBase} barquetas)
        </p>
        <div className="space-y-[2px] text-xs">
          {MOLIDO_RECETA.ingredientes.map((ing) => (
            <div key={ing.nombre} className="flex justify-between">
              <span className="text-text">{ing.nombre}</span>
              <span className="font-mono text-text2">{fmtIngrediente(ing.cantidadBase, ing.unidad, ing.nota)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Proteína variable */}
      <div className="mb-3">
        <p className="text-[11px] font-semibold text-text2 mb-[6px]">Proteína variable (según día)</p>
        <div className="grid grid-cols-2 gap-[7px]">
          {MOLIDO_PROTEINA.map((p) => (
            <div key={p.tipo} className="bg-accent-light rounded-sm px-[10px] py-[7px]">
              <span className="text-[11px] text-text2 block">{p.tipo}</span>
              <span className="font-mono text-sm font-medium text-text">{p.kgBruto} kg bruto</span>
            </div>
          ))}
        </div>
      </div>

      {/* Input barquetas + Calcular */}
      <div className="flex gap-2 mb-3">
        <input
          type="number"
          min={1}
          placeholder="Barquetas necesarias"
          value={barquetas}
          onChange={(e) => {
            setBarquetas(e.target.value)
            setResultado(null)
            setGuardado(false)
            setErrorRegistro(null)
          }}
          className="flex-1 px-[10px] py-[7px] text-sm border border-border rounded-sm bg-bg text-text"
        />
        <button
          onClick={handleCalcular}
          disabled={!barquetas || parseInt(barquetas) < 1}
          className="px-3 py-[7px] text-xs font-semibold text-white border-none rounded-sm cursor-pointer flex items-center gap-1 disabled:opacity-50"
          style={{ background: '#1B5E3F' }}
        >
          <IconCalculator size={14} />
          Calcular
        </button>
      </div>

      {/* Resultado */}
      {resultado && (
        <div className="bg-surface border border-border rounded-sm p-3 mb-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-text3 mb-[6px]">
            Resultado para {resultado.barquetas} barquetas
          </p>
          <div className="space-y-[2px] text-xs mb-2">
            {resultado.ingredientes.map((ing) => (
              <div key={ing.nombre} className="flex justify-between items-baseline">
                <span className="text-text">{ing.nombre}</span>
                <span className="font-mono text-sm font-semibold text-accent">
                  {fmtIngrediente(ing.cantidadBase, ing.unidad, ing.nota)}
                </span>
              </div>
            ))}
          </div>
          <div className="text-[11px] text-text3 space-y-[2px]">
            {resultado.observaciones.map((obs, i) => (
              <p key={i} className="italic">{obs}</p>
            ))}
          </div>
        </div>
      )}

      {/* Registrar */}
      {resultado && errorRegistro && (
        <p role="alert" className="mb-2 rounded-lg bg-redLight px-3 py-2 text-xs text-red">{errorRegistro}</p>
      )}

      {resultado && (
        guardado ? (
          <div className="flex items-center justify-center gap-1 text-xs font-semibold text-accent py-[7px]">
            <IconCheck size={14} />
            {resultado.barquetas} barquetas ({resultado.barquetas * 10} raciones) registradas ✓
          </div>
        ) : (
          <button
            onClick={handleRegistrar}
            disabled={guardando}
            className="w-full py-[7px] text-xs font-semibold border border-accent rounded-sm bg-accent-light text-accent cursor-pointer active:scale-[0.98] transition-transform"
          >
            {guardando ? 'Registrando…' : 'Registrar producción'}
          </button>
        )
      )}
    </div>
  )
}
