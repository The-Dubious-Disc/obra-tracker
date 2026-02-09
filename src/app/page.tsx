'use client'

import { useState } from 'react'
import React from 'react'
import { format, parseISO, isValid } from 'date-fns'

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
import { AlertCircle, RefreshCw, Plus, DollarSign, Calendar, ChevronDown, ChevronUp, CheckCircle2, Circle, TrendingUp, Clock, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RegisterPaymentDialog } from "@/components/RegisterPaymentDialog";
import { useUserRole } from '@/contexts/UserRoleContext';

function formatCurrency(amount: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
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
    <div className="space-y-8 p-6">
      <div className="flex justify-between items-end">
        <div className="space-y-2">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-4 w-48" />
        </div>
        <Skeleton className="h-10 w-32" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Skeleton className="h-40 md:col-span-2 rounded-xl" />
        <Skeleton className="h-40 rounded-xl" />
        <Skeleton className="h-40 rounded-xl" />
        <Skeleton className="h-96 md:col-span-3 rounded-xl" />
        <Skeleton className="h-96 rounded-xl" />
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
        <h2 className="text-4xl font-bold tracking-tight text-slate-900 dark:text-slate-50">Obra Tracker</h2>
        <p className="text-muted-foreground max-w-lg text-lg">
          Tu centro de control de ingeniería. Crea un proyecto en el menú lateral para comenzar el seguimiento técnico.
        </p>
      </div>
    </div>
  );
}

