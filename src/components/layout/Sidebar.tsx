'use client'

import Link from "next/link";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { LayoutDashboard, AlertCircle, ClipboardList, DraftingCompass, PlusCircle, Users, X, Camera } from 'lucide-react'
import { useProjects, usePendingCount } from '@/hooks/useProject'
import { useProjectSelection } from '@/contexts/ProjectContext'
// role selector removed

interface SidebarProps {
  open?: boolean
  onClose?: () => void
}

import { usePathname } from 'next/navigation';

export function Sidebar({ open = false, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { projects, isLoading } = useProjects()
  const { selectedProjectId, setSelectedProjectId } = useProjectSelection()
  const pendingCount = usePendingCount(selectedProjectId)

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/login';
  };

  const isActive = (path: string) => pathname === path;

  const content = (
    <div className="w-64 border-r bg-background h-full p-4 flex flex-col shadow-lg md:shadow-none">
      <div className="mb-6 px-2 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 bg-primary rounded-lg flex items-center justify-center shadow-lg shadow-primary/25">
            <DraftingCompass className="h-5 w-5 text-primary-foreground" />
          </div>
          <h1 className="text-xl font-black tracking-tight text-slate-900 dark:text-slate-50">ObraTracker</h1>
        </div>
        <Button variant="ghost" size="icon" className="md:hidden" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <nav className="space-y-2 flex-1">
        <Button 
          variant="ghost" 
          className={cn("w-full justify-start gap-2 h-10", isActive('/') && "bg-primary/10 text-primary font-bold border-l-2 border-primary")} 
          asChild
        >
          <Link href="/"><LayoutDashboard className="h-4 w-4" />Dashboard</Link>
        </Button>
        <Button 
          variant="ghost" 
          className={cn("w-full justify-start gap-2 h-10", isActive('/pendientes') && "bg-primary/10 text-primary font-bold border-l-2 border-primary")} 
          asChild
        >
          <Link href="/pendientes" className="flex items-center w-full">
            <AlertCircle className="h-4 w-4" />
            <span>Pendientes</span>
            {pendingCount > 0 && (
              <span className="ml-auto h-2 w-2 rounded-full bg-primary animate-pulse shadow-[0_0_5px_rgba(249,115,22,0.5)]" />
            )}
          </Link>
        </Button>
        <Button 
          variant="ghost" 
          className={cn("w-full justify-start gap-2 h-10", isActive('/builder') && "bg-primary/10 text-primary font-bold border-l-2 border-primary")} 
          asChild
        >
          <Link href="/builder"><ClipboardList className="h-4 w-4" />Tareas</Link>
        </Button>
        <Button 
          variant="ghost" 
          className={cn("w-full justify-start gap-2 h-10", isActive('/reportes') && "bg-primary/10 text-primary font-bold border-l-2 border-primary")} 
          asChild
        >
          <Link href="/reportes"><Camera className="h-4 w-4" />Reportes</Link>
        </Button>
        <Button 
          variant="ghost" 
          className={cn("w-full justify-start gap-2 h-10", isActive('/planos') && "bg-primary/10 text-primary font-bold border-l-2 border-primary")} 
          asChild
        >
          <Link href="/planos"><DraftingCompass className="h-4 w-4" />Planos</Link>
        </Button>
        {selectedProjectId && (
          <Button 
            variant="ghost" 
            className={cn("w-full justify-start gap-2 h-10", isActive(`/projects/${selectedProjectId}/users`) && "bg-primary/10 text-primary font-bold border-l-2 border-primary")} 
            asChild
          >
            <Link href={`/projects/${selectedProjectId}/users`}><Users className="h-4 w-4" />Equipo</Link>
          </Button>
        )}
      </nav>
      <Separator className="my-4" />

      <div className="space-y-4 px-2">
        <div className="space-y-2">
          <div className="label-sm">Obra</div>
          <Select
            value={selectedProjectId || ""}
            onValueChange={(val) => setSelectedProjectId(val)}
            disabled={isLoading || projects.length === 0}
          >
            <SelectTrigger>
              <SelectValue placeholder={isLoading ? 'Cargando...' : 'Seleccionar obra'} />
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
        
        <Button className="w-full justify-start gap-2 mt-4" asChild>
          <Link href="/projects/new"><PlusCircle className="h-4 w-4" />Nueva Obra</Link>
        </Button>
      </div>

      <Separator className="my-4" />
      <div className="px-2 space-y-2">
        <Button variant="ghost" className="w-full justify-start gap-2 text-muted-foreground hover:text-destructive" onClick={handleLogout}>
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-log-out"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/></svg>
          Cerrar sesión
        </Button>
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
