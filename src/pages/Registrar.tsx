import { useState } from 'react'
import {
  IconAlertCircle,
  IconCalendar,
  IconCheck,
  IconClipboardList,
  IconClock,
  IconEdit,
  IconPlus,
  IconTrash,
  IconX,
} from '@tabler/icons-react'
import { useAuth } from '../hooks/useAuth'
import { type Registro, useHistorial } from '../hooks/useHistorial'
import { getFechaLocalTenerife } from '../lib/comensales'
import Spinner from '../components/ui/Spinner'

interface EditDraft {
  id: string
  plato: string
  raciones: string
  servicio: string
  fecha: string
  notas: string
}

export default function Registrar() {
  const { user } = useAuth()
  const today = getFechaLocalTenerife()
  const isAdmin = user?.rol === 'admin'

  const [fecha, setFecha] = useState(today)
  const { registros, loading, error, addRegistro, updateRegistro, deleteRegistro } = useHistorial(
    user?.id,
    fecha,
    isAdmin,
  )

  const [plato, setPlato] = useState('')
  const [raciones, setRaciones] = useState('414')
  const [servicio, setServicio] = useState('Almuerzo')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [editDraft, setEditDraft] = useState<EditDraft | null>(null)
  const [deleting, setDeleting] = useState<Registro | null>(null)
  const [adminSaving, setAdminSaving] = useState(false)
  const [adminError, setAdminError] = useState<string | null>(null)

  const isAlmuerzo = servicio === 'Almuerzo'
  const accentColor = isAlmuerzo ? '#1B5E3F' : '#1E3A5F'

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setSaveError(null)
    setSuccess(false)

    const racionesNum = Number.parseInt(raciones, 10)
    setSaving(true)
    const result = await addRegistro({
      plato: plato.trim(),
      servicio,
      raciones: racionesNum,
      fecha,
    })
    setSaving(false)

    if (result.error) {
      setSaveError(result.error)
      return
    }

    setPlato('')
    setRaciones('414')
    setServicio('Almuerzo')
    setSuccess(true)
    window.setTimeout(() => setSuccess(false), 3000)
  }

  const startEdit = (registro: Registro) => {
    setAdminError(null)
    setEditDraft({
      id: registro.id,
      plato: registro.plato,
      raciones: String(registro.raciones),
      servicio: registro.servicio,
      fecha: registro.fecha,
      notas: registro.notas ?? '',
    })
  }

  const handleEdit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!editDraft) return

    setAdminError(null)
    setAdminSaving(true)
    const result = await updateRegistro({
      id: editDraft.id,
      plato: editDraft.plato,
      servicio: editDraft.servicio,
      raciones: Number.parseInt(editDraft.raciones, 10),
      fecha: editDraft.fecha,
      notas: editDraft.notas,
    })
    setAdminSaving(false)

    if (result.error) {
      setAdminError(result.error)
      return
    }
    setEditDraft(null)
  }

  const handleDelete = async () => {
    if (!deleting) return

    setAdminError(null)
    setAdminSaving(true)
    const result = await deleteRegistro(deleting.id)
    setAdminSaving(false)

    if (result.error) {
      setAdminError(result.error)
      return
    }
    setDeleting(null)
  }

  return (
    <>
      <div className="bg-surface border border-border rounded-xl p-[14px] mb-[10px] shadow-sm">
        <div className="flex items-center gap-[7px] text-sm font-semibold text-text mb-3">
          <IconPlus size={17} className="text-accent" />
          Guardar producción
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label htmlFor="registro-fecha" className="block text-[11px] font-medium text-text2 mb-1">
              Fecha de producción
            </label>
            <div className="relative">
              <IconCalendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text3 pointer-events-none" />
              <input
                id="registro-fecha"
                type="date"
                value={fecha}
                max={today}
                onChange={(event) => {
                  setFecha(event.target.value)
                  setSaveError(null)
                  setSuccess(false)
                }}
                className="w-full pl-9 pr-3 py-[10px] text-sm bg-bg border border-border rounded-lg text-text outline-none focus:border-accent transition-colors"
              />
            </div>
            <p className="text-[11px] text-text3 mt-1">
              Podés registrar hoy o seleccionar una fecha anterior.
            </p>
          </div>

          <div className="mb-3">
            <label htmlFor="registro-plato" className="block text-[11px] font-medium text-text2 mb-1">
              Plato elaborado
            </label>
            <input
              id="registro-plato"
              type="text"
              value={plato}
              onChange={(event) => setPlato(event.target.value)}
              placeholder="Ej: Muslo de pollo con arroz"
              className="w-full px-3 py-[10px] text-sm bg-bg border border-border rounded-lg text-text placeholder:text-text3 outline-none focus:border-accent transition-colors"
            />
          </div>

          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label htmlFor="registro-raciones" className="block text-[11px] font-medium text-text2 mb-1">
                Raciones totales
              </label>
              <input
                id="registro-raciones"
                type="number"
                value={raciones}
                onChange={(event) => setRaciones(event.target.value)}
                min="1"
                inputMode="numeric"
                className="w-full px-3 py-[10px] text-sm bg-bg border border-border rounded-lg text-text placeholder:text-text3 outline-none focus:border-accent transition-colors"
              />
            </div>
            <div>
              <label htmlFor="registro-servicio" className="block text-[11px] font-medium text-text2 mb-1">
                Servicio
              </label>
              <select
                id="registro-servicio"
                value={servicio}
                onChange={(event) => setServicio(event.target.value)}
                className="w-full px-3 py-[10px] text-sm bg-bg border border-border rounded-lg text-text outline-none focus:border-accent transition-colors"
              >
                <option>Almuerzo</option>
                <option>Cena</option>
              </select>
            </div>
          </div>

          {saveError && <InlineMessage error>{saveError}</InlineMessage>}
          {success && (
            <div className="flex items-center gap-2 text-xs text-white px-3 py-2 rounded-lg mb-3" style={{ background: accentColor }}>
              <IconCheck size={14} />
              Registro guardado correctamente
            </div>
          )}

          <button
            type="submit"
            disabled={saving}
            className="w-full py-[10px] text-sm font-semibold text-white border-none rounded-xl flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98] transition-transform disabled:opacity-60 disabled:cursor-not-allowed"
            style={{ background: accentColor }}
          >
            {saving ? <><Spinner size="sm" /><span>Guardando…</span></> : <><IconCheck size={16} /><span>Guardar en historial</span></>}
          </button>
        </form>
      </div>

      <div className="bg-surface border border-border rounded-xl p-[14px] mb-[10px] shadow-sm">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <div className="flex items-center gap-[7px] text-sm font-semibold text-text">
              <IconClock size={17} className="text-accent" />
              Producción del {formatFecha(fecha)}
            </div>
            {isAdmin && <p className="text-[11px] text-text3 mt-1 ml-6">Todos los usuarios · edición administrativa</p>}
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-7"><Spinner size="md" /></div>
        ) : error ? (
          <div className="flex flex-col items-center py-7 text-text3 text-xs">
            <IconAlertCircle size={24} className="mb-2 opacity-50" />
            {error}
          </div>
        ) : registros.length === 0 ? (
          <div className="flex flex-col items-center py-7 text-text3 text-xs">
            <IconClipboardList size={24} className="mb-2 opacity-50" />
            Sin registros para esta fecha
          </div>
        ) : (
          <div className="space-y-2">
            {registros.map((registro) => (
              <div key={registro.id} className="border border-border rounded-lg px-3 py-[10px]">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-text break-words">{registro.plato}</p>
                    <p className="text-[12px] text-text2 mt-1">
                      {registro.raciones} raciones · {registro.servicio}
                      {registro.categoria ? ` · ${registro.categoria}` : ''}
                    </p>
                    <p className="text-[11px] text-text3 mt-1">
                      {isAdmin && `${registro.usuario_nombre} · `}{formatHora(registro.created_at)}
                      {registro.updated_at ? ' · editado' : ''}
                    </p>
                  </div>

                  {isAdmin && (
                    <div className="flex gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => startEdit(registro)}
                        className="p-2 rounded-lg text-text2 hover:bg-surface2 cursor-pointer"
                        aria-label={`Editar ${registro.plato}`}
                      >
                        <IconEdit size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setAdminError(null)
                          setDeleting(registro)
                        }}
                        className="p-2 rounded-lg text-red hover:bg-redLight cursor-pointer"
                        aria-label={`Eliminar ${registro.plato}`}
                      >
                        <IconTrash size={16} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {editDraft && (
        <Modal title="Editar registro" onClose={() => !adminSaving && setEditDraft(null)}>
          <form onSubmit={handleEdit}>
            <label htmlFor="edit-plato" className="block text-[11px] font-medium text-text2 mb-1">Plato elaborado</label>
            <input
              id="edit-plato"
              value={editDraft.plato}
              onChange={(event) => setEditDraft({ ...editDraft, plato: event.target.value })}
              className="w-full px-3 py-[10px] text-sm bg-bg border border-border rounded-lg text-text outline-none focus:border-accent mb-3"
            />

            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label htmlFor="edit-raciones" className="block text-[11px] font-medium text-text2 mb-1">Raciones</label>
                <input
                  id="edit-raciones"
                  type="number"
                  min="1"
                  value={editDraft.raciones}
                  onChange={(event) => setEditDraft({ ...editDraft, raciones: event.target.value })}
                  className="w-full px-3 py-[10px] text-sm bg-bg border border-border rounded-lg text-text outline-none focus:border-accent"
                />
              </div>
              <div>
                <label htmlFor="edit-servicio" className="block text-[11px] font-medium text-text2 mb-1">Servicio</label>
                <select
                  id="edit-servicio"
                  value={editDraft.servicio}
                  onChange={(event) => setEditDraft({ ...editDraft, servicio: event.target.value })}
                  className="w-full px-3 py-[10px] text-sm bg-bg border border-border rounded-lg text-text outline-none focus:border-accent"
                >
                  <option>Almuerzo</option>
                  <option>Cena</option>
                </select>
              </div>
            </div>

            <label htmlFor="edit-fecha" className="block text-[11px] font-medium text-text2 mb-1">Fecha de producción</label>
            <input
              id="edit-fecha"
              type="date"
              max={today}
              value={editDraft.fecha}
              onChange={(event) => setEditDraft({ ...editDraft, fecha: event.target.value })}
              className="w-full px-3 py-[10px] text-sm bg-bg border border-border rounded-lg text-text outline-none focus:border-accent mb-3"
            />

            {adminError && <InlineMessage error>{adminError}</InlineMessage>}
            <div className="grid grid-cols-2 gap-2">
              <button type="button" disabled={adminSaving} onClick={() => setEditDraft(null)} className="py-[10px] text-sm font-semibold border border-border rounded-xl text-text2 bg-surface cursor-pointer disabled:opacity-60">Cancelar</button>
              <button type="submit" disabled={adminSaving} className="py-[10px] text-sm font-semibold border-none rounded-xl text-white bg-accent cursor-pointer disabled:opacity-60">
                {adminSaving ? 'Guardando…' : 'Guardar cambios'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {deleting && (
        <Modal title="Eliminar registro" onClose={() => !adminSaving && setDeleting(null)}>
          <p className="text-sm text-text mb-2">
            ¿Confirmás que querés retirar <strong>{deleting.plato}</strong> del historial?
          </p>
          <p className="text-xs text-text2 mb-4">
            Dejará de aparecer y de sumar en el Dashboard. Se conservará internamente para auditoría.
          </p>
          {adminError && <InlineMessage error>{adminError}</InlineMessage>}
          <div className="grid grid-cols-2 gap-2">
            <button type="button" disabled={adminSaving} onClick={() => setDeleting(null)} className="py-[10px] text-sm font-semibold border border-border rounded-xl text-text2 bg-surface cursor-pointer disabled:opacity-60">Cancelar</button>
            <button type="button" disabled={adminSaving} onClick={handleDelete} className="py-[10px] text-sm font-semibold border-none rounded-xl text-white bg-red cursor-pointer disabled:opacity-60">
              {adminSaving ? 'Eliminando…' : 'Confirmar eliminación'}
            </button>
          </div>
        </Modal>
      )}
    </>
  )
}

function InlineMessage({ children }: { children: React.ReactNode; error?: boolean }) {
  return (
    <div className="flex items-center gap-2 text-xs text-red bg-redLight px-3 py-2 rounded-lg mb-3">
      <IconAlertCircle size={14} />
      {children}
    </div>
  )
}

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-3" role="dialog" aria-modal="true" aria-label={title}>
      <div className="w-full max-w-md bg-surface border border-border rounded-xl p-4 shadow-xl">
        <div className="flex items-center justify-between gap-3 mb-4">
          <h2 className="text-base font-semibold text-text">{title}</h2>
          <button type="button" onClick={onClose} className="p-1 rounded-lg text-text3 hover:bg-surface2 cursor-pointer" aria-label="Cerrar">
            <IconX size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

function formatHora(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
  } catch {
    return ''
  }
}

function formatFecha(fecha: string): string {
  const [year, month, day] = fecha.split('-').map(Number)
  if (!year || !month || !day) return fecha
  return new Date(year, month - 1, day, 12).toLocaleDateString('es-ES')
}
