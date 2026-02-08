'use client';

import React, { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import type { AnotacionPlano } from '@/types/database.types';

interface PlanViewerProps {
  planoId: string;
  imageUrl: string;
}

export default function PlanViewer({ planoId, imageUrl }: PlanViewerProps) {
  const [pins, setPins] = useState<AnotacionPlano[]>([]);
  const [loading, setLoading] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let isMounted = true;

    const fetchPins = async () => {
      if (!planoId) {
        if (isMounted) setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const res = await fetch(`/api/planos/${planoId}/annotations`);
        if (!res.ok) throw new Error('Failed to fetch annotations');
        const data = await res.json();
        if (isMounted) setPins(data || []);
      } catch (error) {
        console.error('Error fetching pins:', error);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchPins();

    return () => {
      isMounted = false;
    };
  }, [planoId]);

  const handleImageClick = async (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;

    if (!planoId) {
      alert('No hay plano asociado para guardar anotaciones');
      return;
    }

    const rect = containerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    const comentario = prompt('Ingrese comentario técnico para este punto:');
    if (!comentario) return;

    try {
      const res = await fetch(`/api/planos/${planoId}/annotations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          coord_x: x,
          coord_y: y,
          comentario,
        }),
      });

      if (!res.ok) throw new Error('Failed to save annotation');
      const data = await res.json();
      if (data) setPins((prev) => [...prev, data]);
    } catch (error) {
      console.error('Error saving pin:', error);
      alert('Error al guardar la anotación');
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div
        ref={containerRef}
        className="relative border rounded-lg overflow-hidden cursor-crosshair bg-slate-100"
        onClick={handleImageClick}
        style={{ width: '100%', aspectRatio: '16/9' }}
      >
        <Image
          src={imageUrl}
          alt="Plano"
          fill
          className="object-contain pointer-events-none"
          unoptimized
        />

        {!loading && pins.map((pin) => (
          <div
            key={pin.id}
            className="absolute w-4 h-4 bg-red-500 rounded-full border-2 border-white -translate-x-1/2 -translate-y-1/2 group"
            style={{ left: `${pin.coordX}%`, top: `${pin.coordY}%` }}
          >
            <div className="hidden group-hover:block absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-black text-white text-xs rounded shadow-lg z-10">
              {pin.comentario}
            </div>
          </div>
        ))}

        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/50">
            <span>Cargando anotaciones...</span>
          </div>
        )}
      </div>
      <p className="text-sm text-muted-foreground italic">
        * Haz click en cualquier parte del plano para agregar una anotación técnica.
      </p>
    </div>
  );
}
