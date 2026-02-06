'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useProjectSummary, useProjects, usePayments, useStageTasks } from "@/hooks/useProject";
import type { EtapaConProgreso, UserRole } from '@/types/database.types';
import { AlertCircle, RefreshCw, Plus, FolderOpen, DollarSign, Calendar, ChevronDown, ChevronUp, CheckCircle2, Circle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CreateProjectDialog } from "@/components/CreateProjectDialog";
import { RegisterPaymentDialog } from "@/components/RegisterPaymentDialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useUserRole } from '@/contexts/UserRoleContext';

const DEFAULT_PROJECT_ID = process.env.NEXT_PUBLIC_DEFAULT_PROJECT_ID || null;

function formatCurrency(amount: number, currency: string = 'UYU'): string {
  return new Intl.NumberFormat('es-UY', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('es-UY', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
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

function PaymentSummary({ projectId }: { projectId: string }) {
  const { payments, isLoading } = usePayments(projectId);
  const { role } = useUserRole();

  if (role !== 'admin') return null;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[1, 2].map(i => <Skeleton key={i} className="h-12 w-full" />)}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pagos Recientes</CardTitle>
        <CardDescription>Últimos movimientos registrados</CardDescription>
      </CardHeader>
      <CardContent>
        {payments.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No hay pagos registrados.</p>
        ) : (
          <div className="space-y-4">
            {payments.slice(0, 5).map((payment) => (
              <div key={payment.id} className="flex items-center justify-between border-b pb-2 last:border-0 last:pb-0">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sm">{formatCurrency(Number(payment.monto_pagado), payment.moneda)}</p>
                    <Badge variant="outline" className="text-xs">{payment.estado}</Badge>
                  </div>
                  <div className="flex items-center text-xs text-muted-foreground gap-2">
                    <Calendar className="h-3 w-3" />
                    {formatDate(payment.fecha_pago)}
                  </div>
                </div>
                {payment.comentario && (
                  <p className="text-xs text-muted-foreground max-w-[150px] truncate hidden sm:block">
                    {payment.comentario}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function StageCard({ etapa, moneda }: { etapa: EtapaConProgreso, moneda: string }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const { tasks, isLoading } = useStageTasks(isExpanded ? etapa.id : null);
  const { role } = useUserRole();
  const status = getStatusFromProgress(etapa.porcentajeCompletado);
  const showMoney = role === 'admin';

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
          <div className="space-y-1 flex-1">
            <div className="flex items-center gap-2">
              <p className="font-medium leading-none">{etapa.nombre}</p>
              <Badge 
                variant={
                  status === "Completado" ? "default" : 
                  status === "En Proceso" ? "secondary" : 
                  "outline"
                }
              >
                {status}
              </Badge>
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span>Progreso: {Math.round(etapa.porcentajeCompletado)}%</span>
              <Progress value={etapa.porcentajeCompletado} className="w-24 h-2" />
            </div>
          </div>
          <Button variant="ghost" size="sm">
            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>

        {isExpanded && (
          <div className="mt-4 space-y-4 border-t pt-4">
            {etapa.hito_verificacion && (
               <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-md border border-blue-100 dark:border-blue-900">
                  <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider">Hito de Verificación</span>
                  <p className="text-sm font-medium mt-1">{etapa.hito_verificacion}</p>
               </div>
            )}

            {showMoney && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground">Presupuesto Etapa</span>
                  <p className="text-lg font-semibold">{formatCurrency(Number(etapa.monto_usd), moneda)}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground">Ejecutado</span>
                  <p className={`text-lg font-semibold ${etapa.pagosTotales > Number(etapa.monto_usd) ? 'text-red-500' : 'text-green-600'}`}>
                    {formatCurrency(etapa.pagosTotales, moneda)}
                  </p>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <h4 className="text-sm font-semibold flex items-center gap-2">
                Tareas ({etapa.tareasCompletadas}/{etapa.tareasTotal})
              </h4>
              {isLoading ? (
                <div className="space-y-2">
                   <Skeleton className="h-6 w-full" />
                   <Skeleton className="h-6 w-full" />
                </div>
              ) : tasks.length === 0 ? (
                <p className="text-sm text-muted-foreground italic">No hay tareas registradas.</p>
              ) : (
                <div className="space-y-2">
                  {tasks.map((task) => (
                    <div key={task.id} className="flex items-start gap-2 text-sm">
                      {task.estado === 'completada' ? (
                        <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5" />
                      ) : (
                        <Circle className="h-4 w-4 text-muted-foreground mt-0.5" />
                      )}
                      <span className={task.estado === 'completada' ? 'line-through text-muted-foreground' : ''}>
                        {task.descripcion}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function DashboardContent() {
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(DEFAULT_PROJECT_ID);
  const { data, isLoading, error, refetch } = useProjectSummary(selectedProjectId);
  const { projects, isLoading: projectsLoading, refetch: refetchProjects } = useProjects();
  const { role, setRole } = useUserRole();

  const handleProjectCreated = async (projectId: string) => {
    await refetchProjects();
    setSelectedProjectId(projectId);
  };

  const showMoney = role === 'admin';

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
      {/* Header & Role Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
          <p className="text-muted-foreground">
            Resumen general: <span className="font-medium">{proyecto.nombre}</span>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Role Switcher */}
          <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-lg">
             <Select value={role} onValueChange={(val: string) => setRole(val as UserRole)}>
               <SelectTrigger className="w-[140px] border-0 bg-transparent h-8 focus:ring-0">
                 <SelectValue placeholder="Rol" />
               </SelectTrigger>
               <SelectContent>
                 <SelectItem value="admin">Administrador</SelectItem>
                 <SelectItem value="constructor">Constructor</SelectItem>
                 <SelectItem value="cliente">Cliente</SelectItem>
               </SelectContent>
             </Select>
          </div>

          <Button variant="outline" onClick={() => setSelectedProjectId(null)}>
            Cambiar Proyecto
          </Button>
          
          {showMoney && (
            <RegisterPaymentDialog projectId={proyecto.id} etapas={etapas.map(e => ({ id: e.id, nombre: e.nombre, orden: e.orden }))}>
              <Button className="gap-2">
                <DollarSign className="h-4 w-4" />
                Registrar Pago
              </Button>
            </RegisterPaymentDialog>
          )}

          <CreateProjectDialog onProjectCreated={handleProjectCreated}>
            <Button variant="outline" size="icon">
              <Plus className="h-4 w-4" />
            </Button>
          </CreateProjectDialog>
        </div>
      </div>

      {/* Money Cards (Admin Only) */}
      {showMoney && (
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
      )}

      <div className={`grid gap-4 ${showMoney ? 'md:grid-cols-3' : 'md:grid-cols-1'}`}>
        <div className={`${showMoney ? 'md:col-span-2' : ''} space-y-4`}>
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
                  .map((etapa) => (
                    <StageCard key={etapa.id} etapa={etapa} moneda={moneda} />
                  ))}
              </div>
            )}
          </div>
        </div>

        {showMoney && (
          <div className="md:col-span-1">
            <PaymentSummary projectId={proyecto.id} />
          </div>
        )}
      </div>
    </div>
  );
}

export default function Dashboard() {
  return <DashboardContent />;
}
