'use client'

import React, { useMemo, useState } from 'react'
import { useProjectSelection } from '@/contexts/ProjectContext'
import { usePendientes, useCreatePendiente, useUpdatePendiente, useDeletePendiente } from '@/hooks/useProject'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Calendar, Trash2, Plus, Loader2 } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import type { Pendiente } from '@/types/database.types'

function formatDate(date: string) {
  try {
    return new Date(date).toLocaleDateString('es-UY')
  } catch {
    return date
  }
}

export default function PendientesPage() {
  const { selectedProjectId } = useProjectSelection()
  const { pendientes, isLoading, error, refetch } = usePendientes(selectedProjectId)
  const { createPendiente, isCreating } = useCreatePendiente()
  const { updatePendiente } = useUpdatePendiente()
  const { deletePendiente } = useDeletePendiente()

  const [modalOpen, setModalOpen] = useState(false)
  const [titulo, setTitulo] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [fechaVencimiento, setFechaVencimiento] = useState('')
  const [showCompleted, setShowCompleted] = useState(false)

  const filtered = useMemo(() => {
    if (showCompleted) return pendientes
    return pendientes.filter((p) => p.estado !== 'completado')
  }, [pendientes, showCompleted])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedProjectId || !titulo.trim() || !fechaVencimiento) return

    const ok = await createPendiente({
      projectId: selectedProjectId,
      titulo: titulo.trim(),
      descripcion: descripcion.trim() || undefined,
      fechaVencimiento,
    })

    if (ok) {
      setTitulo('')
      setDescripcion('')
      setFechaVencimiento('')
      setModalOpen(false)
      await refetch()
    }
  }

  const handleToggle = async (pendiente: Pendiente, nextChecked: boolean) => {
    const ok = await updatePendiente(pendiente.id, {
      estado: nextChecked ? 'completado' : 'pendiente',
    })
    if (ok) await refetch()
  }

  const handleDelete = async (pendienteId: string) => {
    if (!confirm('¿Estás seguro de eliminar este pendiente?')) return
    const ok = await deletePendiente(pendienteId)
    if (ok) await refetch()
  }

  if (!selectedProjectId) {
    return <div className="p-6">Selecciona un proyecto para ver los pendientes.</div>
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold">Pendientes</h1>
          <p className="text-muted-foreground">Tareas fuera de etapas con fecha de vencimiento.</p>
        </div>

        <Dialog open={modalOpen} onOpenChange={setModalOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Nuevo pendiente
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Nuevo pendiente</DialogTitle>
              <DialogDescription>
                Agrega un pendiente asociado al proyecto actual.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4 py-2">
              <div className="grid gap-2">
                <Label htmlFor="titulo">Título</Label>
                <Input
                  id="titulo"
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                  placeholder="Ej: Revisar planos"
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="fecha">Fecha de vencimiento</Label>
                <div className="relative">
                  <Calendar className="h-4 w-4 absolute left-3 top-3 text-muted-foreground" />
                  <Input
                    id="fecha"
                    type="date"
                    value={fechaVencimiento}
                    onChange={(e) => setFechaVencimiento(e.target.value)}
                    className="pl-9"
                    required
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="descripcion">Descripción (opcional)</Label>
                <Textarea
                  id="descripcion"
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  placeholder="Detalles adicionales..."
                  rows={3}
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={isCreating || !titulo.trim() || !fechaVencimiento}>
                  {isCreating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    'Crear pendiente'
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex items-center gap-2 px-1">
        <Checkbox
          id="show-completed"
          checked={showCompleted}
          onCheckedChange={(val) => setShowCompleted(Boolean(val))}
        />
        <label
          htmlFor="show-completed"
          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
        >
          Mostrar completados
        </label>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de pendientes</CardTitle>
          <CardDescription>Ordenados por fecha de vencimiento más cercana.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <p className="text-sm text-destructive">{error}</p>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No hay pendientes {showCompleted ? '' : 'activos'} para mostrar.
            </p>
          ) : (
            <div className="space-y-3">
              {filtered.map((pendiente) => {
                const isCompleted = pendiente.estado === 'completado'
                const fecha = (pendiente as unknown as Record<string, unknown>).fechaVencimiento ?? (pendiente as unknown as Record<string, unknown>).fecha_vencimiento
                const fechaValue = typeof fecha === 'string' ? fecha : ''
                const isOverdue = !isCompleted && fechaValue ? new Date(fechaValue).getTime() < Date.now() : false

                return (
                  <div
                    key={pendiente.id}
                    className={`flex items-start justify-between gap-4 rounded-md border p-4 transition-colors ${
                      isOverdue ? 'border-red-300 bg-red-50/40' : 'hover:bg-muted/50'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={isCompleted}
                        onCheckedChange={(val) => handleToggle(pendiente, Boolean(val))}
                      />
                      <div>
                        <div className={`font-medium ${isCompleted ? 'line-through text-muted-foreground' : ''}`}>
                          {pendiente.titulo}
                        </div>
                        {pendiente.descripcion && (
                          <div className="text-sm text-muted-foreground mt-1">{pendiente.descripcion}</div>
                        )}
                        <div className={`text-xs mt-2 flex items-center gap-1 ${isOverdue ? 'text-red-600 font-medium' : 'text-muted-foreground'}`}>
                          <Calendar className="h-3.3 w-3.3" />
                          Vence: {fechaValue ? formatDate(fechaValue) : 'Sin fecha'}
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground hover:text-destructive"
                      onClick={() => handleDelete(pendiente.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
