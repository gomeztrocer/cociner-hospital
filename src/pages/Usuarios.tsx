import { useState, type FormEvent } from 'react'
import { IconUsers, IconPlus, IconAlertCircle, IconCheck, IconLock, IconRefresh } from '@tabler/icons-react'
import { useUsuarios, type CrearUsuarioInput } from '../hooks/useUsuarios'
import { CENTROS } from '../data/centros'
import Spinner from '../components/ui/Spinner'

const ROLES = [
  { value: 'cocinero', label: 'Cocinero' },
  { value: 'chef_ejecutivo', label: 'Chef Ejecutivo' },
  { value: 'admin', label: 'Admin' },
]

export default function Usuarios() {
  const { usuarios, loading, error, crearUsuario, toggleUsuario, cambiarPinAdmin, refresh } = useUsuarios()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<CrearUsuarioInput>({ nombre: '', username: '', pin: '', rol: 'cocinero' })
  const [formError, setFormError] = useState<string | null>(null)
  const [formLoading, setFormLoading] = useState(false)
  const [formSuccess, setFormSuccess] = useState(false)
  const [pinChangeUserId, setPinChangeUserId] = useState<string | null>(null)
  const [pinChangeValue, setPinChangeValue] = useState('')
  const [pinChangeError, setPinChangeError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const resetForm = () => {
    setForm({ nombre: '', username: '', pin: '', rol: 'cocinero' })
    setFormError(null)
    setFormSuccess(false)
  }

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault()
    setFormError(null)
    setFormSuccess(false)
    setFormLoading(true)
    const result = await crearUsuario(form)
    setFormLoading(false)

    if (result.error) {
      setFormError(result.error)
      return
    }

    setFormSuccess(true)
    setTimeout(() => { setShowForm(false); resetForm() }, 1500)
  }

  const handleToggle = async (id: string) => {
    setActionError(null)
    const result = await toggleUsuario(id)
    if (result.error) setActionError(result.error)
  }

  const handlePinChange = async (usuarioId: string) => {
    setPinChangeError(null)
    const result = await cambiarPinAdmin(usuarioId, pinChangeValue)
    if (result.error) {
      setPinChangeError(result.error)
      return
    }
    setPinChangeUserId(null)
    setPinChangeValue('')
  }

  if (loading) {
    return <div className="flex justify-center py-20"><Spinner size="lg" /></div>
  }

  if (error) {
    return (
      <div className="flex flex-col items-center py-20 text-text3 text-xs">
        <IconAlertCircle size={32} className="mb-2 opacity-50" />
        {error}
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <IconUsers size={20} className="text-accent" />
          <h1 className="text-base font-semibold text-text">Usuarios</h1>
        </div>
        <div className="flex gap-2">
          <button onClick={refresh} className="flex items-center justify-center w-[36px] h-[36px] border border-border rounded-sm hover:bg-surface2 transition-colors" title="Recargar">
            <IconRefresh size={18} className="text-text2" />
          </button>
          <button
            onClick={() => { setShowForm(!showForm); if (!showForm) resetForm() }}
            className="flex items-center gap-1.5 h-[36px] px-3 bg-accent text-white text-xs font-semibold rounded-sm hover:opacity-90 transition-opacity"
          >
            <IconPlus size={16} />
            Nuevo
          </button>
        </div>
      </div>

      {actionError && <div role="alert" className="mb-3 rounded-sm bg-redLight p-2 text-xs text-red">{actionError}</div>}

      {showForm && (
        <form onSubmit={handleCreate} className="bg-surface border border-border rounded-xl p-[14px] mb-4 shadow-sm space-y-3">
          <h2 className="text-sm font-semibold text-text">Nuevo usuario</h2>
          <InputField label="Nombre completo" value={form.nombre} onChange={(v) => setForm({ ...form, nombre: v })} placeholder="Carlos Pérez" />
          <InputField label="Username" value={form.username} onChange={(v) => setForm({ ...form, username: v })} placeholder="carlos" />
          <div>
            <label className="block text-xs text-text2 mb-1">PIN inicial</label>
            <input type="password" inputMode="numeric" maxLength={4} pattern="[0-9]{4}" placeholder="4 dígitos"
              value={form.pin} onChange={(e) => setForm({ ...form, pin: e.target.value.replace(/\D/g, '').slice(0, 4) })}
              className="w-full px-3 py-[10px] text-sm border border-border rounded-sm bg-surface text-text placeholder:text-text3 focus:outline-none focus:border-accent transition-colors" />
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-xs text-text2 mb-1">Rol</label>
              <select value={form.rol} onChange={(e) => setForm({ ...form, rol: e.target.value })}
                className="w-full px-3 py-[10px] text-sm border border-border rounded-sm bg-surface text-text focus:outline-none focus:border-accent">
                {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
            <div className="flex-1">
              <label className="block text-xs text-text2 mb-1">Centro</label>
              <select value={form.centro_id ?? ''} onChange={(e) => setForm({ ...form, centro_id: e.target.value || undefined })}
                className="w-full px-3 py-[10px] text-sm border border-border rounded-sm bg-surface text-text focus:outline-none focus:border-accent">
                <option value="">Sin centro</option>
                {CENTROS.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
            </div>
          </div>
          {formError && <p className="text-xs text-red flex items-center gap-1"><IconAlertCircle size={12} />{formError}</p>}
          {formSuccess && <p className="text-xs text-accent flex items-center gap-1"><IconCheck size={12} />Usuario creado</p>}
          <button type="submit" disabled={formLoading || !form.nombre || !form.username || form.pin.length !== 4}
            className="w-full h-11 bg-accent text-white text-sm font-semibold rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50">
            {formLoading ? 'Guardando...' : 'Guardar'}
          </button>
        </form>
      )}

      <div className="space-y-2">
        {usuarios.length === 0 && (
          <div className="flex flex-col items-center py-10 text-text3 text-xs">
            <IconUsers size={28} className="mb-2 opacity-50" />
            No hay usuarios registrados
          </div>
        )}
        {usuarios.map((u) => (
          <div key={u.id} className="bg-surface border border-border rounded-xl p-[14px] shadow-sm">
            <div className="flex items-start justify-between mb-2">
              <div>
                <p className="text-sm font-medium text-text">{u.nombre_completo}</p>
                <p className="text-[11px] font-mono text-text3">@{u.username}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${u.activo ? 'bg-accentLight text-accent' : 'bg-redLight text-red'}`}>
                  {u.activo ? 'Activo' : 'Inactivo'}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-3 text-[11px] text-text2 mb-3">
              <span className="font-semibold">{ROLES.find((r) => r.value === u.rol)?.label ?? u.rol}</span>
              {u.centro_id && <span>· {CENTROS.find((c) => c.id === u.centro_id)?.nombre ?? u.centro_id}</span>}
            </div>
            <div className="flex gap-2">
              <button onClick={() => handleToggle(u.id)}
                className="text-[11px] px-3 py-1.5 border border-border rounded-sm hover:bg-surface2 transition-colors text-text2">
                {u.activo ? 'Desactivar' : 'Activar'}
              </button>
              <button onClick={() => { setPinChangeUserId(u.id); setPinChangeValue(''); setPinChangeError(null) }}
                className="text-[11px] px-3 py-1.5 border border-border rounded-sm hover:bg-surface2 transition-colors text-text2 flex items-center gap-1">
                <IconLock size={12} /> PIN
              </button>
            </div>
            {pinChangeUserId === u.id && (
              <div className="mt-3 pt-3 border-t border-border">
                <div className="flex items-center gap-2">
                  <input type="password" inputMode="numeric" maxLength={4} pattern="[0-9]{4}" placeholder="Nuevo PIN"
                    value={pinChangeValue} onChange={(e) => setPinChangeValue(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    className="flex-1 px-3 py-[8px] text-sm border border-border rounded-sm bg-surface text-text placeholder:text-text3 focus:outline-none focus:border-accent" />
                  <button onClick={() => handlePinChange(u.id)} disabled={pinChangeValue.length !== 4}
                    className="h-[34px] px-3 bg-accent text-white text-xs font-semibold rounded-sm hover:opacity-90 transition-opacity disabled:opacity-50">
                    Cambiar
                  </button>
                  <button onClick={() => setPinChangeUserId(null)}
                    className="h-[34px] px-3 border border-border rounded-sm text-text2 text-xs hover:bg-surface2 transition-colors">
                    Cancelar
                  </button>
                </div>
                {pinChangeError && <p className="text-xs text-red mt-1">{pinChangeError}</p>}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

interface InputFieldProps {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder: string
}

function InputField({ label, value, onChange, placeholder }: InputFieldProps) {
  return (
    <div>
      <label className="block text-xs text-text2 mb-1">{label}</label>
      <input type="text" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        autoCapitalize="none" autoCorrect="off" spellCheck={false}
        className="w-full px-3 py-[10px] text-sm border border-border rounded-sm bg-surface text-text placeholder:text-text3 focus:outline-none focus:border-accent transition-colors" />
    </div>
  )
}
