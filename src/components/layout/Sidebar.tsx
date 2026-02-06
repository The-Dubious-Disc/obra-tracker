'use client'

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { LayoutDashboard, ListChecks, DraftingCompass, PlusCircle, X } from 'lucide-react'
import { useProjects } from '@/hooks/useProject'
import { useProjectSelection } from '@/contexts/ProjectContext'

interface SidebarProps {
  open?: boolean
  onClose?: () => void
}

export function Sidebar({ open = false, onClose }: SidebarProps) {
  const { projects, isLoading } = useProjects()
  const { selectedProjectId, setSelectedProjectId } = useProjectSelection()

  const content = (
    <div className="w-64 border-r bg-muted/40 h-full p-4 flex flex-col">
      <div className="mb-6 px-2 flex items-center justify-between">
        <h1 className="text-xl font-bold tracking-tight">ObraTracker</h1>
        <Button variant="ghost" size="icon" className="md:hidden" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="space-y-2 px-2 mb-6">
        <div className="text-xs text-muted-foreground">Proyecto</div>
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

      <nav className="space-y-2 flex-1">
        <Button variant="ghost" className="w-full justify-start gap-2" asChild>
          <Link href="/"><LayoutDashboard className="h-4 w-4" />Dashboard</Link>
        </Button>
        <Button variant="ghost" className="w-full justify-start gap-2" asChild>
          <Link href="/builder"><ListChecks className="h-4 w-4" />Tareas</Link>
        </Button>
        <Button variant="ghost" className="w-full justify-start gap-2" asChild>
          <Link href="/planos"><DraftingCompass className="h-4 w-4" />Planos</Link>
        </Button>

        <Separator className="my-3" />

        <Button className="w-full justify-start gap-2" asChild>
          <Link href="/projects/new"><PlusCircle className="h-4 w-4" />Nuevo Proyecto</Link>
        </Button>
      </nav>
      <Separator className="my-4" />
      <div className="px-2">
        <p className="text-sm text-muted-foreground">© 2026 ObraTracker</p>
      </div>
    </div>
  )

  return (
    <>
      <div className="hidden md:block h-screen">{content}</div>
      {open && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/40" onClick={onClose} />
          <div className="h-full">{content}</div>
        </div>
      )}
    </>
  )
}
