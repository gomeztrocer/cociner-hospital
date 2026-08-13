import { useState } from 'react'
import { IconClock, IconBook, IconPlus, IconEdit, IconTrash, IconX, IconChefHat, IconCheck } from '@tabler/icons-react'
import { useAppStore } from '../store/useAppStore'
import { useRecetas, type Receta, type RecetaIngrediente, type CreateRecetaInput } from '../hooks/useRecetas'
import { useHistorial } from '../hooks/useHistorial'
import { calcularBolsasIngrediente, calcularEmbarquetadoCentros, calcularPesoRecetaKg, escalarIngredientes, extraerPesoRacionObjetivoG } from '../lib/calculos'
import { FICHAS_REFERENCIA } from '../data/fichasRecetas'
import ServicioToggle from '../components/calcular/ServicioToggle'
import CentrosGrid from '../components/calcular/CentrosGrid'

type ModalMode = 'create' | 'edit' | null

const emptyIngrediente = (): Omit<RecetaIngrediente, 'id'> => ({
  nombre: '', cantidad: 0, unidad: 'g', orden: 0, peso_bolsa_kg: null,
})

export default function Recetas() {
  const pacientes = useAppStore((s) => s.pacientes)
  const centros = useAppStore((s) => s.centros)
  const user = useAppStore((s) => s.user)
  const totalPacientes = Object.values(pacientes).reduce((a, b) => a + b, 0)
  const { recetas, loading, error, createReceta, updateReceta, deleteReceta } = useRecetas()
  const canWrite = user?.rol === 'admin' || user?.rol === 'chef_ejecutivo'

  const [modalMode, setModalMode] = useState<ModalMode>(null)
  const [editReceta, setEditReceta] = useState<Receta | null>(null)
  const [formNombre, setFormNombre] = useState('')
  const [formRaciones, setFormRaciones] = useState('12')
  const [formTemp, setFormTemp] = useState('')
  const [formTiempo, setFormTiempo] = useState('')
  const [formNotas, setFormNotas] = useState('')
  const [formIngredientes, setFormIngredientes] = useState<Omit<RecetaIngrediente, 'id'>[]>([emptyIngrediente()])
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [registroGuardado, setRegistroGuardado] = useState<string | null>(null)
  const [selectedReceta, setSelectedReceta] = useState<Receta | null>(null)
  const servicio = useAppStore((s) => s.servicio)
  const fechaTrabajo = useAppStore((s) => s.fechaTrabajo)
  const { addRegistro } = useHistorial(user?.id, fechaTrabajo)

  const openCreate = () => {
    setModalMode('create')
    setEditReceta(null)
    setFormNombre('')
    setFormRaciones('12')
    setFormTemp('')
    setFormTiempo('')
    setFormNotas('')
    setFormIngredientes([emptyIngrediente()])
    setFormError('')
  }

  const openEdit = (r: Receta) => {
    setModalMode('edit')
    setEditReceta(r)
    setFormNombre(r.nombre)
    setFormRaciones(String(r.raciones_base))
    setFormTemp(r.temperatura ?? '')
    setFormTiempo(r.tiempo ?? '')
    setFormNotas(r.notas ?? '')
    setFormIngredientes(
      r.ingredientes.length > 0
        ? r.ingredientes.map((i) => ({ nombre: i.nombre, cantidad: i.cantidad, unidad: i.unidad, orden: i.orden, peso_bolsa_kg: i.peso_bolsa_kg }))
        : [emptyIngrediente()],
    )
    setFormError('')
  }

  const closeModal = () => {
    setModalMode(null)
    setEditReceta(null)
  }

  const addIngrediente = () => {
    setFormIngredientes((prev) => [...prev, { ...emptyIngrediente(), orden: prev.length }])
  }

  const removeIngrediente = (idx: number) => {
    setFormIngredientes((prev) => prev.filter((_, i) => i !== idx))
  }

  const updateIng = (idx: number, field: keyof Omit<RecetaIngrediente, 'id'>, value: string | number | null) => {
    setFormIngredientes((prev) =>
      prev.map((ing, i) => (i === idx ? { ...ing, [field]: value } : ing)),
    )
  }

  const handleSave = async () => {
    if (!formNombre.trim()) {
      setFormError('El nombre es obligatorio')
      return
    }
    const validIngs = formIngredientes.filter((i) => i.nombre.trim() && i.cantidad > 0)
    if (validIngs.length === 0) {
      setFormError('Agregá al menos un ingrediente válido')
      return
    }

    setSaving(true)
    setFormError('')

    const data: CreateRecetaInput = {
      nombre: formNombre.trim(),
      raciones_base: parseInt(formRaciones) || 12,
      temperatura: formTemp.trim() || null,
      tiempo: formTiempo.trim() || null,
      notas: formNotas.trim() || null,
      ingredientes: validIngs.map((ing, i) => ({ ...ing, orden: i })),
    }

    let result: { error?: string }
    if (modalMode === 'edit' && editReceta) {
      result = await updateReceta(editReceta.id, data)
    } else {
      result = await createReceta(data)
    }

    setSaving(false)
    if (result.error) {
      setFormError(result.error)
    } else {
      closeModal()
    }
  }

  const handleDelete = async (id: string) => {
    setDeleteError(null)
    const result = await deleteReceta(id)
    if (result.error) { setDeleteError(result.error); return }
    setDeleteConfirm(null)
  }

  const scaledIngredientes = selectedReceta
    ? escalarIngredientes(
        selectedReceta.ingredientes.map((i) => ({
          nombre: i.nombre,
          cantidad: i.cantidad,
          unidad: i.unidad,
          peso_bolsa_kg: i.peso_bolsa_kg,
        })),
        totalPacientes,
        selectedReceta.raciones_base,
      )
    : []

  const pesoBaseKg = selectedReceta ? calcularPesoRecetaKg(selectedReceta.ingredientes) : null
  const pesoRacionObjetivoG = selectedReceta ? extraerPesoRacionObjetivoG(selectedReceta.notas) : null
  const pesoPorRacionKg = pesoRacionObjetivoG != null
    ? pesoRacionObjetivoG / 1000
    : selectedReceta && pesoBaseKg != null
      ? pesoBaseKg / selectedReceta.raciones_base
      : null
  const embarquetado = selectedReceta
    ? calcularEmbarquetadoCentros({
        centros,
        pacientes,
        racionesPorBarqueta: 10,
        pesoPorRacionKg,
      })
    : []
  const totalBarquetas = embarquetado.reduce((total, centro) => total + centro.barquetasMultiporcion, 0)

  return (
    <>
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

      <div className="bg-surface border border-border rounded-xl shadow-sm overflow-hidden">
        <div className="p-[14px]">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-[7px] text-sm font-semibold text-text">
              <IconBook size={17} />
              Recetas
            </div>
            {canWrite && (
              <button
                onClick={openCreate}
                className="px-3 py-[7px] text-xs font-semibold text-white border-none rounded-sm flex items-center gap-1 cursor-pointer"
                style={{ background: '#1B5E3F' }}
              >
                <IconPlus size={13} />
                Nueva receta
              </button>
            )}
          </div>

          {loading && (
            <div className="flex items-center justify-center py-8 text-xs text-text3">
              <IconChefHat size={20} className="mr-2" />
              Cargando recetas...
            </div>
          )}

          {error && (
            <div className="text-xs text-red p-3 bg-red-light rounded-sm mb-3">
              {error}
            </div>
          )}

          {!loading && recetas.length === 0 && (
            <div className="flex flex-col items-center py-8 text-xs text-text3">
              <IconBook size={28} className="mb-2 opacity-50" />
              No hay recetas guardadas
              {canWrite && (
                <button
                  onClick={openCreate}
                  className="mt-3 px-3 py-[7px] text-xs font-semibold text-white border-none rounded-sm flex items-center gap-1 cursor-pointer"
                  style={{ background: '#1B5E3F' }}
                >
                  <IconPlus size={13} />
                  Crear primera receta
                </button>
              )}
            </div>
          )}

          {!loading && recetas.length > 0 && (
            <div className="space-y-3">
              {recetas.map((receta) => {
                const isSelected = selectedReceta?.id === receta.id
                const registroFirma = `${receta.id}:${fechaTrabajo}:${servicio}:${totalPacientes}:${totalBarquetas}`
                return (
                  <div
                    key={receta.id}
                    className={`border rounded-sm overflow-hidden transition-colors cursor-pointer ${
                      isSelected ? 'border-accent' : 'border-border'
                    }`}
                    onClick={() => setSelectedReceta(isSelected ? null : receta)}
                  >
                    <div className="bg-surface px-3 py-[10px] flex items-center justify-between">
                      <div>
                        <div className="text-sm font-semibold text-text">{receta.nombre}</div>
                        <div className="text-[10px] text-text3 mt-[2px]">
                          {receta.raciones_base} raciones base
                          {receta.tiempo && ` · ${receta.tiempo}`}
                          {receta.temperatura && ` · ${receta.temperatura}`}
                        </div>
                      </div>
                      {canWrite && (
                        <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => openEdit(receta)}
                            className="px-2 py-1 text-[11px] border border-border rounded-sm text-text2 cursor-pointer hover:bg-accent-light hover:text-accent"
                          >
                            <IconEdit size={13} />
                          </button>
                          <button
                            onClick={() => { setDeleteError(null); setDeleteConfirm(receta.id) }}
                            className="px-2 py-1 text-[11px] border border-border rounded-sm text-text2 cursor-pointer hover:bg-red-light hover:text-red"
                          >
                            <IconTrash size={13} />
                          </button>
                        </div>
                      )}
                    </div>

                    {isSelected && (
                      <div className="border-t border-border p-3 bg-surface2">
                        <div className="text-[10px] font-semibold uppercase tracking-wider text-text3 mb-2">
                          Ingredientes {totalPacientes > 0 && `(escalados para ${totalPacientes} pac.)`}
                        </div>
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="text-text3 border-b border-border">
                              <th className="text-left py-1 font-medium">Ingrediente</th>
                              <th className="text-right py-1 font-medium">Cantidad</th>
                              <th className="text-right py-1 font-medium">Unidad</th>
                            </tr>
                          </thead>
                          <tbody>
                            {scaledIngredientes.map((ing, i) => {
                              const bolsas = calcularBolsasIngrediente({
                                cantidad: ing.cantidad,
                                unidad: ing.unidad,
                                pesoBolsaKg: ing.peso_bolsa_kg,
                              })

                              return (
                                <tr key={i} className="border-b border-border last:border-none">
                                  <td className="py-1.5 text-text">
                                    {ing.nombre}
                                    {bolsas && (
                                      <div className="text-[10px] font-medium text-accent mt-1">
                                        Abrir {bolsas.bolsasAbrir} bolsas × {ing.peso_bolsa_kg} kg = {bolsas.kgDisponibles} kg
                                        {bolsas.sobranteKg > 0 && ` · sobrante estimado ${bolsas.sobranteKg} kg`}
                                      </div>
                                    )}
                                  </td>
                                  <td className="py-1.5 text-right font-mono text-text align-top">{ing.cantidad}</td>
                                  <td className="py-1.5 text-right text-text2 align-top">{ing.unidad}</td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>

                        <div className="mt-3 border-t border-border pt-3">
                          <div className="flex items-start justify-between gap-3 mb-2">
                            <div>
                              <div className="text-[10px] font-semibold uppercase tracking-wider text-text3">
                                Embarquetado por centro
                              </div>
                              <div className="text-[10px] text-text3 mt-1">
                                Mono: 1 envase por ración · Multi: 10 raciones por barqueta
                                {pesoPorRacionKg != null && ` · ${Math.round(pesoPorRacionKg * 1000)} g ${pesoRacionObjetivoG != null ? 'objetivo' : 'estimados'}/ración`}
                                {pesoRacionObjetivoG != null && ` · ${((pesoRacionObjetivoG * 10) / 1000).toLocaleString('es-ES', { maximumFractionDigits: 2 })} kg/barqueta completa`}
                              </div>
                            </div>
                            <div className="shrink-0 text-right">
                              <div className="text-lg leading-none font-mono font-semibold text-accent">{totalBarquetas}</div>
                              <div className="text-[9px] text-text3 mt-1">barquetas multi</div>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {embarquetado.map((centro) => (
                              <div key={centro.id} className="bg-surface border border-border rounded-sm px-3 py-2">
                                <div className="flex items-center justify-between gap-2">
                                  <div className="flex items-center gap-1.5 min-w-0">
                                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: centro.color }} />
                                    <span className="text-xs font-semibold text-text truncate">{centro.nombre}</span>
                                  </div>
                                  <span className="text-xs font-mono font-semibold text-text">{centro.raciones} rac.</span>
                                </div>
                                <div className="mt-1 text-[10px] text-text2">
                                  Mono: {centro.envasesMonoporcion} envases
                                </div>
                                <div className="text-[10px] text-text2">
                                  Multi: {centro.barquetasMultiporcion} barq. (
                                  {centro.barquetasCompletas > 0 && `${centro.barquetasCompletas} completas`}
                                  {centro.barquetasCompletas > 0 && centro.racionesParcial > 0 && ' + '}
                                  {centro.racionesParcial > 0 && `1 parcial de ${centro.racionesParcial}`}
                                  )
                                </div>
                                {centro.pesoEstimadoKg != null && (
                                  <div className="text-[10px] text-text3 mt-1">
                                    Peso estimado del centro: {centro.pesoEstimadoKg} kg
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>

                        {receta.notas && (
                          <div className="mt-2 text-[11px] text-text3 italic">
                            {receta.notas}
                          </div>
                        )}

                        {registroGuardado === registroFirma ? (
                          <div className="mt-2 flex items-center justify-center gap-1 text-xs font-semibold text-accent py-[7px]">
                            <IconCheck size={14} />
                            Preparación guardada ✓
                          </div>
                        ) : (
                          <button
                            onClick={async (e) => {
                              e.stopPropagation()
                              const r = await addRegistro({
                                plato: receta.nombre,
                                servicio: servicio === 'almuerzo' ? 'Almuerzo' : 'Cena',
                                raciones: totalPacientes,
                                categoria: 'receta',
                                barquetas: totalBarquetas,
                                fecha: fechaTrabajo,
                              })
                              if (!r.error) setRegistroGuardado(registroFirma)
                            }}
                            className="w-full mt-2 py-[7px] text-xs font-semibold border border-accent rounded-sm bg-accent-light text-accent cursor-pointer active:scale-[0.98] transition-transform"
                          >
                            Guardar como preparación
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          <details className="mt-4 border-t border-border pt-3 group">
            <summary className="text-xs font-semibold text-text cursor-pointer select-none">
              Gramajes y procedimientos de las fichas SJDD
            </summary>
            <div className="mt-3 space-y-3">
              {FICHAS_REFERENCIA.map((ficha) => (
                <div key={ficha.titulo} className="bg-surface2 rounded-sm p-3">
                  <div className="text-xs font-semibold text-text mb-1.5">{ficha.titulo}</div>
                  <ul className="space-y-1 pl-4 list-disc">
                    {ficha.items.map((item) => (
                      <li key={item} className="text-[11px] leading-relaxed text-text2">{item}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </details>
        </div>
      </div>

      {modalMode && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={closeModal} />
          <div className="relative bg-surface w-full max-h-[90vh] overflow-y-auto rounded-t-xl sm:rounded-xl p-[14px] shadow-lg" style={{ maxWidth: 420 }}>
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm font-semibold text-text">
                {modalMode === 'create' ? 'Nueva receta' : 'Editar receta'}
              </div>
              <button onClick={closeModal} className="p-1 text-text3 cursor-pointer">
                <IconX size={18} />
              </button>
            </div>

            {formError && (
              <div className="text-xs text-red bg-red-light p-2 rounded-sm mb-3">{formError}</div>
            )}

            <div className="space-y-3">
              <div>
                <label className="text-[11px] text-text2 block mb-[3px]">Nombre *</label>
                <input type="text" value={formNombre} onChange={(e) => setFormNombre(e.target.value)}
                  className="w-full px-[10px] py-[7px] text-sm border border-border rounded-sm bg-bg text-text" />
              </div>
              <div>
                <label className="text-[11px] text-text2 block mb-[3px]">Raciones base</label>
                <input type="number" min={1} value={formRaciones} onChange={(e) => setFormRaciones(e.target.value)}
                  className="w-full px-[10px] py-[7px] text-sm border border-border rounded-sm bg-bg text-text" />
              </div>
              <div className="grid grid-cols-2 gap-[7px]">
                <div>
                  <label className="text-[11px] text-text2 block mb-[3px]">Temperatura</label>
                  <input type="text" value={formTemp} onChange={(e) => setFormTemp(e.target.value)}
                    className="w-full px-[10px] py-[7px] text-sm border border-border rounded-sm bg-bg text-text" />
                </div>
                <div>
                  <label className="text-[11px] text-text2 block mb-[3px]">Tiempo</label>
                  <input type="text" value={formTiempo} onChange={(e) => setFormTiempo(e.target.value)}
                    className="w-full px-[10px] py-[7px] text-sm border border-border rounded-sm bg-bg text-text" />
                </div>
              </div>
              <div>
                <label className="text-[11px] text-text2 block mb-[3px]">Notas</label>
                <textarea value={formNotas} onChange={(e) => setFormNotas(e.target.value)} rows={2}
                  className="w-full px-[10px] py-[7px] text-sm border border-border rounded-sm bg-bg text-text resize-none" />
              </div>

              <div>
                <div className="flex items-center justify-between mb-[3px]">
                  <label className="text-[11px] text-text2">Ingredientes</label>
                  <button onClick={addIngrediente}
                    className="text-[11px] text-accent cursor-pointer border-none bg-transparent font-semibold">
                    ＋ Agregar
                  </button>
                </div>
                {formIngredientes.map((ing, i) => (
                  <div key={i} className="mb-2 rounded-sm border border-border p-2 bg-surface2">
                    <div className="grid grid-cols-[1fr_80px_70px_auto] gap-[5px] items-end">
                      <div>
                        <label className="text-[9px] text-text3 block">Nombre</label>
                        <input type="text" value={ing.nombre} onChange={(e) => updateIng(i, 'nombre', e.target.value)}
                          className="w-full px-[8px] py-[6px] text-xs border border-border rounded-sm bg-bg text-text" />
                      </div>
                      <div>
                        <label className="text-[9px] text-text3 block">Cantidad</label>
                        <input type="number" min={0} step={0.1} value={ing.cantidad} onChange={(e) => updateIng(i, 'cantidad', parseFloat(e.target.value) || 0)}
                          className="w-full px-[8px] py-[6px] text-xs border border-border rounded-sm bg-bg text-text" />
                      </div>
                      <div>
                        <label className="text-[9px] text-text3 block">Unidad</label>
                        <select value={ing.unidad} onChange={(e) => updateIng(i, 'unidad', e.target.value)}
                          className="w-full px-[8px] py-[6px] text-xs border border-border rounded-sm bg-bg text-text">
                          <option value="g">g</option>
                          <option value="kg">kg</option>
                          <option value="litros">litros</option>
                          <option value="unidades">unidades</option>
                          <option value="cajas">cajas</option>
                        </select>
                      </div>
                      <button onClick={() => removeIngrediente(i)}
                        className="px-[6px] py-[6px] text-text3 cursor-pointer border border-border rounded-sm bg-transparent text-[11px]">
                        <IconX size={12} />
                      </button>
                    </div>
                    <div className="flex items-center justify-end gap-2 mt-2">
                      <label className="text-[9px] text-text3">Peso por bolsa (kg, opcional)</label>
                      <input
                        type="number"
                        min={0}
                        step={0.1}
                        value={ing.peso_bolsa_kg ?? ''}
                        onChange={(e) => updateIng(i, 'peso_bolsa_kg', e.target.value ? parseFloat(e.target.value) : null)}
                        placeholder="2.5"
                        className="w-[75px] px-[8px] py-[5px] text-xs font-mono border border-border rounded-sm bg-bg text-text"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full mt-4 py-[9px] text-xs font-semibold text-white border-none rounded-sm cursor-pointer disabled:opacity-50"
              style={{ background: '#1B5E3F' }}
            >
              {saving ? 'Guardando...' : 'Guardar receta'}
            </button>
          </div>
        </div>
      )}

      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setDeleteConfirm(null)} />
          <div className="relative bg-surface rounded-xl p-[14px] shadow-lg mx-3" style={{ maxWidth: 320 }}>
            <div className="text-sm font-semibold text-text mb-2">¿Eliminar receta?</div>
            <div className="text-xs text-text2 mb-4">Esta acción no se puede deshacer.</div>
            {deleteError && <div role="alert" className="mb-3 rounded-sm bg-redLight p-2 text-xs text-red">{deleteError}</div>}
            <div className="flex gap-2 justify-end">
              <button onClick={() => setDeleteConfirm(null)}
                className="px-3 py-[7px] text-xs border border-border rounded-sm text-text2 cursor-pointer bg-surface">
                Cancelar
              </button>
              <button onClick={() => handleDelete(deleteConfirm)}
                className="px-3 py-[7px] text-xs text-white border-none rounded-sm cursor-pointer"
                style={{ background: '#991B1B' }}>
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
