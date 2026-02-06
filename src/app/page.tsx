'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useProjectSummary, useProjects } from "@/hooks/useProject";
import { AlertCircle, RefreshCw, Plus, FolderOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CreateProjectDialog } from "@/components/CreateProjectDialog";

const DEFAULT_PROJECT_ID = process.env.NEXT_PUBLIC_DEFAULT_PROJECT_ID || null;

function formatCurrency(amount: number, currency: string = 'UYU'): string {
  return new Intl.NumberFormat('es-UY', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function getStatusFromProgress(progress: number): string {
  if (progress >= 100) return 'Completado';
  if (progress > 0) return 'En Proceso';
  return 'Pendiente';
}

function DashboardSkeleton() {
  return (
    <div className="space-y-8">
      <div>
        <Skeleton className="h-9 w-48 mb-2" />
        <Skeleton className="h-5 w-72" />
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function DashboardError({ error, onRetry }: { error: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
      <AlertCircle className="h-12 w-12 text-destructive" />
      <h2 className="text-xl font-semibold">Error al cargar el proyecto</h2>
      <p className="text-muted-foreground text-center max-w-md">{error}</p>
      <Button onClick={onRetry} variant="outline" className="gap-2">
        <RefreshCw className="h-4 w-4" />
        Reintentar
      </Button>
    </div>
  );
}

function WelcomeScreen({ onProjectCreated }: { onProjectCreated: (id: string) => void }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[500px] space-y-6 text-center">
      <div className="space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Bienvenido a Obra Tracker</h2>
        <p className="text-muted-foreground max-w-lg">
          Parece que aún no tienes proyectos activos. Comienza creando tu primer proyecto para realizar el seguimiento de tus obras.
        </p>
      </div>
      <div className="flex gap-4">
        <CreateProjectDialog onProjectCreated={onProjectCreated}>
          <Button size="lg" className="gap-2">
            <Plus className="h-5 w-5" />
            Nuevo Proyecto
          </Button>
        </CreateProjectDialog>
      </div>
    </div>
  );
}

function ProjectSelector({ projects, onSelect, onProjectCreated }: { 
  projects: Array<{ id: string; nombre: string; moneda: string; monto_total_activo: number }>
  onSelect: (id: string) => void
  onProjectCreated: (id: string) => void
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[500px] space-y-6">
      <div className="space-y-2 text-center">
        <h2 className="text-3xl font-bold tracking-tight">Tus Proyectos</h2>
        <p className="text-muted-foreground">
          Selecciona un proyecto para ver sus detalles o crea uno nuevo.
        </p>
      </div>
      
      <div className="grid gap-4 w-full max-w-2xl">
        {projects.map((project) => (
          <Card 
            key={project.id} 
            className="cursor-pointer hover:border-primary transition-colors"
            onClick={() => onSelect(project.id)}
          >
            <CardContent className="flex items-center justify-between p-6">
              <div className="space-y-1">
                <h3 className="font-semibold text-lg">{project.nombre}</h3>
                <p className="text-sm text-muted-foreground">
                  Presupuesto: {formatCurrency(Number(project.monto_total_activo), project.moneda)}
                </p>
              </div>
              <Button variant="ghost" size="icon">
                <FolderOpen className="h-5 w-5" />
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <CreateProjectDialog onProjectCreated={onProjectCreated}>
        <Button variant="outline" className="gap-2">
          <Plus className="h-4 w-4" />
          Crear Nuevo Proyecto
        </Button>
      </CreateProjectDialog>
    </div>
  );
}

export default function Dashboard() {
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(DEFAULT_PROJECT_ID);
  const { data, isLoading, error, refetch } = useProjectSummary(selectedProjectId);
  const { projects, isLoading: projectsLoading, refetch: refetchProjects } = useProjects();

  const handleProjectCreated = async (projectId: string) => {
    await refetchProjects();
    setSelectedProjectId(projectId);
  };

  // Loading state
  if (isLoading || projectsLoading) {
    return <DashboardSkeleton />;
  }

  // Error state
  if (error) {
    return <DashboardError error={error} onRetry={refetch} />;
  }

  // No projects at all - show welcome screen
  if (projects.length === 0) {
    return <WelcomeScreen onProjectCreated={handleProjectCreated} />;
  }

  // Has projects but none selected - show project selector
  if (!selectedProjectId || !data) {
    return (
      <ProjectSelector 
        projects={projects} 
        onSelect={setSelectedProjectId}
        onProjectCreated={handleProjectCreated}
      />
    );
  }

  // Project selected and data loaded - show dashboard
  const { proyecto, etapas, totalPagado, porcentajeAvance } = data;
  const montoTotal = proyecto.monto_total_activo;
  const pendiente = montoTotal - totalPagado;
  const moneda = proyecto.moneda;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
          <p className="text-muted-foreground">
            Resumen general: <span className="font-medium">{proyecto.nombre}</span>
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setSelectedProjectId(null)}>
            Cambiar Proyecto
          </Button>
          <CreateProjectDialog onProjectCreated={handleProjectCreated}>
            <Button variant="outline" size="icon">
              <Plus className="h-4 w-4" />
            </Button>
          </CreateProjectDialog>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monto Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(montoTotal, moneda)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pagado</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(totalPagado, moneda)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pendiente</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{formatCurrency(pendiente, moneda)}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Avance de Obra</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-between text-sm">
            <span>Progreso General</span>
            <span className="font-bold">{Math.round(porcentajeAvance)}%</span>
          </div>
          <Progress value={porcentajeAvance} className="h-3" />
        </CardContent>
      </Card>

      <div className="space-y-4">
        <h3 className="text-xl font-semibold">Etapas del Proyecto</h3>
        {etapas.length === 0 ? (
          <Card>
            <CardContent className="p-4 text-center text-muted-foreground">
              No hay etapas definidas para este proyecto.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {etapas
              .sort((a, b) => a.orden - b.orden)
              .map((etapa) => {
                const status = getStatusFromProgress(etapa.porcentajeCompletado);
                return (
                  <Card key={etapa.id}>
                    <CardContent className="flex items-center justify-between p-4">
                      <div className="space-y-1">
                        <p className="font-medium leading-none">{etapa.nombre}</p>
                        <p className="text-sm text-muted-foreground">
                          Progreso: {Math.round(etapa.porcentajeCompletado)}%
                          {etapa.tareasTotal > 0 && (
                            <span className="ml-2">
                              ({etapa.tareasCompletadas}/{etapa.tareasTotal} tareas)
                            </span>
                          )}
                        </p>
                      </div>
                      <Badge 
                        variant={
                          status === "Completado" ? "default" : 
                          status === "En Proceso" ? "secondary" : 
                          "outline"
                        }
                      >
                        {status}
                      </Badge>
                    </CardContent>
                  </Card>
                );
              })}
          </div>
        )}
      </div>
    </div>
  );
}
