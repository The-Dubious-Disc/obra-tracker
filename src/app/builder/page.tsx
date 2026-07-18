'use client'

// Triggering refresh to fix stale summary error.

import React, { useState } from 'react'
import { useProjects, useProjectSummary, useStageTasks, useUpdateTask, useAddEtapa, useAddTask } from '@/hooks/useProject'
import { useProjectSelection } from '@/contexts/ProjectContext'
import { useUserRole } from '@/contexts/UserRoleContext'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import { SegmentedProgress } from '@/components/ui/segmented-progress'
import { Badge } from '@/components/ui/badge'
import { Loader2, ChevronDown, ChevronUp, Plus, Trash2 } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

function StageTasks({
  etapaId,
  nombre,
  hito,
  tareasTotal,
  tareasCompletadas,
  duracionEstimadaJornales,
  index,
  onUpdated,
}: {
  etapaId: string;
  nombre: string;
  hito?: string | null;
  tareasTotal: number;
  tareasCompletadas: number;
  duracionEstimadaJornales: number;
  index: number;
  onUpdated: () => void;
}) {
  // ... existing hooks ...
  const [open, setOpen] = useState(false)
  const [newTaskDesc, setNewTaskDesc] = useState('')
  const [localTasks, setLocalTasks] = useState<{ id: string; estado: string; descripcion: string }[]>([])
  const { tasks, isLoading, refetch } = useStageTasks(open ? etapaId : null)
  const { updateTask } = useUpdateTask()
  const { addTask, isAdding } = useAddTask()

  // ... (keep useEffect and handlers the same) ...
  // Sync local tasks when fetched
  React.useEffect(() => {
    if (tasks) setLocalTasks(tasks)
  }, [tasks])

  const total = open ? localTasks.length : tareasTotal
  const completed = open ? localTasks.filter(t => t.estado === 'completada').length : tareasCompletadas
  const progress = total > 0 ? (completed / total) * 100 : 0

  const status = progress >= 100 ? 'Completado' : progress > 0 ? 'En Proceso' : 'Pendiente'

  const handleToggle = async (taskId: string, next: 'pendiente' | 'en_progreso' | 'completada') => {
    // Optimistic update
    const previousTasks = [...localTasks]
    setLocalTasks(prev => prev.map(t => t.id === taskId ? { ...t, estado: next } : t))

    const ok = await updateTask(taskId, next)
    if (ok) {
      onUpdated()
    } else {
      // Rollback
      setLocalTasks(previousTasks)
    }
  }

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTaskDesc.trim()) return

    // Optimistic insert with temporary ID
    const tempTask = { id: `temp-${Date.now()}`, estado: 'pendiente', descripcion: newTaskDesc.trim() }
    setLocalTasks(prev => [...prev, tempTask])
    setNewTaskDesc('')

    const ok = await addTask(etapaId, newTaskDesc.trim())
    if (ok) {
      await refetch() // silent sync to get real ID
      onUpdated()
    } else {
      // Rollback: remove temp task
      setLocalTasks(prev => prev.filter(t => t.id !== tempTask.id))
    }
  }

  return (
    <Card>
      <CardHeader className="flex items-center justify-between gap-2 sm:flex-row py-4">
        <div className="flex items-center gap-3">
           <div className="flex items-center justify-center h-6 w-6 rounded-md bg-slate-100 dark:bg-slate-800 border border-border text-xs font-black text-slate-500 mono-data">
             {String(index + 1).padStart(2, '0')}
           </div>
           <CardTitle className="text-sm font-bold tracking-tight text-slate-900 dark:text-slate-100">{nombre}</CardTitle>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={() => setOpen(v => !v)} className="h-10 w-10">
            {open ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {open && hito && (
           <div className="bg-primary/5 p-3 rounded-lg border-l-2 border-primary/40">
             <p className="label-xs text-primary mb-1">Hito de Verificación</p>
             <p className="text-xs text-slate-700 dark:text-slate-300 font-semibold italic leading-tight">{hito}</p>
           </div>
        )}
        <div className="flex items-center justify-between text-sm">
          <Badge 
            variant={status === "Completado" ? "default" : status === "En Proceso" ? "secondary" : "outline"}
            className="rounded-md px-2.5 py-1 text-xs font-bold tracking-wide"
          >
            {status}
          </Badge>
          <div className="flex items-baseline gap-1">
            <span className="text-xl font-black mono-data">{Math.round(progress)}</span>
            <span className="text-xs font-bold text-muted-foreground">%</span>
          </div>
        </div>
        <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-900/50 p-3 rounded-lg border border-border/50 text-sm">
           <span className="font-medium text-muted-foreground">{completed}/{total} <span className="label-xs">Tareas</span></span>
           <span className="font-medium text-muted-foreground"><span className="label-xs">Jornales:</span> {Math.round((progress / 100) * duracionEstimadaJornales)} / {duracionEstimadaJornales}</span>
        </div>
        <SegmentedProgress value={progress} segments={12} className="h-2" />

        {open && (
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              {isLoading && localTasks.length === 0 ? (
                <p className="text-sm text-muted-foreground">Cargando tareas...</p>
              ) : localTasks.length === 0 ? (
                <p className="text-sm text-muted-foreground">No hay tareas registradas.</p>
              ) : (
                localTasks.map((task) => (
                  <div key={task.id} className="flex items-start gap-3 rounded-lg border p-3">
                    <Checkbox
                      checked={task.estado === 'completada'}
                      onCheckedChange={(checked) =>
                        handleToggle(task.id, checked ? 'completada' : 'pendiente')
                      }
                    />
                    <div className="flex-1">
                      <p className={`text-sm ${task.estado === 'completada' ? 'line-through text-muted-foreground' : ''}`}>
                        {task.descripcion}
                      </p>
                      <div className="text-xs text-muted-foreground">
                        Estado: {task.estado}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
            
            <form onSubmit={handleAddTask} className="flex gap-2">
              <Input
                placeholder="Nueva tarea..."
                value={newTaskDesc}
                onChange={(e) => setNewTaskDesc(e.target.value)}
                disabled={isAdding}
                className="h-8 text-sm"
              />
              <Button type="submit" size="sm" disabled={isAdding || !newTaskDesc.trim()}>
                {isAdding ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
              </Button>
            </form>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function AddStageDialog({ projectId, onCreated }: { projectId: string, onCreated: () => void }) {
  const [open, setOpen] = useState(false)
  const [nombre, setNombre] = useState('')
  const [porcentaje, setPorcentaje] = useState('')
  const [jornales, setJornales] = useState('')
  const [hito, setHito] = useState('')
  const [tareas, setTareas] = useState<string[]>([''])
  const { addEtapa, isAdding, error } = useAddEtapa()

  const handleAddTareaInput = () => setTareas([...tareas, ''])
  const handleTareaChange = (index: number, value: string) => {
    const newTareas = [...tareas]
    newTareas[index] = value
    setTareas(newTareas)
  }
  const handleRemoveTareaInput = (index: number) => {
    if (tareas.length > 1) {
      setTareas(tareas.filter((_, i) => i !== index))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const payload = {
      nombre,
      porcentajeTotal: parseFloat(porcentaje),
      duracionEstimadaJornales: parseInt(jornales),
      hitoVerificacion: hito || null,
      tareas: tareas
        .filter(t => t.trim() !== '')
        .map(t => ({ descripcion: t.trim() }))
    }

    const ok = await addEtapa(projectId, payload)
    if (ok) {
      setOpen(false)
      resetForm()
      onCreated()
    }
  }

  const resetForm = () => {
    setNombre('')
    setPorcentaje('')
    setJornales('')
    setHito('')
    setTareas([''])
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2 text-primary hover:text-primary hover:bg-primary/10">
          <Plus className="h-4 w-4" />
          Nueva Etapa
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Nueva Etapa de Obra</DialogTitle>
          <DialogDescription>
            Agrega una nueva etapa al proyecto actual.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="grid gap-2">
            <Label htmlFor="nombre">Nombre de la etapa</Label>
            <Input 
              id="nombre" 
              placeholder="Ej: Cimentación" 
              value={nombre} 
              onChange={e => setNombre(e.target.value)}
              required 
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="porcentaje">% Presupuesto</Label>
              <Input 
                id="porcentaje" 
                type="number" 
                placeholder="0" 
                value={porcentaje} 
                onChange={e => setPorcentaje(e.target.value)}
                required 
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="jornales">Jornales est.</Label>
              <Input 
                id="jornales" 
                type="number" 
                placeholder="0" 
                value={jornales} 
                onChange={e => setJornales(e.target.value)}
                required 
              />
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="hito">Hito de verificación (opcional)</Label>
            <Input 
              id="hito" 
              placeholder="Ej: Llenado de platea" 
              value={hito} 
              onChange={e => setHito(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Tareas (al menos una)</Label>
            {tareas.map((tarea, index) => (
              <div key={index} className="flex gap-2">
                <Input 
                  placeholder={`Tarea ${index + 1}`} 
                  value={tarea} 
                  onChange={e => handleTareaChange(index, e.target.value)}
                  required={index === 0}
                />
                {tareas.length > 1 && (
                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => handleRemoveTareaInput(index)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                )}
              </div>
            ))}
            <Button 
              type="button" 
              variant="link" 
              size="sm" 
              className="px-0 h-auto" 
              onClick={handleAddTareaInput}
            >
              + Agregar otra tarea
            </Button>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button type="submit" disabled={isAdding}>
              {isAdding ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Crear Etapa
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function AdicionalesPanel({
  adicionales,
  canEdit,
  onUpdated
}: {
  adicionales: Array<{ id: string; nombre: string; monto: number; completado: boolean }>;
  canEdit: boolean;
  onUpdated: () => void;
}) {
  const [localAdicionales, setLocalAdicionales] = useState(adicionales)

  React.useEffect(() => {
    setLocalAdicionales(adicionales)
  }, [adicionales])

  const handleToggle = async (id: string, currentStatus: boolean) => {
    const previous = [...localAdicionales]
    setLocalAdicionales(prev => prev.map(a => a.id === id ? { ...a, completado: !currentStatus } : a))

    try {
      const res = await fetch(`/api/adicionales/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completado: !currentStatus })
      });
      if (!res.ok) throw new Error('Error al actualizar adicional');
      onUpdated();
    } catch (err) {
      setLocalAdicionales(previous)
      alert(err instanceof Error ? err.message : 'Error al actualizar adicional');
    }
  };

  if (adicionales.length === 0) return null;

  return (
    <Card>
      <CardHeader className="py-4 border-b">
        <CardTitle className="text-sm font-bold tracking-tight text-slate-900 dark:text-slate-100 uppercase">
          Tareas Adicionales
        </CardTitle>
        <CardDescription className="text-xs">Items de obra adicionales al contrato principal</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 pt-4">
        {localAdicionales.map((ad) => (
          <div key={ad.id} className="flex items-center gap-3 rounded-lg border p-4 bg-card shadow-sm hover:shadow-md transition-shadow">
            <Checkbox
              checked={ad.completado}
              disabled={!canEdit}
              onCheckedChange={() => handleToggle(ad.id, ad.completado)}
            />
            <div className="flex-1 flex justify-between items-center">
              <div>
                <p className={`text-sm font-semibold ${ad.completado ? 'line-through text-muted-foreground' : 'text-slate-800 dark:text-slate-200'}`}>
                  {ad.nombre}
                </p>
                <p className="text-[11px] font-bold text-muted-foreground uppercase mt-0.5">
                  Monto: <span className="mono-data">{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(ad.monto)}</span>
                </p>
              </div>
              <Badge variant={ad.completado ? 'default' : 'outline'} className="text-[10px] uppercase font-bold tracking-wide">
                {ad.completado ? 'Completado' : 'Pendiente'}
              </Badge>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export default function TasksPage() {

  const { projects, isLoading: projectsLoading } = useProjects()
  const { selectedProjectId } = useProjectSelection()
  const activeProjectId = selectedProjectId || (projects.length > 0 ? projects[0].id : null)
  const { data: summary, isLoading: summaryLoading, refetch } = useProjectSummary(activeProjectId)
  const { role } = useUserRole()

  const canEdit = role === 'admin' || role === 'editor'

  if (projectsLoading || summaryLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
        <p className="text-muted-foreground animate-pulse">Cargando tareas de obra...</p>
      </div>
    )
  }

  if (!summary) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-xl font-semibold">No hay proyectos activos</h2>
        <p className="text-muted-foreground mt-2">Crea un proyecto en el panel de administrador primero.</p>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-8 animate-in fade-in duration-700">
      <div className="flex items-center justify-between border-b border-border/50 pb-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-primary animate-pulse shadow-[0_0_8px_rgba(249,115,22,0.5)]" />
            <span className="label-xs text-primary">Gestión de Obra</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-slate-50 tracking-tight">
            Panel de Tareas
          </h1>
          <Badge variant="outline" className="border-border px-3 py-1.5 font-bold mono-data text-xs tracking-wide bg-card rounded-lg">
            {summary.proyecto.nombre}
          </Badge>
        </div>
        {canEdit && (
          <div className="flex flex-col items-end gap-2">
            <AddStageDialog projectId={summary.proyecto.id} onCreated={refetch} />
          </div>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="label-xs">Resumen General</CardTitle>
          <CardDescription className="text-xs font-medium">Avance global del proyecto</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-baseline gap-2">
             <span className="text-4xl md:text-5xl font-black text-slate-900 dark:text-slate-50 mono-data tracking-tighter">
               {summary.porcentajeAvance.toFixed(0)}
             </span>
             <span className="text-xl font-black text-primary mono-data">%</span>
          </div>
          <SegmentedProgress value={summary.porcentajeAvance} segments={20} className="h-3" />
          <div className="flex justify-between items-center bg-slate-100/50 dark:bg-slate-900/50 p-3 rounded-lg border border-border/50 text-sm">
             <div className="flex flex-col">
               <span className="label-xs mb-1">Jornales</span>
               <span className="mono-data font-black">{Math.round(summary.jornalesCompletados)} / {summary.totalJornales}</span>
             </div>
             <div className="h-6 w-[1px] bg-border/50" />
             <div className="flex flex-col items-end">
               <span className="label-xs mb-1">Restantes</span>
               <span className="mono-data font-black">{Math.max(0, Math.round(summary.totalJornales - summary.jornalesCompletados))}</span>
             </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {summary.etapas.map((etapa, index) => (
          <StageTasks
            key={etapa.id}
            etapaId={etapa.id}
            nombre={etapa.nombre}
            hito={etapa.hitoVerificacion}
            tareasTotal={etapa.tareasTotal}
            tareasCompletadas={etapa.tareasCompletadas}
            duracionEstimadaJornales={etapa.duracionEstimadaJornales || 0}
            index={index}
            onUpdated={refetch}
          />
        ))}
      </div>

      {/* Tareas Adicionales */}
      <AdicionalesPanel
        adicionales={summary.adicionales.map(a => ({ ...a, monto: Number(a.monto) })) || []}
        canEdit={canEdit}
        onUpdated={refetch}
      />
    </div>
  )
}