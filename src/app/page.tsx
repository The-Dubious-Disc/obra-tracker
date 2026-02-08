'use client'

import { useState } from 'react'
import React from 'react'
import { format, parseISO, isValid } from 'date-fns'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useProjectSummary, useProjects, usePayments, useStageTasks, useBudgetUpdate, useBudgetHistory } from "@/hooks/useProject";
import { useProjectSelection } from '@/contexts/ProjectContext';
import type { EtapaConProgreso } from '@/types/database.types';
import { AlertCircle, RefreshCw, Plus, DollarSign, Calendar, ChevronDown, ChevronUp, CheckCircle2, Circle } from "lucide-react";
import { Button } from "@/components/ui/button";
// Wizard replaced inline dialog for project creation
import { RegisterPaymentDialog } from "@/components/RegisterPaymentDialog";
// role selector moved to sidebar
import { useUserRole } from '@/contexts/UserRoleContext';

// Project selection is managed via ProjectContext

function formatCurrency(amount: number, currency: string = 'UYU'): string {
  return new Intl.NumberFormat('es-UY', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(dateString: string): string {
  const date = parseISO(dateString);
  if (!isValid(date)) return 'Fecha inválida';
  return format(date, 'dd/MM/yyyy');
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

function WelcomeScreen() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[500px] space-y-6 text-center">
      <div className="space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Bienvenido a Obra Tracker</h2>
        <p className="text-muted-foreground max-w-lg">
          Parece que aún no tienes proyectos activos. Comienza creando tu primer proyecto para realizar el seguimiento de tus obras.
        </p>
      </div>
      <div className="flex gap-4">
        {/* Creación solo desde Sidebar */}
      </div>
    </div>
  );
}

// Project selection handled via Sidebar

function PaymentSummary({ projectId, refreshKey }: { projectId: string; refreshKey: number }) {
  const { payments, isLoading, refetch } = usePayments(projectId);

  React.useEffect(() => {
    refetch();
  }, [refreshKey, refetch]);
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
            {payments.slice(0, 5).map((payment) => {
              const paymentAny = payment as Record<string, unknown>;
              const monto = Number((paymentAny.montoPagado ?? paymentAny.monto_pagado ?? 0) as number);
              const fecha = String(paymentAny.fechaPago ?? paymentAny.fecha_pago ?? '');
              return (
                <div key={payment.id} className="flex items-center justify-between border-b pb-2 last:border-0 last:pb-0">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm">{formatCurrency(monto, payment.moneda)}</p>
                      <Badge variant="outline" className="text-xs">{payment.estado}</Badge>
                    </div>
                    <div className="flex items-center text-xs text-muted-foreground gap-2">
                      <Calendar className="h-3 w-3" />
                      {formatDate(fecha)}
                    </div>
                  </div>
                  {payment.comentario && (
                    <p className="text-xs text-muted-foreground max-w-[150px] truncate hidden sm:block">
                      {payment.comentario}
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function BudgetHistoryCard({ projectId, onUpdated }: { projectId: string; onUpdated: () => void }) {
  const { history, isLoading, refetch } = useBudgetHistory(projectId);
  const { updateProjectBudget, isUpdating, error } = useBudgetUpdate();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newAmount = parseFloat(amount);
    if (!newAmount || newAmount <= 0) return;

    const ok = await updateProjectBudget(projectId, newAmount, note || 'Nuevo presupuesto');
    if (ok) {
      setOpen(false);
      setAmount('');
      setNote('');
      await refetch();
      onUpdated();
    }
  };

  return (
    <Card>
      <CardHeader className="flex items-center justify-between gap-2 sm:flex-row">
        <div>
          <CardTitle>Presupuestos</CardTitle>
          <CardDescription>Historial de versiones</CardDescription>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              Nuevo presupuesto
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[480px]">
            <DialogHeader>
              <DialogTitle>Nuevo presupuesto</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="budget-amount">Monto (USD)</Label>
                <Input
                  id="budget-amount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="budget-note">Nota del cambio</Label>
                <Textarea
                  id="budget-note"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Ej: Ajuste por cambios de materiales"
                />
              </div>
              {error && (
                <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
                  {error}
                </div>
              )}
              <div className="flex gap-3">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" className="flex-1" disabled={isUpdating}>
                  {isUpdating ? 'Guardando...' : 'Guardar'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
        ) : history.length === 0 ? (
          <p className="text-sm text-muted-foreground">No hay versiones de presupuesto.</p>
        ) : (
          <div className="space-y-3">
            {history.map((item) => {
              const itemAny = item as Record<string, unknown>;
              const monto = Number(itemAny.monto ?? 0);
              const notas = String(itemAny.notasCambio ?? itemAny.notas_cambio ?? '');
              const fecha = String(itemAny.fechaCreacion ?? itemAny.fecha_creacion ?? '');
              return (
                <div key={item.id} className="flex items-center justify-between border-b pb-2 last:border-0">
                  <div>
                    <div className="text-sm font-medium">{formatCurrency(monto, 'USD')}</div>
                    <div className="text-xs text-muted-foreground">{notas}</div>
                  </div>
                  <div className="text-xs text-muted-foreground">{formatDate(fecha)}</div>
                </div>
              )
            })}
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
              <span className="text-xs">
                Jornales: {Math.round((etapa.porcentajeCompletado / 100) * (etapa.duracionEstimadaJornales || 0))} / {etapa.duracionEstimadaJornales || 0}
              </span>
            </div>
          </div>
          <Button variant="ghost" size="sm">
            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>

        {isExpanded && (
          <div className="mt-4 space-y-4 border-t pt-4">
            {etapa.hitoVerificacion && (
               <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-md border border-blue-100 dark:border-blue-900">
                  <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider">Hito de Verificación</span>
                  <p className="text-sm font-medium mt-1">{etapa.hitoVerificacion}</p>
               </div>
            )}

            {showMoney && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground">Presupuesto Etapa</span>
                  <p className="text-lg font-semibold">{formatCurrency(Number(etapa.montoUsd || 0), moneda)}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground">Aportado</span>
                  <p className={`text-lg font-semibold ${etapa.pagosTotales > Number(etapa.montoUsd || 0) ? 'text-red-500' : 'text-green-600'}`}>
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
  const { selectedProjectId } = useProjectSelection();
  const { data, isLoading, error, refetch } = useProjectSummary(selectedProjectId);
  const { projects, isLoading: projectsLoading } = useProjects();
  const { role } = useUserRole();
  const [paymentsRefresh, setPaymentsRefresh] = useState(0);

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
    return <WelcomeScreen />;
  }

  // Has projects but none selected - show prompt
  if (!selectedProjectId || !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center space-y-3">
        <h2 className="text-2xl font-semibold">Selecciona un proyecto</h2>
        <p className="text-muted-foreground">Usa el selector en la barra superior para elegir un proyecto.</p>
      </div>
    );
  }

  // Project selected and data loaded - show dashboard
  const { proyecto, etapas, totalPagado, porcentajeAvance, presupuestoActivo, totalJornales, jornalesCompletados } = data;
  const montoTotal = Number(presupuestoActivo?.monto ?? proyecto.montoTotalActivo ?? proyecto.presupuestoTotalUsd ?? 0);
  const totalPagadoNum = Number(totalPagado ?? 0);
  const pendiente = montoTotal - totalPagadoNum;
  const moneda = proyecto.moneda;

  return (
    <div className="space-y-8">
      {/* Header & Role Switcher */}
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-2">
          <h2 className="text-3xl font-bold">Dashboard</h2>
          <p className="text-muted-foreground">Resumen general: <span className="font-medium">{proyecto.nombre}</span></p>
        </div>
        {showMoney && (
          <RegisterPaymentDialog
            projectId={proyecto.id}
            etapas={etapas.map(e => ({ id: e.id, nombre: e.nombre, orden: e.orden }))}
            onPaymentCreated={() => {
              refetch();
              setPaymentsRefresh((v) => v + 1);
            }}
          >
            <Button className="gap-2">
              <DollarSign className="h-4 w-4" />
              Registrar Pago
            </Button>
          </RegisterPaymentDialog>
        )}
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
              <div className="flex justify-between text-xs text-muted-foreground pt-1">
                <span>Jornales: {Math.round(jornalesCompletados)} / {totalJornales}</span>
                <span>Restantes: {Math.max(0, Math.round(totalJornales - jornalesCompletados))}</span>
              </div>
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
          <div className="md:col-span-1 space-y-4">
            <BudgetHistoryCard projectId={proyecto.id} onUpdated={() => {
              refetch();
              setPaymentsRefresh((v) => v + 1);
            }} />
            <PaymentSummary projectId={proyecto.id} refreshKey={paymentsRefresh} />
          </div>
        )}
      </div>
    </div>
  );
}

export default function Dashboard() {
  return <DashboardContent />;
}
