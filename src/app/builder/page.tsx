'use client'

import React, { useRef, useState } from 'react'
import { useProjects, useProjectSummary, useStageTasks, useUpdateTask, useAddEtapa, useAddTask } from '@/hooks/useProject'
import { useProjectSelection } from '@/contexts/ProjectContext'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Camera, Loader2, ChevronDown, ChevronUp, Plus, Trash2 } from 'lucide-react'
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
  onUpdated,
}: {
  etapaId: string;
  nombre: string;
  hito?: string | null;
  tareasTotal: number;
  tareasCompletadas: number;
  duracionEstimadaJornales: number;
  onUpdated: () => void;
}) {
  const [open, setOpen] = useState(false)
  const [newTaskDesc, setNewTaskDesc] = useState('')
  const [localTasks, setLocalTasks] = useState<{ id: string; estado: string; descripcion: string }[]>([])
  const { tasks, isLoading, refetch } = useStageTasks(open ? etapaId : null)
  const { updateTask } = useUpdateTask()
  const { addTask, isAdding } = useAddTask()

  // Sync local tasks when fetched
  React.useEffect(() => {
    if (tasks) setLocalTasks(tasks)
  }, [tasks])

  const total = open ? localTasks.length : tareasTotal
  const completed = open ? localTasks.filter(t => t.estado === 'completada').length : tareasCompletadas
  const progress = total > 0 ? (completed / total) * 100 : 0

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
    
    const ok = await addTask(etapaId, newTaskDesc.trim())
    if (ok) {
      setNewTaskDesc('')
      await refetch()
      onUpdated()
    }
  }

  return (
    <Card>
      <CardHeader className="flex items-center justify-between gap-2 sm:flex-row">
        <div>
          <CardTitle className="text-lg">{nombre}</CardTitle>
          <CardDescription>{hito ? `Hito: ${String(hito)}` : 'Sin hito'}</CardDescription>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={() => setOpen(v => !v)}>
            {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span>Progreso</span>
          <span className="font-medium">{Math.round(progress)}%</span>
        </div>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{completed}/{total} tareas completadas</span>
          <span>Jornales: {Math.round((progress / 100) * duracionEstimadaJornales)} / {duracionEstimadaJornales}</span>
        </div>
        <Progress value={progress} className="h-2" />

        {open && (
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              {isLoading && localTasks.length === 0 ? (
                <p className="text-sm text-muted-foreground">Cargando tareas...</p>
              ) : localTasks.length === 0 ? (
                <p className="text-sm text-muted-foreground">No hay tareas registradas.</p>
              ) : (
                localTasks.map((task) => (
                  <div key={task.id} className="flex items-start gap-3 rounded-md border p-3">
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
        <Button variant="outline" size="sm" className="gap-2">
          <Plus className="h-4 w-4" />
          Agregar etapa
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

export default function TasksPage() {

  const { projects, isLoading: projectsLoading } = useProjects()
  const { selectedProjectId } = useProjectSelection()
  const activeProjectId = selectedProjectId || (projects.length > 0 ? projects[0].id : null)
  const { data: summary, isLoading: summaryLoading, refetch } = useProjectSummary(activeProjectId)
  const [isUploadingReport, setIsUploadingReport] = useState(false)
  
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleUploadClick = () => {
    if (isUploadingReport) return
    fileInputRef.current?.click()
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !summary?.proyecto?.id) return

    setIsUploadingReport(true)

    try {
      const presignRes = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: summary.proyecto.id,
          filename: file.name,
          contentType: file.type || 'application/octet-stream',
          kind: 'adjuntos',
        }),
      })

      if (!presignRes.ok) {
        const data = await presignRes.json()
        throw new Error(data.error || 'No se pudo generar la URL de subida')
      }

      const { uploadUrl } = await presignRes.json()
      const uploadRes = await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type || 'application/octet-stream' },
        body: file,
      })

      if (!uploadRes.ok) {
        throw new Error('No se pudo subir el reporte')
      }

      alert('Reporte subido correctamente')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error al subir el reporte'
      alert(message)
    } finally {
      setIsUploadingReport(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

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
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold">Panel de Tareas</h1>
          <p className="text-muted-foreground">{summary.proyecto.nombre}</p>
        </div>
        <div className="flex items-center gap-2">
          <AddStageDialog projectId={summary.proyecto.id} onCreated={refetch} />
          <Button className="gap-2" onClick={handleUploadClick} disabled={isUploadingReport}>
            {isUploadingReport ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
            {isUploadingReport ? 'Subiendo...' : 'Subir reporte'}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Resumen</CardTitle>
          <CardDescription>Avance general de tareas</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span>Progreso general</span>
            <span className="font-medium">{summary.porcentajeAvance.toFixed(0)}%</span>
          </div>
          <Progress value={summary.porcentajeAvance} className="h-2" />
        </CardContent>
      </Card>

      <div className="space-y-4">
        {summary.etapas.map((etapa) => (
          <StageTasks
            key={etapa.id}
            etapaId={etapa.id}
            nombre={etapa.nombre}
            hito={String((etapa as unknown as Record<string, unknown>).hitoVerificacion ?? (etapa as unknown as Record<string, unknown>).hito_verificacion ?? '')}
            tareasTotal={etapa.tareasTotal}
            tareasCompletadas={etapa.tareasCompletadas}
            duracionEstimadaJornales={etapa.duracion_estimada_jornales || 0}
            onUpdated={refetch}
          />
        ))}
      </div>

      <input 
        type="file" 
        accept="image/*" 
        capture="environment" 
        className="hidden" 
        ref={fileInputRef}
        onChange={handleFileChange}
      />
    </div>
  )
}