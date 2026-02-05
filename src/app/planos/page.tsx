'use client';

import React, { useState } from 'react';
import PlanViewer from '@/components/blueprints/PlanViewer';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

const PLANOS_MOCK = [
  { id: 'p1', nombre: 'Planta Baja - Estructura', url: 'https://placehold.co/1200x800/2563eb/white?text=Plano+Planta+Baja' },
  { id: 'p2', nombre: 'Primer Piso - Instalaciones', url: 'https://placehold.co/1200x800/059669/white?text=Plano+Instalaciones' },
];

export default function PlanosPage() {
  const [selectedPlan, setSelectedPlan] = useState(PLANOS_MOCK[0]);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold">Planos Interactivos</h1>
        <p className="text-muted-foreground">Gestión de anotaciones técnicas sobre planos de obra.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Lista de Planos</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="flex flex-col">
                {PLANOS_MOCK.map((plano) => (
                  <button
                    key={plano.id}
                    onClick={() => setSelectedPlan(plano)}
                    className={`w-full text-left p-4 hover:bg-slate-100 transition-colors border-b last:border-0 ${
                      selectedPlan.id === plano.id ? 'bg-slate-100 font-semibold border-l-4 border-l-blue-600' : ''
                    }`}
                  >
                    {plano.nombre}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-3">
          <Card>
            <CardHeader>
              <CardTitle>{selectedPlan.nombre}</CardTitle>
              <CardDescription>
                Visualización técnica y control de puntos críticos.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PlanViewer 
                planoId={selectedPlan.id} 
                imageUrl={selectedPlan.url} 
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
