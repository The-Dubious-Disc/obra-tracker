'use client';

import React, { useState, useEffect } from 'react';
import PlanViewer from '@/components/blueprints/PlanViewer';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { UploadPlanoDialog } from '@/components/UploadPlanoDialog';
import { Button } from '@/components/ui/button';
import { Plus, FolderOpen } from 'lucide-react';
import { usePlanos } from '@/hooks/useProject';
import { Skeleton } from '@/components/ui/skeleton';
import type { Plano } from '@/types/database.types';

const DEFAULT_PROJECT_ID = process.env.NEXT_PUBLIC_DEFAULT_PROJECT_ID || null;

import { useUserRole } from '@/contexts/UserRoleContext';

export default function PlanosPage() {
  const [selectedPlan, setSelectedPlan] = useState<Plano | null>(null);
  const { role } = useUserRole();
  const canUpload = role === 'admin' || role === 'constructor';
  const projectId = DEFAULT_PROJECT_ID; 
  
  const { planos, isLoading, refetch } = usePlanos(projectId);

  useEffect(() => {
    if (planos.length > 0 && !selectedPlan) {
      setSelectedPlan(planos[0]);
    } else if (planos.length > 0 && selectedPlan) {
       // check if selected plan still exists
       const exists = planos.find(p => p.id === selectedPlan.id);
       if (!exists) setSelectedPlan(planos[0]);
    }
  }, [planos, selectedPlan]);

  if (!projectId) {
     return <div className="p-6">No hay proyecto seleccionado por defecto. Configure NEXT_PUBLIC_DEFAULT_PROJECT_ID.</div>;
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold">Planos Interactivos</h1>
          <p className="text-muted-foreground">Gestión de anotaciones técnicas sobre planos de obra.</p>
        </div>
        {canUpload && (
          <UploadPlanoDialog projectId={projectId} onUploadSuccess={refetch}>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Subir Plano
            </Button>
          </UploadPlanoDialog>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Lista de Planos</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
               {isLoading ? (
                  <div className="p-4 space-y-2">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                  </div>
               ) : planos.length === 0 ? (
                  <div className="p-4 text-center text-muted-foreground text-sm">
                    No hay planos subidos.
                  </div>
               ) : (
                  <div className="flex flex-col">
                    {planos.map((plano) => (
                      <button
                        key={plano.id}
                        onClick={() => setSelectedPlan(plano)}
                        className={`w-full text-left p-4 hover:bg-slate-100 transition-colors border-b last:border-0 ${
                          selectedPlan?.id === plano.id ? 'bg-slate-100 font-semibold border-l-4 border-l-primary' : ''
                        }`}
                      >
                        <div className="font-medium">{plano.nombre}</div>
                        <div className="text-xs text-muted-foreground capitalize">{plano.tipo}</div>
                      </button>
                    ))}
                  </div>
               )}
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-3">
          {selectedPlan ? (
            <Card>
              <CardHeader>
                <CardTitle>{selectedPlan.nombre}</CardTitle>
                <CardDescription>
                  {selectedPlan.descripcion || "Visualización técnica y control de puntos críticos."}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <PlanViewer 
                  planoId={selectedPlan.id} 
                  imageUrl={selectedPlan.url} 
                />
              </CardContent>
            </Card>
          ) : (
             <Card className="h-[500px] flex items-center justify-center text-muted-foreground">
                <div className="text-center space-y-2">
                   <FolderOpen className="h-12 w-12 mx-auto opacity-20" />
                   <p>Selecciona o sube un plano para comenzar</p>
                </div>
             </Card>
          )}
        </div>
      </div>
    </div>
  );
}
