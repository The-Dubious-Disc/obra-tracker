'use client'

import { useState } from 'react'
import React from 'react'
import { format, parseISO, isValid } from 'date-fns'

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from "@/components/ui/progress";
import { SegmentedProgress } from "@/components/ui/segmented-progress";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useProjectSummary, useProjects, usePayments, useStageTasks, useBudgetUpdate, useBudgetHistory } from "@/hooks/useProject";
import { useProjectSelection } from '@/contexts/ProjectContext';
import type { EtapaConProgreso } from '@/types/database.types';
import { AlertCircle, RefreshCw, Plus, DollarSign, ChevronDown, ChevronUp, CheckCircle2, TrendingUp, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
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

function TechnicalValue({ value, label, unit }: { value: string | number, label?: string, unit?: string }) {
  return (
    <div className="flex flex-col">
      {label && <span className="label-xs leading-none mb-1">{label}</span>}
      <div className="flex items-baseline gap-1">
        <span className="mono-data text-lg font-black leading-none">{value}</span>
        {unit && <span className="text-[11px] font-bold text-muted-foreground uppercase">{unit}</span>}
      </div>
    </div>
  )
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Skeleton className="h-40 md:col-span-2 rounded-xl" />
        <Skeleton className="h-40 rounded-xl" />
        <Skeleton className="h-96 md:col-span-2 rounded-xl" />
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
    <div className="flex flex-col items-center justify-center min-h-[500px] space-y-6 text-center animate-in zoom-in-95 duration-700">
      <div className="relative p-12 glass-card border-primary/20 bg-card/40 backdrop-blur-xl max-w-2xl mx-auto">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent rounded-xl -z-10" />
        <h2 className="text-5xl font-black tracking-tight text-slate-900 dark:text-slate-50 mb-4 bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-500 dark:from-slate-50 dark:to-slate-400">
          Obra Tracker
        </h2>
        <p className="text-muted-foreground text-lg leading-relaxed">
          Tu centro de control de ingeniería avanzado. Selecciona o crea un proyecto en el menú lateral para iniciar la gestión.
        </p>
      </div>
    </div>
  );
}

