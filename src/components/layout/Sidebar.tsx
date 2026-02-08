'use client'

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { LayoutDashboard, ListChecks, DraftingCompass, PlusCircle, Users, X } from 'lucide-react'
import { useProjects, usePendingCount } from '@/hooks/useProject'
import { useProjectSelection } from '@/contexts/ProjectContext'
// role selector removed

interface SidebarProps {
  open?: boolean
  onClose?: () => void
}

export function Sidebar({ open = false, onClose }: SidebarProps) {
  const { projects, isLoading } = useProjects()
  const { selectedProjectId, setSelectedProjectId } = useProjectSelection()
  const pendingCount = usePendingCount(selectedProjectId)

  const content = (
    <div className="w-64 border-r bg-background h-full p-4 flex flex-col shadow-lg md:shadow-none">
      <div className="mb-6 px-2 flex items-center justify-between">
        <div className="flex items-center gap-3"><svg width="24" height="24" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="8" y="20" width="48" height="36" fill="#3B82F6" stroke="#1E40AF" stroke-width="2"/><rect x="12" y="24" width="12" height="12" fill="#60A5FA"/><rect x="28" y="24" width="12" height="12" fill="#60A5FA"/><rect x="44" y="24" width="8" height="12" fill="#60A5FA"/><rect x="12" y="40" width="12" height="8" fill="#93C5FD"/><rect x="28" y="40" width="12" height="8" fill="#93C5FD"/><rect x="44" y="40" width="8" height="8" fill="#93C5FD"/><rect x="12" y="52" width="32" height="4" fill="#E5E7EB" stroke="#9CA3AF" stroke-width="1"/><rect x="12" y="52" width="24" height="4" fill="#10B981"/><line x1="54" y1="8" x2="54" y2="20" stroke="#374151" stroke-width="3"/><circle cx="54" cy="6" r="3" fill="#EF4444"/><line x1="48" y1="8" x2="60" y2="8" stroke="#374151" stroke-width="2"/></svg><h1 className="text-xl font-bold tracking-tight">ObraTracker</h1></div>
        <Button variant="ghost" size="icon" className="md:hidden" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Selectores movidos al final */}

      <nav className="space-y-2 flex-1">
        <Button variant="ghost" className="w-full justify-start gap-2" asChild>
          <Link href="/"><LayoutDashboard className="h-4 w-4" />Dashboard</Link>
        </Button>
        <Button variant="ghost" className="w-full justify-start gap-2" asChild>
          <Link href="/pendientes" className="flex items-center w-full">
            <ListChecks className="h-4 w-4" />
            <span className="ml-2">Pendientes</span>
            {pendingCount > 0 && (
              <span className="ml-auto h-2 w-2 rounded-full bg-red-500" />
            )}
          </Link>
        </Button>
        <Button variant="ghost" className="w-full justify-start gap-2" asChild>
          <Link href="/builder"><ListChecks className="h-4 w-4" />Tareas</Link>
        </Button>
        <Button variant="ghost" className="w-full justify-start gap-2" asChild>
          <Link href="/planos"><DraftingCompass className="h-4 w-4" />Planos</Link>
        </Button>
        {selectedProjectId && (
          <Button variant="ghost" className="w-full justify-start gap-2" asChild>
            <Link href={`/projects/${selectedProjectId}/users`}><Users className="h-4 w-4" />Equipo</Link>
          </Button>
        )}

        <Separator className="my-3" />

        <Button className="w-full justify-start gap-2" asChild>
          <Link href="/projects/new"><PlusCircle className="h-4 w-4" />Nuevo Proyecto</Link>
        </Button>
      </nav>
      <Separator className="my-4" />

      <div className="space-y-4 px-2">
        <div className="space-y-2">
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

        {/* role selector removed */}
      </div>

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
          <div className="fixed inset-0 bg-black/40" onClick={onClose} aria-hidden="true" />
          <div className="relative h-full animate-in slide-in-from-left duration-300">
            {content}
          </div>
        </div>
      )}
    </>
  )
}
