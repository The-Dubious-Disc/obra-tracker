'use client'

import React, { useRef } from 'react'
import { useProjects, useProjectSummary } from '@/hooks/useProject'
import { useProjectSelection } from '@/contexts/ProjectContext'
import { Card, CardContent } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import { Camera, Loader2 } from 'lucide-react'

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
    <div className="max-w-md mx-auto p-4 space-y-6 pb-24">
      <header className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">Panel de Tareas</h1>
          <p className="text-muted-foreground">{summary.proyecto.nombre}</p>
        </div>
        <Button variant="outline" className="gap-2" onClick={handleUploadClick}>
          <Camera className="h-4 w-4" />
          Subir reporte
        </Button>
      </header>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            Tareas Pendientes
          </h2>
          <span className="text-sm bg-primary/10 text-primary px-2 py-1 rounded-full font-medium">
            {summary.porcentajeAvance.toFixed(0)}% Completado
          </span>
        </div>

        <div className="space-y-6">
          {summary.etapas.map((etapa) => (
            <div key={etapa.id} className="space-y-3">
              <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground border-b pb-1">
                {etapa.nombre}
              </h3>
              
              <div className="space-y-2">
                <Card className="overflow-hidden border-l-4 border-l-blue-500 shadow-sm">
                  <CardContent className="p-4 flex items-center gap-4">
                    <Checkbox id={`task-${etapa.id}-1`} className="h-6 w-6" />
                    <div className="flex-1">
                      <label 
                        htmlFor={`task-${etapa.id}-1`}
                        className="text-base font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        Iniciar {etapa.nombre.toLowerCase()}
                      </label>
                      <p className="text-xs text-muted-foreground mt-1">Hito: {etapa.hito_verificacion || 'Sin hito'}</p>
                    </div>
                  </CardContent>
                </Card>

                {/* tarea "Preparación" removida */}
              </div>
            </div>
          ))}
        </div>
      </section>

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
