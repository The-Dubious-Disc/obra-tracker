'use client'

import { useState } from 'react'
import { useProjectSummary } from "@/hooks/useProject"
import { useProjectSelection } from '@/contexts/ProjectContext'
import { useUserRole } from '@/contexts/UserRoleContext'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from "@/components/ui/button"
import { Coins, Plus, Trash2, AlertCircle } from "lucide-react"

function formatCurrency(amount: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

function WelcomeScreen() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[500px] space-y-6 text-center animate-in zoom-in-95 duration-700">
      <div className="relative p-12 glass-card border-primary/20 bg-card/40 backdrop-blur-xl max-w-2xl mx-auto">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent rounded-xl -z-10" />
        <Coins className="h-16 w-16 text-primary mx-auto mb-4 animate-bounce" />
        <h2 className="text-3xl font-black tracking-tight text-slate-900 dark:text-slate-50 mb-2">
          Gestión de Presupuestos
        </h2>
        <p className="text-muted-foreground text-sm max-w-md mx-auto">
          Seleccioná un proyecto en el menú lateral para visualizar y administrar el presupuesto contractual y adicionales.
        </p>
      </div>
    </div>
  )
}

export default function PresupuestoPage() {
  const { selectedProjectId } = useProjectSelection()
  const { data: summary, isLoading, error, refetch } = useProjectSummary(selectedProjectId)
  const { role } = useUserRole()

  const [isBudgetOpen, setIsBudgetOpen] = useState(false)
  const [isAdicionalOpen, setIsAdicionalOpen] = useState(false)

  // Delete dialog state
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [adicionalIdToDelete, setAdicionalIdToDelete] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Budget dialog form state
  const [newBudgetAmount, setNewBudgetAmount] = useState('')
  const [budgetNote, setBudgetNote] = useState('')
  const [distributeProportionally, setDistributeProportionally] = useState(true)
  const [isBudgetSubmitting, setIsBudgetSubmitting] = useState(false)

  // Additional dialog form state
  const [adicionalNombre, setAdicionalNombre] = useState('')
  const [adicionalMonto, setAdicionalMonto] = useState('')
  const [isAdicionalSubmitting, setIsAdicionalSubmitting] = useState(false)

  const [formError, setFormError] = useState<string | null>(null)

  const canEdit = role === 'admin' || role === 'editor'

  if (!selectedProjectId) {
    return <WelcomeScreen />
  }

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="h-10 w-48 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="h-32 bg-slate-200 dark:bg-slate-800 rounded-xl animate-pulse" />
          <div className="h-32 bg-slate-200 dark:bg-slate-800 rounded-xl animate-pulse" />
          <div className="h-32 bg-slate-200 dark:bg-slate-800 rounded-xl animate-pulse" />
        </div>
        <div className="h-96 bg-slate-200 dark:bg-slate-800 rounded-xl animate-pulse" />
      </div>
    )
  }

  if (error || !summary) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <AlertCircle className="h-12 w-12 text-destructive" />
        <h2 className="text-xl font-semibold">Error al cargar presupuesto</h2>
        <p className="text-muted-foreground text-center max-w-md">{error || 'No se pudo obtener la información.'}</p>
        <Button onClick={refetch} variant="outline">Reintentar</Button>
      </div>
    )
  }

  const { proyecto, etapas, adicionales: adicionalesList, totalPagado, presupuestoTotalCalculado } = summary
  const saldoPendiente = Math.max(0, presupuestoTotalCalculado - totalPagado)
  const porcentajePagado = presupuestoTotalCalculado > 0 ? (totalPagado / presupuestoTotalCalculado) * 100 : 0

  const handleBudgetSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)
    setIsBudgetSubmitting(true)

    try {
      const res = await fetch(`/api/projects/${selectedProjectId}/budget`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          newAmount: parseFloat(newBudgetAmount),
          note: budgetNote.trim(),
          distributeProportionally
        })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to update budget')
      
      setIsBudgetOpen(false)
      setNewBudgetAmount('')
      setBudgetNote('')
      refetch()
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Error al actualizar el presupuesto')
    } finally {
      setIsBudgetSubmitting(false)
    }
  }

  const handleAdicionalSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)
    setIsAdicionalSubmitting(true)

    try {
      const res = await fetch(`/api/projects/${selectedProjectId}/adicionales`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: adicionalNombre.trim(),
          monto: parseFloat(adicionalMonto)
        })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to create additional')

      setIsAdicionalOpen(false)
      setAdicionalNombre('')
      setAdicionalMonto('')
      refetch()
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Error al crear adicional')
    } finally {
      setIsAdicionalSubmitting(false)
    }
  }

  const handleDeleteAdicional = (id: string) => {
    setAdicionalIdToDelete(id)
    setIsDeleteOpen(true)
  }

  const confirmDeleteAdicional = async () => {
    if (!adicionalIdToDelete) return
    setIsDeleting(true)
    try {
      const res = await fetch(`/api/adicionales/${adicionalIdToDelete}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to delete adicional')
      }
      setIsDeleteOpen(false)
      setAdicionalIdToDelete(null)
      refetch()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al eliminar adicional')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="p-6 space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-slate-50 uppercase">
            Presupuesto y Balance
          </h1>
          <p className="text-muted-foreground text-sm">
            Control de costos, distribución contractual y obras adicionales de <span className="font-bold text-foreground">{proyecto.nombre}</span>.
          </p>
        </div>

        {canEdit && (
          <div className="flex flex-wrap gap-3">
            <Dialog open={isBudgetOpen} onOpenChange={setIsBudgetOpen}>
              <DialogTrigger asChild>
                <Button className="btn-industrial-secondary text-xs uppercase tracking-wider font-bold">
                  Modificar Presupuesto Global
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle className="text-xl font-bold uppercase tracking-tight">Modificar Presupuesto Global</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleBudgetSubmit} className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label htmlFor="newAmount" className="text-xs uppercase font-bold text-muted-foreground">Nuevo Monto Total (USD)</Label>
                    <Input
                      id="newAmount"
                      type="number"
                      placeholder="Ej. 150000"
                      value={newBudgetAmount}
                      onChange={(e) => setNewBudgetAmount(e.target.value)}
                      required
                      min="0"
                      step="0.01"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="note" className="text-xs uppercase font-bold text-muted-foreground">Notas / Justificación del cambio</Label>
                    <Input
                      id="note"
                      type="text"
                      placeholder="Ej. Adenda contractual por ampliación"
                      value={budgetNote}
                      onChange={(e) => setBudgetNote(e.target.value)}
                      required
                    />
                  </div>
                  <div className="flex items-center space-x-3 pt-2">
                    <input
                      id="distribute"
                      type="checkbox"
                      checked={distributeProportionally}
                      onChange={(e) => setDistributeProportionally(e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                    />
                    <Label htmlFor="distribute" className="text-xs font-semibold cursor-pointer">
                      Redistribuir proporcionalmente entre las etapas vigentes
                    </Label>
                  </div>

                  {formError && (
                    <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md text-destructive text-xs font-bold text-center">
                      {formError}
                    </div>
                  )}

                  <div className="flex justify-end gap-3 pt-4">
                    <Button type="button" variant="outline" onClick={() => setIsBudgetOpen(false)}>Cancelar</Button>
                    <Button type="submit" className="btn-industrial-primary" disabled={isBudgetSubmitting}>
                      {isBudgetSubmitting ? 'Guardando...' : 'Aplicar Cambio'}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>

            <Dialog open={isAdicionalOpen} onOpenChange={setIsAdicionalOpen}>
              <DialogTrigger asChild>
                <Button className="btn-industrial-primary text-xs uppercase tracking-wider font-bold">
                  <Plus className="h-4 w-4 mr-1.5" /> Agregar Adicional
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle className="text-xl font-bold uppercase tracking-tight">Agregar Item Adicional</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleAdicionalSubmit} className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label htmlFor="adicionalNombre" className="text-xs uppercase font-bold text-muted-foreground">Nombre del adicional</Label>
                    <Input
                      id="adicionalNombre"
                      type="text"
                      placeholder="Ej. Modificación de instalación eléctrica"
                      value={adicionalNombre}
                      onChange={(e) => setAdicionalNombre(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="adicionalMonto" className="text-xs uppercase font-bold text-muted-foreground">Monto (USD)</Label>
                    <Input
                      id="adicionalMonto"
                      type="number"
                      placeholder="Ej. 2800"
                      value={adicionalMonto}
                      onChange={(e) => setAdicionalMonto(e.target.value)}
                      required
                      min="0"
                      step="0.01"
                    />
                  </div>

                  {formError && (
                    <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md text-destructive text-xs font-bold text-center">
                      {formError}
                    </div>
                  )}

                  <div className="flex justify-end gap-3 pt-4">
                    <Button type="button" variant="outline" onClick={() => setIsAdicionalOpen(false)}>Cancelar</Button>
                    <Button type="submit" className="btn-industrial-primary" disabled={isAdicionalSubmitting}>
                      {isAdicionalSubmitting ? 'Guardando...' : 'Crear Adicional'}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        )}
      </div>

      {/* Financial Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="relative overflow-hidden rounded-xl border bg-card p-6 shadow-md">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Presupuesto Total</p>
          <p className="text-3xl font-black mt-2 text-slate-900 dark:text-slate-50 mono-data">
            {formatCurrency(presupuestoTotalCalculado)}
          </p>
          <p className="text-[11px] text-muted-foreground mt-1.5 uppercase font-semibold">
            Etapas ({formatCurrency(etapas.reduce((sum, e) => sum + Number(e.montoEtapa), 0))}) + Adicionales ({formatCurrency(adicionalesList.reduce((sum, a) => sum + Number(a.monto), 0))})
          </p>
        </div>

        <div className="relative overflow-hidden rounded-xl border bg-card p-6 shadow-md">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Total Aportado (Pagado)</p>
          <p className="text-3xl font-black mt-2 text-green-600 dark:text-green-400 mono-data">
            {formatCurrency(totalPagado)}
          </p>
          <div className="flex items-center gap-2 mt-2">
            <div className="h-2 flex-1 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
              <div className="h-full bg-green-500 rounded-full" style={{ width: `${Math.min(100, porcentajePagado)}%` }} />
            </div>
            <span className="text-[11px] font-black text-green-600 dark:text-green-400 mono-data">{porcentajePagado.toFixed(1)}%</span>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-xl border bg-card p-6 shadow-md">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Saldo Pendiente</p>
          <p className="text-3xl font-black mt-2 text-amber-600 dark:text-amber-500 mono-data">
            {formatCurrency(saldoPendiente)}
          </p>
          <p className="text-[11px] text-muted-foreground mt-1.5 uppercase font-semibold">
            Restante por desembolsar y certificar
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Etapas Table */}
        <div className="glass-card p-6 space-y-4">
          <div className="flex items-center justify-between border-b pb-3">
            <h3 className="text-lg font-black uppercase tracking-tight text-slate-900 dark:text-slate-50">
              Distribución por Etapa
            </h3>
            <span className="text-[10px] bg-slate-100 dark:bg-slate-800 border px-2 py-0.5 font-bold rounded uppercase tracking-wider">
              {etapas.length} Etapas
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                  <th className="py-3 px-2 text-center w-12">#</th>
                  <th className="py-3 px-2">Nombre Etapa</th>
                  <th className="py-3 px-2 text-center w-16">% Peso</th>
                  <th className="py-3 px-2 text-right">Monto USD</th>
                  <th className="py-3 px-2 text-right">Pagado USD</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {etapas.map((etapa) => (
                  <tr key={etapa.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50 transition-colors">
                    <td className="py-3.5 px-2 text-center font-bold text-muted-foreground mono-data">{etapa.orden}</td>
                    <td className="py-3.5 px-2 font-semibold text-slate-800 dark:text-slate-200">{etapa.nombre}</td>
                    <td className="py-3.5 px-2 text-center font-bold mono-data">{Number(etapa.porcentajeTotal).toFixed(1)}%</td>
                    <td className="py-3.5 px-2 text-right font-bold mono-data">{formatCurrency(Number(etapa.montoEtapa))}</td>
                    <td className="py-3.5 px-2 text-right font-semibold text-green-600 dark:text-green-400 mono-data">{formatCurrency(etapa.pagosTotales)}</td>
                  </tr>
                ))}
                {etapas.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-muted-foreground">
                      No hay etapas contractuales registradas en esta obra.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Adicionales Table */}
        <div className="glass-card p-6 space-y-4">
          <div className="flex items-center justify-between border-b pb-3">
            <h3 className="text-lg font-black uppercase tracking-tight text-slate-900 dark:text-slate-50">
              Adicionales / Extras
            </h3>
            <span className="text-[10px] bg-primary/10 border border-primary/20 px-2 py-0.5 font-bold rounded uppercase tracking-wider text-primary">
              {adicionalesList.length} Items
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                  <th className="py-3 px-2">Concepto</th>
                  <th className="py-3 px-2 text-center w-24">Estado</th>
                  <th className="py-3 px-2 text-right">Monto USD</th>
                  {canEdit && <th className="py-3 px-2 text-center w-12">Acciones</th>}
                </tr>
              </thead>
              <tbody className="divide-y">
                {adicionalesList.map((adicional) => (
                  <tr key={adicional.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50 transition-colors">
                    <td className="py-3.5 px-2 font-semibold text-slate-800 dark:text-slate-200">{adicional.nombre}</td>
                    <td className="py-3.5 px-2 text-center">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                        adicional.completado
                          ? 'bg-green-500/10 border-green-500/20 text-green-600 dark:text-green-400'
                          : 'bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400'
                      }`}>
                        {adicional.completado ? 'Completado' : 'Pendiente'}
                      </span>
                    </td>
                    <td className="py-3.5 px-2 text-right font-bold mono-data">{formatCurrency(Number(adicional.monto))}</td>
                    {canEdit && (
                      <td className="py-3.5 px-2 text-center">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive transition-colors"
                          onClick={() => handleDeleteAdicional(adicional.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    )}
                  </tr>
                ))}
                {adicionalesList.length === 0 && (
                  <tr>
                    <td colSpan={canEdit ? 4 : 3} className="py-8 text-center text-muted-foreground">
                      No se han registrado adicionales en esta obra.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal de confirmación de eliminación */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold uppercase tracking-tight text-destructive">
              Confirmar Eliminación
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground font-semibold">
              ¿Estás seguro de que deseas eliminar este adicional del presupuesto? Esta acción no se puede deshacer.
            </p>
          </div>
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => setIsDeleteOpen(false)}>Cancelar</Button>
            <Button 
              type="button" 
              variant="destructive" 
              onClick={confirmDeleteAdicional} 
              disabled={isDeleting}
            >
              {isDeleting ? 'Eliminando...' : 'Eliminar adicional'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
