import { useState } from 'react'
import { IconCarrot, IconCalculator } from '@tabler/icons-react'
import { CHINOS_RECETAS, PURE_RECETAS } from '../../data/blandas'
import PedidoPapaCajas from './PedidoPapaCajas'

// Chinos: 2 bolsas de papa + 2 bolsas de verdura por gastro
const PAPAS_POR_GASTRO = CHINOS_RECETAS[0]!.ingredientes.find((i) => i.nombre === 'Papas congeladas')!.cantidadBase
// Puré: 3 bolsas papa cada 2 barquetas (1.5 por barqueta)
const PURE_RECETA = PURE_RECETAS[0]!
const PAPAS_POR_BARQUETA_PURE = PURE_RECETA.ingredientes[0]!.cantidadBase / PURE_RECETA.barquetasBase

const KG_POR_BOLSA = 2.5

export default function CalculadoraPapas() {
  const [gastrosChino, setGastrosChino] = useState('')
  const [barquetasPure, setBarquetasPure] = useState('')
  const [resultado, setResultado] = useState<{
    bolsasChino: number
    bolsasPure: number
    bolsasTotal: number
    kgTotal: number
  } | null>(null)

  const g = parseInt(gastrosChino) || 0
  const b = parseInt(barquetasPure) || 0

  const handleCalcular = () => {
    const bolsasChino = g * PAPAS_POR_GASTRO
    const bolsasPure = Math.round(b * PAPAS_POR_BARQUETA_PURE * 100) / 100
    const bolsasTotal = bolsasChino + bolsasPure
    const kgTotal = Math.round(bolsasTotal * KG_POR_BOLSA * 100) / 100
    setResultado({ bolsasChino, bolsasPure, bolsasTotal, kgTotal })
  }

  const isDisabled = g < 1 && b < 1

  return (
    <div className="bg-surface border border-accent border-2 rounded-xl p-[14px] shadow-sm">
      <div className="flex items-center gap-[7px] text-sm font-semibold text-text mb-3">
        <IconCarrot size={17} className="text-accent" />
        Calculadora de papas — pedido semanal
      </div>
      <p className="text-[11px] text-text2 mb-3">
        Ingresá las preparaciones de la semana y calculá el total de papas congeladas a solicitar.
      </p>

      {/* Chinos */}
      <div className="bg-surface2 rounded-sm p-3 mb-2">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-semibold text-text">Chinos</span>
          <span className="text-[10px] text-text3">{PAPAS_POR_GASTRO} bolsas por gastro</span>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={0}
            placeholder="Gastros en la semana"
            value={gastrosChino}
            onChange={(e) => { setGastrosChino(e.target.value); setResultado(null) }}
            className="flex-1 px-[10px] py-[7px] text-sm border border-border rounded-sm bg-bg text-text"
          />
          <span className="text-xs text-text2 font-mono shrink-0">
            = {g * PAPAS_POR_GASTRO} bolsas
          </span>
        </div>
      </div>

      {/* Puré */}
      <div className="bg-surface2 rounded-sm p-3 mb-3">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-semibold text-text">Puré de papas</span>
          <span className="text-[10px] text-text3">{PAPAS_POR_BARQUETA_PURE} bolsas por barqueta</span>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={0}
            placeholder="Barquetas en la semana"
            value={barquetasPure}
            onChange={(e) => { setBarquetasPure(e.target.value); setResultado(null) }}
            className="flex-1 px-[10px] py-[7px] text-sm border border-border rounded-sm bg-bg text-text"
          />
          <span className="text-xs text-text2 font-mono shrink-0">
            = {b * PAPAS_POR_BARQUETA_PURE} bolsas
          </span>
        </div>
      </div>

      {/* Calcular */}
      <button
        onClick={handleCalcular}
        disabled={isDisabled}
        className="w-full py-[9px] text-xs font-semibold text-white border-none rounded-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 active:scale-[0.98] transition-transform"
        style={{ background: '#1B5E3F' }}
      >
        <IconCalculator size={14} />
        Calcular pedido semanal
      </button>

      {/* Resultado */}
      {resultado && (
        <div className="mt-3 bg-accent rounded-sm p-3 text-white">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-white/70 mb-[6px]">
            Total papas a solicitar
          </p>

          <div className="flex justify-between items-baseline">
            <span className="text-xs text-white/80">Chinos ({g} gastro{g !== 1 ? 's' : ''})</span>
            <span className="font-mono text-sm font-semibold">{Math.round(resultado.bolsasChino)} bolsas</span>
          </div>
          {resultado.bolsasChino > 0 && (
            <PedidoPapaCajas bolsas={resultado.bolsasChino} className="text-white/70 text-right" />
          )}
          <div className="flex justify-between items-baseline">
            <span className="text-xs text-white/80">Puré ({b} barqueta{b !== 1 ? 's' : ''})</span>
            <span className="font-mono text-sm font-semibold">{resultado.bolsasPure} bolsas</span>
          </div>
          {resultado.bolsasPure > 0 && (
            <PedidoPapaCajas bolsas={resultado.bolsasPure} className="text-white/70 text-right" />
          )}
          <div className="border-t border-white/20 mt-2 pt-2 flex justify-between items-baseline">
            <span className="text-sm font-semibold">Total</span>
            <div className="text-right">
              <span className="font-mono text-lg font-bold">{resultado.bolsasTotal} bolsas</span>
              <span className="font-mono text-xs text-white/70 ml-2">({resultado.kgTotal} kg)</span>
            </div>
          </div>
          <PedidoPapaCajas bolsas={resultado.bolsasTotal} className="text-white/70 text-right mt-1" />
        </div>
      )}
    </div>
  )
}
