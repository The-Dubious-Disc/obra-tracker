'use client'

import React, { useMemo, useState } from 'react'
import { useProjectSelection } from '@/contexts/ProjectContext'
import { usePendientes, useCreatePendiente, useUpdatePendiente, useDeletePendiente } from '@/hooks/useProject'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Calendar, Trash2 } from 'lucide-react'
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
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Nuevo pendiente</CardTitle>
          <CardDescription>Agrega un pendiente asociado al proyecto.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreate} className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2 md:col-span-1">
              <label className="text-sm font-medium">Título</label>
              <Input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ej: Revisar planos" />
            </div>
            <div className="space-y-2 md:col-span-1">
              <label className="text-sm font-medium">Fecha de vencimiento</label>
              <div className="relative">
                <Calendar className="h-4 w-4 absolute left-3 top-3 text-muted-foreground" />
                <Input
                  type="date"
                  value={fechaVencimiento}
                  onChange={(e) => setFechaVencimiento(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <div className="space-y-2 md:col-span-1">
              <label className="text-sm font-medium">Descripción</label>
              <Textarea
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                placeholder="Opcional"
                rows={1}
              />
            </div>
            <div className="md:col-span-3 flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <Checkbox checked={showCompleted} onCheckedChange={(val) => setShowCompleted(Boolean(val))} />
                <span className="text-sm text-muted-foreground">Mostrar completados</span>
              </div>
              <Button type="submit" disabled={isCreating || !titulo.trim() || !fechaVencimiento}>
                {isCreating ? 'Guardando...' : 'Crear pendiente'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Pendientes del proyecto</CardTitle>
          <CardDescription>Ordenados por fecha de vencimiento.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Cargando pendientes...</p>
          ) : error ? (
            <p className="text-sm text-destructive">{error}</p>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground">No hay pendientes para mostrar.</p>
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
                    className={`flex items-start justify-between gap-4 rounded-md border p-4 ${isOverdue ? 'border-red-300 bg-red-50/40' : ''}`}
                  >
                    <div className="flex items-start gap-3">
                      <Checkbox checked={isCompleted} onCheckedChange={(val) => handleToggle(pendiente, Boolean(val))} />
                      <div>
                        <div className={`font-medium ${isCompleted ? 'line-through text-muted-foreground' : ''}`}>
                          {pendiente.titulo}
                        </div>
                        {pendiente.descripcion && (
                          <div className="text-sm text-muted-foreground">{pendiente.descripcion}</div>
                        )}
                        <div className="text-xs text-muted-foreground mt-1">
                          Vence: {fechaValue ? formatDate(fechaValue) : 'Sin fecha'}
                        </div>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(pendiente.id)}>
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
