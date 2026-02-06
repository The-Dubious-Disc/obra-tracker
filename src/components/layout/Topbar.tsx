'use client'

import { useEffect } from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useProjects } from '@/hooks/useProject'
import { useProjectSelection } from '@/contexts/ProjectContext'

export function Topbar() {
  const { projects, isLoading } = useProjects()
  const { selectedProjectId, setSelectedProjectId } = useProjectSelection()

  useEffect(() => {
    if (isLoading) return
    if (projects.length === 0) return

    const exists = selectedProjectId && projects.some(p => p.id === selectedProjectId)
    if (!exists) {
      setSelectedProjectId(projects[0].id)
    }
  }, [isLoading, projects, selectedProjectId, setSelectedProjectId])

  return (
    <div className="flex items-center justify-between border-b bg-background px-6 py-3">
      <div className="text-sm text-muted-foreground">Proyecto</div>
      <div className="min-w-[240px]">
        <Select
          value={selectedProjectId || undefined}
          onValueChange={(val) => setSelectedProjectId(val)}
          disabled={isLoading || projects.length === 0}
        >
          <SelectTrigger>
            <SelectValue placeholder={isLoading ? 'Cargando...' : 'Seleccionar proyecto'} />
          </SelectTrigger>
          <SelectContent>
            {projects.map(project => (
              <SelectItem key={project.id} value={project.id}>
                {project.nombre}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
