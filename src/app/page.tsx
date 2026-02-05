'use client'

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useProjectSummary } from "@/hooks/useProject";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

// TODO: Replace with actual project selection logic (e.g., from URL params or context)
const DEMO_PROJECT_ID = process.env.NEXT_PUBLIC_DEFAULT_PROJECT_ID || null;

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

// Loading skeleton component
function DashboardSkeleton() {
  return (
    <div className="space-y-8">
      <div>
        <Skeleton className="h-9 w-48 mb-2" />
        <Skeleton className="h-5 w-72" />
      </div>

      {/* KPIs Skeleton */}
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

      {/* Progress Skeleton */}
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-36" />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-between">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-4 w-12" />
          </div>
          <Skeleton className="h-3 w-full" />
        </CardContent>
      </Card>

      {/* Etapas Skeleton */}
      <div className="space-y-4">
        <Skeleton className="h-7 w-44" />
        <div className="grid gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardContent className="flex items-center justify-between p-4">
                <div className="space-y-2">
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-4 w-24" />
                </div>
                <Skeleton className="h-6 w-20" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

// Error component
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

// No project selected component
function NoProjectSelected() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
      <h2 className="text-xl font-semibold">No hay proyecto seleccionado</h2>
      <p className="text-muted-foreground text-center max-w-md">
        Configura NEXT_PUBLIC_DEFAULT_PROJECT_ID en tu archivo .env.local o selecciona un proyecto.
      </p>
    </div>
  );
}

export default function Dashboard() {
  const { data, isLoading, error, refetch } = useProjectSummary(DEMO_PROJECT_ID);

  // Loading state
  if (isLoading) {
    return <DashboardSkeleton />;
  }

  // Error state
  if (error) {
    return <DashboardError error={error} onRetry={refetch} />;
  }

  // No project selected
  if (!DEMO_PROJECT_ID || !data) {
    return <NoProjectSelected />;
  }

  // Derived values from real data
  const { proyecto, etapas, totalPagado, porcentajeAvance } = data;
  const montoTotal = proyecto.monto_total_activo;
  const pendiente = montoTotal - totalPagado;
  const moneda = proyecto.moneda;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-muted-foreground">
          Resumen general: <span className="font-medium">{proyecto.nombre}</span>
        </p>
      </div>

      {/* KPIs */}
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

      {/* Avance de Obra */}
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

      {/* Lista de Etapas */}
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
