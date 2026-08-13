import { useState } from 'react'
import { IconCalendar, IconClock, IconSoup } from '@tabler/icons-react'
import ServicioToggle from '../components/calcular/ServicioToggle'
import TablaChinos from '../components/blandas/TablaChinos'
import TablaMolido from '../components/blandas/TablaMolido'
import TablaPure from '../components/blandas/TablaPure'
import CalculadoraPapas from '../components/blandas/CalculadoraPapas'
import { getFechaLocalTenerife } from '../lib/comensales'

export default function Blandas() {
  const today = getFechaLocalTenerife()
  const [fechaProduccion, setFechaProduccion] = useState(today)

  return (
    <>
      {/* Header */}
      <div className="flex items-center gap-[7px] text-sm font-semibold text-text mb-2">
        <IconSoup size={17} className="text-accent" />
        Dietas Blandas
      </div>
      <p className="text-xs text-text2 mb-[10px]">
        Calculá las cantidades y registrá la producción real del día seleccionado.
      </p>

      <div className="bg-surface border border-border rounded-xl p-[14px] mb-[10px] shadow-sm">
        <div className="flex items-center gap-[7px] text-sm font-semibold text-text mb-3">
          <IconClock size={17} className="text-accent" />
          Jornada de producción
        </div>

        <label htmlFor="blandas-fecha-produccion" className="block text-[11px] font-medium text-text2 mb-1">
          Fecha de producción
        </label>
        <div className="relative mb-3">
          <IconCalendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text3 pointer-events-none" />
          <input
            id="blandas-fecha-produccion"
            type="date"
            value={fechaProduccion}
            max={today}
            onChange={(event) => setFechaProduccion(event.target.value)}
            className="w-full pl-9 pr-3 py-[10px] text-sm bg-bg border border-border rounded-lg text-text outline-none focus:border-accent transition-colors"
          />
        </div>
        <p className="text-[11px] text-text3 -mt-2 mb-3">
          Podés registrar la producción de hoy o seleccionar una fecha anterior.
        </p>

        <span className="block text-[11px] font-medium text-text2 mb-1">Servicio</span>
        <ServicioToggle />
        <p className="text-[11px] text-text3 mt-2">
          Chino, Molido y Puré se guardarán como producciones diarias independientes en Historial y Dashboard.
        </p>
      </div>

      {/* Cards */}
      <TablaChinos fechaProduccion={fechaProduccion} />
      <TablaMolido fechaProduccion={fechaProduccion} />
      <TablaPure fechaProduccion={fechaProduccion} />

      {/* Separador */}
      <div className="border-t border-border my-[14px]" />

      {/* Calculadora de pedido semanal */}
      <CalculadoraPapas />
    </>
  )
}
