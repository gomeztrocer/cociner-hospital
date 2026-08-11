import { useState } from 'react'
import { IconCarrot, IconCalculator, IconCheck } from '@tabler/icons-react'
import { useAppStore } from '../../store/useAppStore'
import { useHistorial } from '../../hooks/useHistorial'
import {
  PURE_RECETAS,
  escalarReceta,
  type ResultadoBlando,
} from '../../data/blandas'
import PedidoPapaCajas from './PedidoPapaCajas'

const PURE_RECETA = PURE_RECETAS[0]!

export default function TablaPure() {
  const user = useAppStore((s) => s.user)
  const servicio = useAppStore((s) => s.servicio)
  const { addRegistro } = useHistorial(user?.id)

  const [barquetas, setBarquetas] = useState(String(PURE_RECETA.barquetasBase))
  const [resultado, setResultado] = useState<ResultadoBlando | null>(null)
  const [guardado, setGuardado] = useState(false)

  const handleCalcular = () => {
    const b = parseInt(barquetas) || 0
    if (b < 1) return
    setResultado(escalarReceta(PURE_RECETA, b))
    setGuardado(false)
  }

  const handleRegistrar = async () => {
    const b = parseInt(barquetas) || 0
    if (b < 1) return
    const r = await addRegistro({
      plato: 'Blandas - Puré',
      servicio: servicio === 'almuerzo' ? 'Almuerzo' : 'Cena',
      raciones: b * 10,
      categoria: 'blandas',
    })
    if (!r.error) setGuardado(true)
  }

  const fmtKg = (g: number) => g >= 1000 ? `${(g / 1000).toFixed(1)} kg` : `${g} g`

  return (
    <div className="bg-surface border border-border rounded-xl p-[14px] mb-[10px] shadow-sm">
      <div className="flex items-center gap-[7px] text-sm font-semibold text-text mb-3">
        <IconCarrot size={17} className="text-accent" />
        <span>
          Puré de papas{' '}
          <span className="font-normal text-text2 text-xs">
            — indicá las barquetas para calcular los ingredientes
          </span>
        </span>
      </div>

      {/* Receta base */}
      <div className="bg-surface2 rounded-sm p-3 mb-3">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-text3 mb-[6px]">
          Receta base ({PURE_RECETA.barquetasBase} barquetas)
        </p>
        <div className="space-y-[2px] text-xs">
          {PURE_RECETA.ingredientes.map((ing) => (
            <div key={ing.nombre} className="flex justify-between">
              <span className="text-text">{ing.nombre}</span>
              <span className="font-mono text-text2">{ing.cantidadBase} {ing.unidad} ({ing.nota})</span>
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
          onChange={(e) => { setBarquetas(e.target.value); setGuardado(false) }}
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
              <div key={ing.nombre}>
                <div className="flex justify-between items-baseline">
                  <span className="text-text">{ing.nombre}</span>
                  <span className="font-mono text-sm font-semibold text-accent">
                    {ing.cantidadBase} {ing.unidad} ({ing.nota})
                  </span>
                </div>
                {ing.nombre === 'Papas congeladas' && (
                  <PedidoPapaCajas bolsas={ing.cantidadBase} className="text-text3 text-right" />
                )}
              </div>
            ))}
          </div>
          <div className="text-[11px] text-text3 space-y-[2px]">
            <p className="font-mono"><span className="italic">Peso bruto: {fmtKg(resultado.totalKg * 1000)}</span></p>
            {resultado.observaciones.map((obs, i) => (
              <p key={i} className="italic">{obs}</p>
            ))}
          </div>
        </div>
      )}

      {/* Registrar */}
      {resultado && (
        guardado ? (
          <div className="flex items-center justify-center gap-1 text-xs font-semibold text-accent py-[7px]">
            <IconCheck size={14} />
            {resultado.barquetas} barquetas ({resultado.barquetas * 10} raciones) registradas ✓
          </div>
        ) : (
          <button
            onClick={handleRegistrar}
            className="w-full py-[7px] text-xs font-semibold border border-accent rounded-sm bg-accent-light text-accent cursor-pointer active:scale-[0.98] transition-transform"
          >
            Registrar producción
          </button>
        )
      )}
    </div>
  )
}
