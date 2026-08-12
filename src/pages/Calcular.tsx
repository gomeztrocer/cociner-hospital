import { useEffect } from 'react'
import { IconClock, IconMeat, IconSnowflake, IconPlus } from '@tabler/icons-react'
import { useAppStore } from '../store/useAppStore'
import ServicioToggle from '../components/calcular/ServicioToggle'
import CentrosGrid from '../components/calcular/CentrosGrid'
import ProteinaSection from '../components/calcular/ProteinaSection'
import GuarnicionSection from '../components/calcular/GuarnicionSection'

export default function Calcular() {
  const servicio = useAppStore((s) => s.servicio)
  const pacientes = useAppStore((s) => s.pacientes)
  const tabActivo = useAppStore((s) => s.tabActivo)
  const setTab = useAppStore((s) => s.setTab)
  const proteinas = useAppStore((s) => s.proteinas)
  const guarniciones = useAppStore((s) => s.guarniciones)
  const addProteina = useAppStore((s) => s.addProteina)
  const addGuarnicion = useAppStore((s) => s.addGuarnicion)
  const resetResultados = useAppStore((s) => s.resetResultados)

  const total = Object.values(pacientes).reduce((a, b) => a + b, 0)
  const totalGuarniciones = guarniciones[0]?.pacientesAsignados ?? 0
  const isAlmuerzo = servicio === 'almuerzo'
  const accentColor = isAlmuerzo ? '#1B5E3F' : '#1E3A5F'

  // Reset results when servicio changes
  useEffect(() => {
    resetResultados()
  }, [servicio, resetResultados])

  const tabBaseStyle = 'flex-1 text-xs font-semibold py-[9px] border-b-2 text-center transition-colors cursor-pointer'
  const tabInactiveStyle = 'border-transparent text-text3 hover:text-text hover:border-border'
  const tabActiveStyle = `border-[${accentColor}] text-[${accentColor}]`

  return (
    <>
      {/* Card: Servicio */}
      <div className="bg-surface border border-border rounded-xl p-[14px] mb-[10px] shadow-sm">
        <div className="flex items-center gap-[7px] text-sm font-semibold text-text mb-3">
          <IconClock size={17} className="text-accent" />
          Servicio
        </div>

        <ServicioToggle />

        <div className="mt-3">
          <CentrosGrid />
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-surface border border-border rounded-xl shadow-sm overflow-hidden">
        {/* Tab headers */}
        <div className="flex border-b border-border">
          <button
            className={[tabBaseStyle, tabActivo === 'proteina' ? tabActiveStyle : tabInactiveStyle].join(' ')}
            onClick={() => setTab('proteina')}
          >
            <IconMeat size={13} style={{ verticalAlign: -2 }} /> Proteína
          </button>
          <button
            className={[tabBaseStyle, tabActivo === 'guarnicion' ? tabActiveStyle : tabInactiveStyle].join(' ')}
            onClick={() => setTab('guarnicion')}
          >
            <IconSnowflake size={13} style={{ verticalAlign: -2 }} /> Guarnición
          </button>
        </div>

        {/* Tab content */}
        <div className="p-[14px]">
          {tabActivo === 'proteina' && (
            <>
              <div className="text-[11px] text-text2 mb-3">
                {total} pacientes — {isAlmuerzo ? 'Almuerzo' : 'Cena'}
              </div>

              <div id="lista-proteinas">
                {proteinas.map((p) => (
                  <ProteinaSection key={p.id} preparacionId={p.id} />
                ))}
              </div>

              <button
                onClick={() => addProteina()}
                className="w-full py-[9px] text-xs bg-transparent border border-dashed border-border rounded-sm text-text2 cursor-pointer mt-1 hover:bg-accent-light hover:text-accent hover:border-accent transition-colors"
              >
                <IconPlus size={13} style={{ verticalAlign: -1 }} /> Añadir otra proteína
              </button>
            </>
          )}

          {tabActivo === 'guarnicion' && (
            <>
              <div className="text-[11px] text-text2 mb-3">
                {totalGuarniciones} pacientes — {isAlmuerzo ? 'Almuerzo' : 'Cena'}
              </div>

              <div id="lista-guarniciones">
                {guarniciones.map((g, i) => (
                  <GuarnicionSection key={g.id} preparacionId={g.id} index={i} />
                ))}
              </div>

              {guarniciones.length < 2 && (
                <button
                  onClick={() => addGuarnicion()}
                  className="w-full py-[9px] text-xs bg-transparent border border-dashed border-border rounded-sm text-text2 cursor-pointer mt-1 hover:bg-accent-light hover:text-accent hover:border-accent transition-colors"
                >
                  <IconPlus size={13} style={{ verticalAlign: -1 }} /> Añadir otra guarnición
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </>
  )
}
