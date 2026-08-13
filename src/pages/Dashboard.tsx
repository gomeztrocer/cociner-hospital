import { useEffect, useState, useMemo } from 'react'
import { IconChartBar, IconList, IconAlertCircle, IconChefHat, IconArrowLeft, IconArrowRight } from '@tabler/icons-react'
import { adminUsersRequest } from '../lib/cocinerApi'
import { useAuth } from '../hooks/useAuth'
import { useDashboard } from '../hooks/useDashboard'
import { useProduccionPorDia } from '../hooks/useProduccionPorDia'
import { useProduccionPorSemana } from '../hooks/useProduccionPorSemana'
import { useAppStore } from '../store/useAppStore'
import Spinner from '../components/ui/Spinner'
import BarChartVertical from '../components/dashboard/BarChartVertical'
import { reportAppError } from '../store/useErrorTraceStore'

const CATEGORIAS = [
  { key: '', label: 'Todas' },
  { key: 'proteina', label: 'Proteínas' },
  { key: 'guarnicion', label: 'Guarniciones' },
  { key: 'blandas', label: 'Blandas' },
  { key: 'receta', label: 'Recetas' },
] as const

const DAY_LABELS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']

interface ChefOption {
  id: string
  nombre_completo: string
  rol: string
}

function getWeekRange(offset: number): { desde: string; hasta: string; dates: Date[] } {
  const now = new Date()
  const day = now.getDay()
  const monOffset = day === 0 ? -6 : 1 - day
  const monday = new Date(now)
  monday.setDate(now.getDate() + monOffset + offset * 7)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)

  const dates: Date[] = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    dates.push(d)
  }

  const fmt = (d: Date) => {
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
  }

  return { desde: fmt(monday), hasta: fmt(sunday), dates }
}

function getTodayIndex(): number {
  const day = new Date().getDay()
  return day === 0 ? 6 : day - 1
}

function getCurrentMonthOffset(offset: number): string {
  const now = new Date()
  now.setMonth(now.getMonth() + offset)
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  return `${y}-${m}`
}

function getMonthLabel(offset: number): string {
  const now = new Date()
  now.setMonth(now.getMonth() + offset)
  return `${MONTHS[now.getMonth()]} ${now.getFullYear()}`
}

function getCurrentWeekNumber(): number {
  const now = new Date()
  const start = new Date(now.getFullYear(), 0, 1)
  const diff = now.getTime() - start.getTime()
  return Math.ceil(((diff / 86400000) + start.getDay() + 1) / 7)
}