function PaymentSummary({ 
  projectId, 
  refreshKey, 
  etapas, 
  adicionales = [], 
  onPaymentCreated 
}: { 
  projectId: string; 
  refreshKey: number; 
  etapas: { id: string; nombre: string; orden: number }[]; 
  adicionales?: { id: string; nombre: string }[];
  onPaymentCreated: () => void 
}) {
  const { payments, isLoading, refetch } = usePayments(projectId);

  React.useEffect(() => {
    refetch();
  }, [refreshKey, refetch]);
  
  const { role } = useUserRole();
  if (role !== 'admin') return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <DollarSign className="h-4 w-4 text-primary" />
          <h4 className="label-sm italic">Pagos</h4>
        </div>
        <RegisterPaymentDialog
          projectId={projectId}
          etapas={etapas}
          adicionales={adicionales}
          onPaymentCreated={onPaymentCreated}
        >
          <Button size="icon" variant="ghost" className="h-6 w-6 text-primary hover:text-primary hover:bg-primary/10">
            <Plus className="h-4 w-4" />
          </Button>
        </RegisterPaymentDialog>
      </div>
      
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}
        </div>
      ) : payments.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4 italic border rounded-lg border-dashed">Sin movimientos registrados</p>
      ) : (
        <div className="space-y-2">
          {payments.slice(0, 5).map((payment) => {
            const paymentAny = payment as Record<string, unknown>;
            return (
              <div key={payment.id} className="group p-3 rounded-lg bg-slate-50 dark:bg-slate-900/30 border border-slate-100 dark:border-slate-800 hover:border-primary/30 transition-colors">
                <div className="flex items-center justify-between">
                  <p className="mono-data font-black text-sm text-slate-900 dark:text-slate-100">{formatCurrency(Number(paymentAny.montoPagado || paymentAny.monto_pagado || 0), payment.moneda)}</p>
                  <p className="mono-data text-xs text-muted-foreground">{formatDate(String(paymentAny.fechaPago || paymentAny.fecha_pago || ''))}</p>
                </div>
                {payment.comentario && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-tight">{payment.comentario}</p>
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
          <h4 className="label-sm italic">Presupuesto</h4>
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
          <div className="p-3 rounded-sm bg-primary/5 border border-primary/20 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-1 opacity-20">
              <Wallet className="h-8 w-8 text-primary" />
            </div>
            <p className="label-xs text-primary mb-1">Presupuesto Actual</p>
            <p className="mono-data text-2xl font-black text-slate-900 dark:text-slate-100 leading-none">{formatCurrency(Number(presupuestoActivo.monto), 'USD')}</p>
          </div>
        )}

        {versionsAnteriores.length > 0 && (
          <div className="space-y-1 max-h-[100px] overflow-y-auto pr-2 custom-scrollbar">
            {versionsAnteriores.map((item) => (
              <div key={item.id} className="flex items-center justify-between text-xs py-1.5 border-b border-slate-100 dark:border-slate-800/50 last:border-0 opacity-60 hover:opacity-100 transition-opacity">
                <span className="mono-data font-medium text-slate-600 dark:text-slate-400">{formatCurrency(Number(item.monto), 'USD')}</span>
                <span className="mono-data text-[11px] text-muted-foreground">{formatDate(String(item.fechaCreacion || ''))}</span>
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

  return (
    <div className={`glass-card p-4 md:p-5 transition-all duration-300 relative group ${isExpanded ? 'border-primary/40 bg-card/90' : ''}`}>
      <div className="flex items-center justify-between cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="space-y-2 flex-1">
          <div className="flex items-center gap-3">
             <div className="flex items-center justify-center h-6 w-6 rounded-md bg-slate-100 dark:bg-slate-800 border border-border text-xs font-black text-slate-500 mono-data">
               {String(etapa.orden).padStart(2, '0')}
             </div>
             <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100 tracking-tight">{etapa.nombre}</h4>
          </div>
             <div className="flex items-center justify-between w-full">
                <TechnicalValue 
                  value={`${Math.round((etapa.porcentajeCompletado / 100) * (etapa.duracionEstimadaJornales || 0))} / ${etapa.duracionEstimadaJornales || 0}`}
                  label="Jornales"
                />
                
                <div className="flex items-center gap-3">
                   <div className="w-32">
                      <SegmentedProgress value={etapa.porcentajeCompletado} segments={8} />
                   </div>
                   <TechnicalValue value={Math.round(etapa.porcentajeCompletado)} unit="%" />
                </div>
             </div>
        </div>
        <Button variant="ghost" size="icon" className="h-10 w-10 text-slate-400 group-hover:text-primary transition-colors">
          {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
        </Button>
      </div>

      {isExpanded && (
        <div className="mt-4 space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800/50 animate-in fade-in slide-in-from-top-2">
          {etapa.hitoVerificacion && (
            <div className="bg-primary/5 p-3 rounded-lg border-l-2 border-primary/40">
              <p className="label-xs text-primary mb-1">Hito de Verificación</p>
              <p className="text-xs text-slate-700 dark:text-slate-300 font-semibold italic leading-tight">{etapa.hitoVerificacion}</p>
            </div>
          )}
          
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="label-xs">Registro de Tareas</p>
              <span className="mono-data text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-md">
                {etapa.tareasCompletadas}/{etapa.tareasTotal}
              </span>
            </div>
            {isLoading ? (
               <div className="space-y-1">
                 <Skeleton className="h-8 w-full rounded-sm" />
                 <Skeleton className="h-8 w-full rounded-sm" />
               </div>
            ) : (
              <div className="grid grid-cols-1 gap-1.5">
                {tasks.map(task => (
                  <div key={task.id} className="flex items-center gap-3 p-3 rounded-lg bg-slate-50/50 dark:bg-slate-900/20 border border-transparent hover:border-border transition-all text-sm">
                    {task.estado === 'completada' ? (
                      <div className="h-5 w-5 rounded-md bg-green-500/20 flex items-center justify-center border border-green-500/40">
                        <CheckCircle2 className="h-3 w-3 text-green-500" />
                      </div>
                    ) : (
                      <div className="h-5 w-5 rounded-md border border-slate-300 dark:border-slate-700 flex items-center justify-center">
                        <div className="h-2 w-2 rounded-full bg-slate-200 dark:bg-slate-800" />
                      </div>
                    )}
                    <span className={cn(
                      "font-medium transition-colors",
                      task.estado === 'completada' ? 'line-through text-slate-400' : 'text-slate-600 dark:text-slate-300'
                    )}>
                      {task.descripcion}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {role === 'admin' && (
             <div className="flex justify-between items-center p-3 rounded-lg bg-slate-100 dark:bg-slate-900/50 border border-border/50">
                <TechnicalValue value={formatCurrency(Number(etapa.montoUsd), moneda)} label="Presupuesto" />
                <TechnicalValue value={formatCurrency(etapa.pagosTotales, moneda)} label="Aportado" />
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

  const { proyecto, etapas, adicionales = [], totalPagado, porcentajeAvance, presupuestoActivo, totalJornales, jornalesCompletados, presupuestoTotalCalculado } = data;
  const montoTotal = Number(presupuestoTotalCalculado ?? presupuestoActivo?.monto ?? proyecto.montoTotalActivo ?? proyecto.presupuestoTotalUsd ?? 0);
  const totalPagadoNum = Number(totalPagado ?? 0);
  const pendiente = montoTotal - totalPagadoNum;
  const showMoney = role === 'admin';

  return (
    <div className="space-y-8 p-4 md:p-8 animate-in fade-in duration-700">
      {/* Header Sección */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-border/50 pb-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-primary animate-pulse shadow-[0_0_8px_rgba(249,115,22,0.5)]" />
            <span className="label-xs text-primary">Resumen</span>
          </div>
          <h2 className="text-2xl md:text-4xl font-black text-slate-900 dark:text-slate-50 tracking-tight">
            {proyecto.nombre}
          </h2>
        </div>
        <div className="flex gap-2">
          <Badge variant="outline" className="border-border px-3 py-1.5 font-bold mono-data text-xs tracking-wide bg-card rounded-lg">
            ID: {proyecto.id.slice(0,8)}
          </Badge>
        </div>
      </div>

      {/* Layout: 2 columnas en desktop, 1 en mobile */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Columna Principal Izquierda (2/3) */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Card: Avance General */}
          <div className="glass-card p-8 flex flex-col justify-between relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
              <TrendingUp className="h-32 w-32 text-primary" />
            </div>
            
            <div className="flex justify-between items-start mb-8 relative z-10">
              <div className="space-y-1">
                <h3 className="label-xs mb-4">Avance de Obra</h3>
                <div className="flex items-baseline gap-2">
                  <span className="text-5xl md:text-7xl font-black text-slate-900 dark:text-slate-50 mono-data tracking-tighter">
                    {Math.round(porcentajeAvance)}
                  </span>
                  <span className="text-xl md:text-2xl font-black text-primary mono-data">%</span>
                </div>
              </div>
            </div>
            
            <div className="space-y-6 relative z-10">
               <SegmentedProgress value={porcentajeAvance} segments={20} className="h-3" />
               <div className="flex justify-between items-center bg-slate-100/50 dark:bg-slate-900/50 p-4 rounded-lg border border-border/50">
                  <TechnicalValue 
                    value={`${Math.round(jornalesCompletados)} / ${totalJornales}`} 
                    label="Jornales" 
                     
                  />
                  <div className="h-8 w-[1px] bg-border/50" />
                  <TechnicalValue 
                    value={totalJornales - Math.round(jornalesCompletados)} 
                    label="Restantes" 
                     
                  />
               </div>
            </div>
          </div>

          {/* Listado de Etapas */}
          <div className="space-y-6">
            <div className="flex items-center justify-between px-2">
               <div className="flex items-center gap-3">
                  <div className="h-1 w-8 bg-primary rounded-full shadow-[0_0_8px_rgba(249,115,22,0.4)]" />
                  <h3 className="text-lg md:text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Cronograma de Obra</h3>
               </div>
            </div>
            <div className="space-y-4">
              {etapas.sort((a,b) => a.orden - b.orden).map(etapa => (
                <StageCard key={etapa.id} etapa={etapa} moneda={proyecto.moneda} />
              ))}
            </div>
          </div>
        </div>

        {/* Columna Derecha (1/3) */}
        <div className="lg:col-span-1 space-y-8">
           
           {/* Resumen Financiero */}
           {showMoney ? (
             <div className="glass-card p-6">
               <div className="flex justify-between items-start mb-4">
                 <div>
                   <h3 className="label-xs mb-2">Resumen Financiero</h3>
                   <p className="text-3xl font-black text-slate-900 dark:text-slate-50">{formatCurrency(montoTotal, 'USD')}</p>
                   <p className="text-xs text-muted-foreground mt-1">Presupuesto Total</p>
                 </div>
                 <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                   <DollarSign className="h-5 w-5 text-primary" />
                 </div>
               </div>
               <div className="mt-4 space-y-3">
                 <div className="flex justify-between items-center">
                   <span className="text-sm text-muted-foreground">Aportado</span>
                   <span className="font-bold text-green-600">{formatCurrency(totalPagadoNum, 'USD')}</span>
                 </div>
                 <div className="flex justify-between items-center">
                   <span className="text-sm text-muted-foreground">Pendiente</span>
                   <span className="font-bold text-primary">{formatCurrency(pendiente, 'USD')}</span>
                 </div>
                 <Progress value={(totalPagadoNum / (montoTotal || 1)) * 100} className="h-2 bg-slate-100 dark:bg-slate-800" />
               </div>
             </div>
           ) : null}
           
            {/* Secciones de Soporte (Presupuesto y Pagos) */}
           <div className="space-y-6">
             {showMoney && (
               <div className="glass-card p-6 border-l-2 border-l-primary/30">
                  <BudgetHistoryCard 
                    projectId={proyecto.id} 
                    presupuestoActivo={presupuestoActivo} 
                    onUpdated={() => { refetch(); setPaymentsRefresh(v => v + 1); }} 
                  />
               </div>
             )}
             
             {showMoney && (
                <div className="glass-card p-6 border-l-2 border-l-primary/30">
                   <PaymentSummary 
                     projectId={proyecto.id} 
                     refreshKey={paymentsRefresh}
                     etapas={etapas.map(e => ({ id: e.id, nombre: e.nombre, orden: e.orden }))}
                     adicionales={adicionales.map(a => ({ id: a.id, nombre: a.nombre }))}
                     onPaymentCreated={() => { refetch(); setPaymentsRefresh(v => v + 1); }}
                   />
                </div>
              )}
           </div>
        </div>

      </div>
    </div>
  );
}

export default function Dashboard() {
  return <DashboardContent />;
}
