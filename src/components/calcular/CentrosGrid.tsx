import { IconUsers } from '@tabler/icons-react'
import { useAppStore } from '../../store/useAppStore'
import { calcularTotalComensales } from '../../lib/comensales'
import { useComensalesDiarios } from '../../hooks/useComensalesDiarios'
import ComensalesToolbar from './ComensalesToolbar'

export default function CentrosGrid() {
  const servicio = useAppStore((s) => s.servicio)
  const fecha = useAppStore((s) => s.fechaTrabajo)
  const centros = useAppStore((s) => s.centros)
  const pacientes = useAppStore((s) => s.pacientes)
  const disponibilidad = useAppStore((s) => s.disponibilidadPorServicio[servicio])
  const definidos = useAppStore((s) => s.definidosPorServicio[servicio])
  const setPaciente = useAppStore((s) => s.setPaciente)
  const { loading, saving, message, error, cargar, guardar, copiarAnterior } = useComensalesDiarios()

  const centrosDisponibles = centros.filter((centro) => disponibilidad[centro.id] !== false)
  const centrosSinServicio = centros.filter((centro) => disponibilidad[centro.id] === false)
  const total = calcularTotalComensales(pacientes, disponibilidad)
  const barColor = servicio === 'almuerzo' ? '#1B5E3F' : '#1E3A5F'
  const servicioLabel = servicio === 'almuerzo' ? 'Almuerzo' : 'Cena'

  return (
    <>
      <ComensalesToolbar
        fecha={fecha}
        loading={loading}
        saving={saving}
        message={message}
        error={error}
        onFechaChange={(nuevaFecha) => nuevaFecha && void cargar(nuevaFecha)}
        onCopy={() => void copiarAnterior()}
        onSave={() => void guardar()}
      />
      <div className="grid grid-cols-2 gap-2 mb-1">
        {centrosDisponibles.map((centro) => (
          <div key={centro.id}>
            <div className="flex items-center gap-1 text-[11px] text-text2 mb-[3px]">
              <span
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ background: centro.color }}
              />
              {centro.nombre}
            </div>
            <input
              type="number"
              min={0}
              value={definidos[centro.id] ? pacientes[centro.id] ?? 0 : ''}
              placeholder="Sin cargar"
              onChange={(e) => setPaciente(
                centro.id,
                e.target.value === '' ? null : parseInt(e.target.value, 10),
              )}
              className="w-full px-[10px] py-[7px] text-[15px] font-mono font-medium text-center border border-border rounded-sm bg-surface text-text"
            />
          </div>
        ))}
      </div>

      {centrosSinServicio.length > 0 && (
        <div className="text-[11px] text-text3 mt-2">
          Sin servicio de {servicio}: {centrosSinServicio.map((centro) => centro.nombre).join(', ')}.
        </div>
      )}

      <div
        className="flex justify-between items-center rounded-sm px-[14px] py-[10px] mt-[6px] text-white"
        style={{ background: barColor }}
      >
        <div>
          <div
            className="text-[10px] font-semibold uppercase tracking-wide"
            style={{ opacity: 0.75 }}
          >
            {servicioLabel}
          </div>
          <div className="text-xs" style={{ opacity: 0.8 }}>
            Total pacientes
          </div>
          <div
            className="text-[28px] font-semibold font-mono leading-none mt-1"
            style={{ fontWeight: 600 }}
          >
            {total}
          </div>
        </div>
        <IconUsers size={28} style={{ opacity: 0.5 }} />
      </div>
    </>
  )
}