export default function Dashboard() {
  const { user } = useAuth()
  const currentUser = useAppStore((s) => s.user)
  const puedeFiltrar = currentUser?.rol === 'admin' || currentUser?.rol === 'chef_ejecutivo'

  const [chefs, setChefs] = useState<ChefOption[]>([])
  const [selectedChefId, setSelectedChefId] = useState<string | undefined>(
    puedeFiltrar ? undefined : user?.id,
  )
  const [selectedCategoria, setSelectedCategoria] = useState('')
  const [semanaOffset, setSemanaOffset] = useState(0)
  const [mesOffset, setMesOffset] = useState(0)

  const categoriaParam = selectedCategoria || undefined
  const usuarioId = puedeFiltrar ? selectedChefId : user?.id

  const currentMonth = useMemo(() => getCurrentMonthOffset(mesOffset), [mesOffset])
  const { data, loading, error } = useDashboard(usuarioId, currentMonth, categoriaParam)

  const weekRange = useMemo(() => getWeekRange(semanaOffset), [semanaOffset])
  const currentWeekNum = getCurrentWeekNumber()

  const todayIndex = semanaOffset === 0 ? getTodayIndex() : -1

  const { data: diaData, loading: diaLoading } = useProduccionPorDia(
    usuarioId,
    weekRange.desde,
    weekRange.hasta,
    categoriaParam,
  )

  const { data: semData, loading: semLoading } = useProduccionPorSemana(
    usuarioId,
    currentMonth,
    categoriaParam,
  )

  const weeklyBars = useMemo(() => {
    const map = new Map(diaData.map((d) => [d.fecha, d.total_barquetas]))
    return weekRange.dates.map((d) => {
      const y = d.getFullYear()
      const m = String(d.getMonth() + 1).padStart(2, '0')
      const day = String(d.getDate()).padStart(2, '0')
      const key = `${y}-${m}-${day}`
      return map.get(key) ?? 0
    })
  }, [diaData, weekRange])

  const weeklyMax = Math.max(...weeklyBars, 1)

  const weeklySubLabels = useMemo(() =>
    weekRange.dates.map((d) => `${d.getDate()} ${MONTHS[d.getMonth()].slice(0, 3)}`),
  [weekRange])

  const monthlyBars = useMemo(() => {
    const map = new Map(semData.map((s) => [s.semana, s.total_barquetas]))
    const weeks: number[] = []
    for (let i = 0; i < 5; i++) {
      const w = currentWeekNum + i
      weeks.push(map.get(w) ?? 0)
    }
    return weeks
  }, [semData, currentWeekNum])

  const monthlyMax = Math.max(...monthlyBars, 1)
  const monthlyLabels = useMemo(() => ['S1', 'S2', 'S3', 'S4', 'S5'], [])

  const monthHighlight = useMemo(() => {
    if (mesOffset !== 0) return -1
    const firstWeek = currentWeekNum
    return monthlyBars.findIndex((_, i) => firstWeek + i === currentWeekNum)
  }, [mesOffset, currentWeekNum, monthlyBars])

  useEffect(() => {
    if (!puedeFiltrar) return

    const token = currentUser?.token
    if (!token) return

    adminUsersRequest<{ usuarios: ChefOption[] }>(token, { action: 'list' })
      .then(({ usuarios }) => setChefs(usuarios))
      .catch((error: unknown) => reportAppError({ fase: 'Dashboard', accion: 'Consultar chefs', error }))
  }, [puedeFiltrar, currentUser?.token])

  const weekTitle = useMemo(() => {
    const f = (d: Date) => `${d.getDate()} ${MONTHS[d.getMonth()].slice(0, 3)}`
    return `Semana — ${f(weekRange.dates[0])} – ${f(weekRange.dates[6])}`
  }, [weekRange])

  const monthTitle = useMemo(() => `Mes — ${getMonthLabel(mesOffset)}`, [mesOffset])

  const renderChefFilter = () => {
    if (!puedeFiltrar) return null
    return (
      <div className="flex items-center gap-2 mb-3">
        <IconChefHat size={18} className="text-text3 shrink-0" />
        <select
          value={selectedChefId ?? ''}
          onChange={(e) => setSelectedChefId(e.target.value || undefined)}
          className="flex-1 px-3 py-[10px] text-sm border border-border rounded-sm bg-surface text-text focus:outline-none focus:border-accent transition-colors"
        >
          <option value="">Todos los chefs</option>
          {chefs.map((chef) => (
            <option key={chef.id} value={chef.id}>
              {chef.nombre_completo}
            </option>
          ))}
        </select>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner size="lg" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center py-20 text-text3 text-xs">
        <IconAlertCircle size={32} className="mb-2 opacity-50" />
        {error}
      </div>
    )
  }

  const hasData = data && data.total_elaboraciones > 0

  return (
    <>
      {renderChefFilter()}

      {/* Category filter chips */}
      <div className="flex flex-wrap gap-[5px] mb-3">
        {CATEGORIAS.map((cat) => (
          <button
            key={cat.key}
            onClick={() => setSelectedCategoria(cat.key)}
            className={`px-[10px] py-[5px] text-xs border rounded-[20px] cursor-pointer transition-all ${
              selectedCategoria === cat.key
                ? 'bg-accent text-white border-accent'
                : 'bg-surface text-text2 border-border hover:bg-accent-light'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Metric cards (barquetas) */}
      <div className="grid grid-cols-2 gap-[10px] mb-[10px]">
        {hasData && data ? (
          <>
            <MetricCard label="Barquetas este mes" value={data.total_barquetas} color="#1B5E3F" bg="#E8F3ED" />
            <MetricCard label="Media barquetas/día" value={data.media_barquetas_diaria} color="#B45309" bg="#FEF3C7" />
            <MetricCard label="Elaboraciones" value={data.total_elaboraciones} color="#1E3A5F" bg="#EFF6FF" />
            <MetricCard label="Barquetas hoy" value={data.barquetas_hoy} color="#059669" bg="#ECFDF5" />
          </>
        ) : (
          <>
            <MetricCard label="Barquetas este mes" value={0} color="#1B5E3F" bg="#E8F3ED" />
            <MetricCard label="Media barquetas/día" value={0} color="#B45309" bg="#FEF3C7" />
            <MetricCard label="Elaboraciones" value={0} color="#1E3A5F" bg="#EFF6FF" />
            <MetricCard label="Barquetas hoy" value={0} color="#059669" bg="#ECFDF5" />
          </>
        )}
      </div>

      {/* Weekly production chart */}
      <div className="bg-surface border border-border rounded-xl p-[14px] mb-[10px] shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => setSemanaOffset((p) => p - 1)}
            className="p-1 border border-border rounded-sm bg-surface text-text2 hover:bg-surface2 cursor-pointer shrink-0 leading-none"
            aria-label="Semana anterior"
          >
            <IconArrowLeft size={16} />
          </button>
          <span className="flex-1 text-sm font-semibold text-text text-center px-2 leading-tight">
            {weekTitle}
          </span>
          <button
            onClick={() => setSemanaOffset((p) => p + 1)}
            className="p-1 border border-border rounded-sm bg-surface text-text2 hover:bg-surface2 cursor-pointer shrink-0 leading-none"
            aria-label="Semana siguiente"
          >
            <IconArrowRight size={16} />
          </button>
        </div>
        <BarChartVertical
          data={weeklyBars}
          maxValue={weeklyMax}
          highlightIndex={todayIndex}
          labels={DAY_LABELS}
          subLabels={weeklySubLabels}
          unit="barq."
          loading={diaLoading}
        />
      </div>

      {/* Monthly production chart */}
      <div className="bg-surface border border-border rounded-xl p-[14px] mb-[10px] shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => setMesOffset((p) => p - 1)}
            className="p-1 border border-border rounded-sm bg-surface text-text2 hover:bg-surface2 cursor-pointer shrink-0 leading-none"
            aria-label="Mes anterior"
          >
            <IconArrowLeft size={16} />
          </button>
          <span className="flex-1 text-sm font-semibold text-text text-center px-2 leading-tight">
            {monthTitle}
          </span>
          <button
            onClick={() => setMesOffset((p) => p + 1)}
            className="p-1 border border-border rounded-sm bg-surface text-text2 hover:bg-surface2 cursor-pointer shrink-0 leading-none"
            aria-label="Mes siguiente"
          >
            <IconArrowRight size={16} />
          </button>
        </div>
        <BarChartVertical
          data={monthlyBars}
          maxValue={monthlyMax}
          highlightIndex={monthHighlight}
          labels={monthlyLabels}
          unit="barq."
          loading={semLoading}
        />
      </div>

      {/* Top platos */}
      <div className="bg-surface border border-border rounded-xl p-[14px] mb-[10px] shadow-sm">
        <div className="flex items-center gap-[7px] text-sm font-semibold text-text mb-3">
          <IconChartBar size={17} className="text-accent" />
          Platos más elaborados
        </div>

        {!hasData || (data && data.top_platos.length === 0) ? (
          <div className="flex flex-col items-center py-6 text-text3 text-xs">
            <IconChartBar size={24} className="mb-2 opacity-50" />
            Sin datos este mes
          </div>
        ) : (
          <div className="space-y-3">
            {data && (() => {
              const maxBarquetas = data.top_platos.length > 0 ? data.top_platos[0].barquetas : 1
              return data.top_platos.map((p) => {
                const pct = Math.round((p.barquetas / maxBarquetas) * 100)
                return (
                  <div key={p.plato}>
                    <div className="flex items-center justify-between text-[12px] mb-1">
                      <span className="text-text font-medium">{p.plato}</span>
                      <span className="text-text2">{p.barquetas} barq.</span>
                    </div>
                    <div className="h-[6px] bg-bg rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: '#1B5E3F' }} />
                    </div>
                  </div>
                )
              })
            })()}
          </div>
        )}
      </div>

      {/* Últimos registros */}
      <div className="bg-surface border border-border rounded-xl p-[14px] mb-[10px] shadow-sm">
        <div className="flex items-center gap-[7px] text-sm font-semibold text-text mb-3">
          <IconList size={17} className="text-accent" />
          Últimos registros
        </div>

        {!hasData || (data && data.ultimos_registros.length === 0) ? (
          <div className="flex flex-col items-center py-6 text-text3 text-xs">
            <IconList size={24} className="mb-2 opacity-50" />
            Sin registros aún
          </div>
        ) : (
          <div className="space-y-2">
            {data && data.ultimos_registros.map((r) => (
              <div key={r.id} className="border border-border rounded-lg px-3 py-[10px]">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-text">{r.plato}</span>
                  <span className="text-[11px] font-mono text-text3">{r.fecha}</span>
                </div>
                <div className="text-[12px] text-text2">
                  <span className="font-medium text-text">{r.barquetas} barq.</span>
                  <span className="text-text3"> ({r.raciones} raciones)</span>
                  {' · '}{r.servicio}
                  {r.chef ? ` · ${r.chef}` : ''}
                  {r.categoria ? ` · ${r.categoria}` : ''}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  )
}

interface MetricCardProps {
  label: string
  value: number
  color: string
  bg: string
}

function MetricCard({ label, value, color, bg }: MetricCardProps) {
  return (
    <div className="rounded-xl p-[14px] shadow-sm border" style={{ background: bg, borderColor: color }}>
      <p className="text-[26px] font-bold leading-none mb-1" style={{ color }}>
        {value.toLocaleString('es-ES')}
      </p>
      <p className="text-[11px] font-medium text-text2">{label}</p>
    </div>
  )
}
