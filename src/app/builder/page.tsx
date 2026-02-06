'use client'

import React, { useRef, useState } from 'react'
import { useProjects, useProjectSummary, useStageTasks, useUpdateTask } from '@/hooks/useProject'
import { useProjectSelection } from '@/contexts/ProjectContext'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Camera, Loader2, ChevronDown, ChevronUp } from 'lucide-react'

function StageTasks({ etapaId, nombre, hito }: { etapaId: string; nombre: string; hito?: string | null }) {
  const [open, setOpen] = useState(false)
  const { tasks, isLoading, refetch } = useStageTasks(open ? etapaId : null)
  const { updateTask } = useUpdateTask()

  const total = tasks.length
  const completed = tasks.filter(t => t.estado === 'completada').length
  const progress = total > 0 ? (completed / total) * 100 : 0

  const handleToggle = async (taskId: string, next: 'pendiente' | 'en_progreso' | 'completada') => {
    const ok = await updateTask(taskId, next)
    if (ok) await refetch()
  }

  return (
    <Card>
      <CardHeader className="flex items-center justify-between gap-2 sm:flex-row">
        <div>
          <CardTitle className="text-lg">{nombre}</CardTitle>
          <CardDescription>{hito ? `Hito: ${hito}` : 'Sin hito'}</CardDescription>
        </div>
        <Button variant="ghost" size="sm" onClick={() => setOpen(v => !v)}>
          {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span>Progreso</span>
          <span className="font-medium">{Math.round(progress)}%</span>
        </div>
        <Progress value={progress} className="h-2" />

        {open && (
          <div className="space-y-2 pt-2">
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Cargando tareas...</p>
            ) : tasks.length === 0 ? (
              <p className="text-sm text-muted-foreground">No hay tareas registradas.</p>
            ) : (
              tasks.map((task) => (
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
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleToggle(task.id, task.estado === 'en_progreso' ? 'pendiente' : 'en_progreso')}
                  >
                    {task.estado === 'en_progreso' ? 'Pausar' : 'Iniciar'}
                  </Button>
                </div>
              ))
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default function TasksPage() {
  const { projects, isLoading: projectsLoading } = useProjects()
  const { selectedProjectId } = useProjectSelection()
  const activeProjectId = selectedProjectId || (projects.length > 0 ? projects[0].id : null)
  const { data: summary, isLoading: summaryLoading } = useProjectSummary(activeProjectId)
  
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleUploadClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      alert(`Foto seleccionada: ${file.name}\n(Funcionalidad de subida en Fase 4)`)
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
        <Button className="gap-2" onClick={handleUploadClick}>
          <Camera className="h-4 w-4" />
          Subir reporte
        </Button>
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
            hito={etapa.hito_verificacion}
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