function PaymentSummary({ projectId, refreshKey }: { projectId: string; refreshKey: number }) {
  const { payments, isLoading, refetch } = usePayments(projectId);

  React.useEffect(() => {
    refetch();
  }, [refreshKey, refetch]);
  
  const { role } = useUserRole();
  if (role !== 'admin') return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <Clock className="h-4 w-4 text-primary" />
        <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Pagos Recientes</h4>
      </div>
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-10 w-full" />)}
        </div>
      ) : payments.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4 italic border rounded-lg border-dashed">Sin movimientos registrados</p>
      ) : (
        <div className="space-y-3">
          {payments.slice(0, 5).map((payment) => {
            const paymentAny = payment as Record<string, unknown>;
            return (
              <div key={payment.id} className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800">
                <div className="space-y-0.5">
                  <p className="font-bold text-sm text-slate-900 dark:text-slate-100">{formatCurrency(Number(paymentAny.montoPagado || paymentAny.monto_pagado || 0), payment.moneda)}</p>
                  <p className="text-[10px] text-muted-foreground flex items-center gap-1 uppercase tracking-tighter">
                    <Calendar className="h-2 w-2" /> {formatDate(String(paymentAny.fechaPago || paymentAny.fecha_pago || ''))}
                  </p>
                </div>
                {payment.comentario && (
                  <Badge variant="outline" className="text-[10px] font-normal max-w-[80px] truncate">
                    {payment.comentario}
                  </Badge>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  );
}

function BudgetHistoryCard({ projectId, presupuestoActivo, onUpdated }: { projectId: string; presupuestoActivo?: { monto: number; id: string; fechaCreacion?: string; fecha_creacion?: string } | null; onUpdated: () => void }) {
  const { history,  refetch } = useBudgetHistory(projectId);
  const { updateProjectBudget, isUpdating,  } = useBudgetUpdate();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newAmount = parseFloat(amount);
    if (!newAmount || newAmount <= 0) return;
    const ok = await updateProjectBudget(projectId, newAmount, note || 'Ajuste de presupuesto');
    if (ok) {
      setOpen(false);
      setAmount('');
      setNote('');
      await refetch();
      onUpdated();
    }
  };

  const versionsAnteriores = history.filter(h => h.id !== presupuestoActivo?.id);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Wallet className="h-4 w-4 text-primary" />
          <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Presupuestos</h4>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="icon" variant="ghost" className="h-6 w-6 text-primary hover:text-primary hover:bg-primary/10">
              <Plus className="h-4 w-4" />
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Actualizar Presupuesto Total</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="budget-amount">Monto (USD)</Label>
                <Input id="budget-amount" type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="budget-note">Motivo del ajuste</Label>
                <Textarea id="budget-note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ej: Ampliación de obra, materiales..." />
              </div>
              <Button type="submit" className="w-full btn-industrial-primary" disabled={isUpdating}>
                {isUpdating ? 'Actualizando...' : 'Guardar Nuevo Presupuesto'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-3">
        {presupuestoActivo && (
          <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
            <p className="text-[10px] uppercase font-bold text-primary mb-1">Presupuesto Actual</p>
            <p className="text-xl font-black text-slate-900 dark:text-slate-100">{formatCurrency(Number(presupuestoActivo.monto), 'USD')}</p>
          </div>
        )}

        {versionsAnteriores.length > 0 && (
          <div className="space-y-2 max-h-[120px] overflow-y-auto pr-2">
            {versionsAnteriores.map((item) => (
              <div key={item.id} className="flex items-center justify-between text-xs py-1 border-b border-slate-100 dark:border-slate-800 last:border-0">
                <span className="font-medium text-slate-600 dark:text-slate-400">{formatCurrency(Number(item.monto), 'USD')}</span>
                <span className="text-[10px] text-muted-foreground">{formatDate(String(item.fechaCreacion || ''))}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StageCard({ etapa, moneda }: { etapa: EtapaConProgreso, moneda: string }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const { tasks, isLoading } = useStageTasks(isExpanded ? etapa.id : null);
  const { role } = useUserRole();
  const status = getStatusFromProgress(etapa.porcentajeCompletado);

  return (
    <div className={`glass-card p-4 transition-all duration-300 ${isExpanded ? 'ring-1 ring-primary/20' : ''}`}>
      <div className="flex items-center justify-between cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="space-y-1.5 flex-1">
          <div className="flex items-center gap-2">
             <span className="text-[10px] font-bold text-slate-400 dark:text-slate-600 tracking-tighter uppercase">Fase {etapa.orden}</span>
             <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100">{etapa.nombre}</h4>
          </div>
          <div className="flex items-center gap-4">
             <div className="flex-1 max-w-[120px]">
                <Progress value={etapa.porcentajeCompletado} className="h-1.5" />
             </div>
             <span className="text-[11px] font-bold text-primary">{Math.round(etapa.porcentajeCompletado)}%</span>
             <Badge variant="outline" className={`text-[9px] uppercase px-1.5 h-4 ${status === 'Completado' ? 'bg-green-500/10 text-green-600 border-green-200' : ''}`}>
                {status}
             </Badge>
          </div>
        </div>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400">
          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </Button>
      </div>

      {isExpanded && (
        <div className="mt-4 space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800 animate-in fade-in slide-in-from-top-2">
          {etapa.hitoVerificacion && (
            <div className="bg-blue-500/5 p-2 rounded-lg border border-blue-500/10">
              <p className="text-[9px] uppercase font-bold text-blue-500 mb-1 tracking-wider">Hito Técnico</p>
              <p className="text-xs text-slate-700 dark:text-slate-300 font-medium">{etapa.hitoVerificacion}</p>
            </div>
          )}
          
          <div className="space-y-2">
            <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Tareas ({etapa.tareasCompletadas}/{etapa.tareasTotal})</p>
            {isLoading ? (
               <Skeleton className="h-12 w-full" />
            ) : (
              <div className="grid grid-cols-1 gap-1">
                {tasks.map(task => (
                  <div key={task.id} className="flex items-center gap-2 p-1.5 rounded-md hover:bg-slate-50 dark:hover:bg-slate-900/50 text-xs">
                    {task.estado === 'completada' ? (
                      <CheckCircle2 className="h-3 w-3 text-green-500" />
                    ) : (
                      <Circle className="h-3 w-3 text-slate-300 dark:text-slate-700" />
                    )}
                    <span className={task.estado === 'completada' ? 'line-through text-slate-400' : 'text-slate-600 dark:text-slate-400'}>{task.descripcion}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {role === 'admin' && (
             <div className="flex justify-between text-[10px] font-mono text-slate-400 pt-2 uppercase">
                <span>Presupuesto: {formatCurrency(Number(etapa.montoUsd), moneda)}</span>
                <span>Aportado: {formatCurrency(etapa.pagosTotales, moneda)}</span>
             </div>
          )}
        </div>
      )}
    </div>
  );
}

function DashboardContent() {
  const { selectedProjectId } = useProjectSelection();
  const { data, isLoading, error, refetch } = useProjectSummary(selectedProjectId);
  const { projects, isLoading: projectsLoading } = useProjects();
  const { role } = useUserRole();
  const [paymentsRefresh, setPaymentsRefresh] = useState(0);

  if (isLoading || projectsLoading) return <DashboardSkeleton />;
  if (error) return <DashboardError error={error} onRetry={refetch} />;
  if (projects.length === 0) return <WelcomeScreen />;

  if (!selectedProjectId || !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center p-6 glass-card mx-6">
        <TrendingUp className="h-12 w-12 text-slate-300 mb-4" />
        <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Selecciona un Proyecto</h2>
        <p className="text-muted-foreground mt-2">Elige una obra en el selector lateral para visualizar los indicadores de ingeniería.</p>
      </div>
    );
  }

  const { proyecto, etapas, totalPagado, porcentajeAvance, presupuestoActivo, totalJornales, jornalesCompletados } = data;
  const montoTotal = Number(presupuestoActivo?.monto ?? proyecto.montoTotalActivo ?? proyecto.presupuestoTotalUsd ?? 0);
  const totalPagadoNum = Number(totalPagado ?? 0);
  const pendiente = montoTotal - totalPagadoNum;
  const showMoney = role === 'admin';

  return (
    <div className="space-y-8 p-4 md:p-8 animate-in fade-in duration-500">
      {/* Header Sección */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-1">
          <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 hover:bg-primary/20 text-[10px] uppercase font-bold tracking-widest">Technical Hub</Badge>
          <h2 className="text-4xl font-black text-slate-900 dark:text-slate-50 tracking-tight">{proyecto.nombre}</h2>
          <p className="text-muted-foreground flex items-center gap-2 text-sm font-medium">
             <Calendar className="h-3.5 w-3.5" /> Registrado el {formatDate(proyecto.createdAt || '')}
          </p>
        </div>
        {showMoney && (
          <RegisterPaymentDialog
            projectId={proyecto.id}
            etapas={etapas.map(e => ({ id: e.id, nombre: e.nombre, orden: e.orden }))}
            onPaymentCreated={() => { refetch(); setPaymentsRefresh(v => v + 1); }}
          >
            <Button className="btn-industrial-primary px-8 h-12 rounded-xl shadow-lg shadow-primary/20 gap-2 text-white">
              <DollarSign className="h-4 w-4" />
              Registrar Aporte
            </Button>
          </RegisterPaymentDialog>
        )}
      </div>

      {/* Real Bento Grid Layout */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        
        {/* Card 1: Avance General (2x1) */}
        <div className="md:col-span-2 glass-card p-6 flex flex-col justify-between border-l-4 border-l-primary">
          <div className="flex justify-between items-start mb-4">
            <div className="space-y-1">
              <h3 className="text-xs uppercase font-black text-muted-foreground tracking-widest">Avance Total de Obra</h3>
              <p className="text-5xl font-black text-slate-900 dark:text-slate-50">{Math.round(porcentajeAvance)}%</p>
            </div>
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <TrendingUp className="h-6 w-6 text-primary" />
            </div>
          </div>
          <div className="space-y-3">
             <Progress value={porcentajeAvance} className="h-2.5 bg-slate-100 dark:bg-slate-800" />
             <div className="flex justify-between text-[11px] font-bold uppercase text-slate-500 tracking-wider">
                <span>{Math.round(jornalesCompletados)} Jornales Ejecutados</span>
                <span className="text-primary">{Math.max(0, Math.round(totalJornales - jornalesCompletados))} Restantes</span>
             </div>
          </div>
        </div>

        {/* Card 2: Monto Total (1x1) - Solo Admin */}
        {showMoney ? (
          <div className="glass-card p-6 flex flex-col justify-between">
            <div className="space-y-1">
               <h3 className="text-xs uppercase font-black text-muted-foreground tracking-widest">Presupuesto USD</h3>
               <p className="text-3xl font-black text-slate-900 dark:text-slate-50">{formatCurrency(montoTotal, 'USD')}</p>
            </div>
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2 text-green-600">
               <CheckCircle2 className="h-4 w-4" />
               <span className="text-[10px] font-bold uppercase">Base de Datos OK</span>
            </div>
          </div>
        ) : (
          <div className="glass-card p-6 flex flex-col justify-center items-center text-center bg-slate-100/30">
             <CheckCircle2 className="h-8 w-8 text-green-500 mb-2" />
             <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Planificación Activa</p>
          </div>
        )}

        {/* Card 3: Saldo Pendiente (1x1) - Solo Admin */}
        {showMoney ? (
          <div className="glass-card p-6 flex flex-col justify-between border-r-4 border-r-primary">
            <div className="space-y-1">
               <h3 className="text-xs uppercase font-black text-muted-foreground tracking-widest">Pendiente Cobro</h3>
               <p className="text-3xl font-black text-primary">{formatCurrency(pendiente, 'USD')}</p>
            </div>
            <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1 overflow-hidden">
               <div className="bg-primary h-full" style={{ width: `${(totalPagadoNum / (montoTotal || 1)) * 100}%` }} />
            </div>
          </div>
        ) : (
          <div className="glass-card p-6 flex flex-col justify-center items-center text-center bg-slate-100/30">
             <Clock className="h-8 w-8 text-blue-500 mb-2" />
             <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Timeline en Curso</p>
          </div>
        )}

        {/* Listado de Etapas (Columna Principal Izquierda - 3 cols en Desktop) */}
        <div className="md:col-span-3 space-y-4">
          <div className="flex items-center gap-2 px-1">
             <div className="h-4 w-1 bg-primary rounded-full" />
             <h3 className="text-lg font-black uppercase tracking-tight text-slate-900 dark:text-slate-100 italic">Desglose de Etapas Técnicas</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {etapas.sort((a,b) => a.orden - b.orden).map(etapa => (
              <StageCard key={etapa.id} etapa={etapa} moneda={proyecto.moneda} />
            ))}
          </div>
        </div>

        {/* Sidebar Derecha - Side Panels (1 col) */}
        <div className="md:col-span-1 space-y-6">
           {showMoney && (
             <>
               <div className="glass-card p-5">
                  <BudgetHistoryCard 
                    projectId={proyecto.id} 
                    presupuestoActivo={presupuestoActivo} 
                    onUpdated={() => { refetch(); setPaymentsRefresh(v => v + 1); }} 
                  />
               </div>
               <div className="glass-card p-5">
                  <PaymentSummary projectId={proyecto.id} refreshKey={paymentsRefresh} />
               </div>
             </>
           )}
           <div className="p-6 bg-slate-900 dark:bg-primary rounded-xl text-white shadow-xl shadow-slate-200 dark:shadow-none">
              <h4 className="text-sm font-bold uppercase tracking-widest opacity-80 mb-2">Technical Support</h4>
              <p className="text-xs font-medium leading-relaxed">Accede a la documentación técnica y planos detallados en el menú lateral para mayor precisión en obra.</p>
              <Button variant="outline" className="w-full mt-4 border-white/30 hover:bg-white/10 text-white text-[10px] uppercase font-bold tracking-widest">
                Ver Guía Técnica
              </Button>
           </div>
        </div>

      </div>
    </div>
  );
}

export default function Dashboard() {
  return <DashboardContent />;
}
