'use client';

/* eslint-disable @next/next/no-img-element */

import React, { useState, useEffect, useRef } from 'react';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { Button } from '@/components/ui/button';
import { Maximize2, Minimize2, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { AnnotationThread } from './AnnotationThread';
import { MessageSquare } from 'lucide-react';

interface Pin {
  id: string;
  coordX: number;
  coordY: number;
  comentario: string;
  estado: 'abierta' | 'resuelta';
}

interface PlanViewerProps {
  planoId: string;
  imageUrl: string;
}

export default function PlanViewer({ planoId, imageUrl }: PlanViewerProps) {
  const [pins, setPins] = useState<Pin[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [selectedPin, setSelectedPin] = useState<Pin | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchPins = async () => {
      if (!planoId) return;
      try {
        const res = await fetch(`/api/planos/${planoId}/annotations`);
        if (res.ok) {
          const data = await res.json();
          setPins(data || []);
        }
      } catch (error) {
        console.error('Error fetching pins:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchPins();
  }, [planoId]);

  const handleImageClick = async (e: React.MouseEvent<HTMLDivElement>) => {
    // Si el clic fue en un pin existente, no crear uno nuevo
    if ((e.target as HTMLElement).closest('.pin-marker')) return;
    
    // Si el hilo está abierto, cerrarlo en lugar de crear un pin
    if (selectedPin) {
      setSelectedPin(null);
      return;
    }

    const rect = e.currentTarget.getBoundingClientRect();
    const coordX = ((e.clientX - rect.left) / rect.width) * 100;
    const coordY = ((e.clientY - rect.top) / rect.height) * 100;

    const comentario = prompt('Ingrese comentario técnico para este punto:');
    if (!comentario) return;

    try {
      const res = await fetch(`/api/planos/${planoId}/annotations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          coord_x: coordX,
          coord_y: coordY,
          comentario,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setPins((prev) => [...prev, data]);
      }
    } catch (error) {
      console.error('Error saving pin:', error);
    }
  };

  const updatePinStatus = (pinId: string, newStatus: 'abierta' | 'resuelta') => {
    setPins(prev => prev.map(p => p.id === pinId ? { ...p, estado: newStatus } : p));
    if (selectedPin?.id === pinId) {
      setSelectedPin({ ...selectedPin, estado: newStatus });
    }
  };

  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
        setIsFullscreen(false);
        return;
      }

      if (containerRef.current?.requestFullscreen) {
        await containerRef.current.requestFullscreen();
        setIsFullscreen(true);
      } else {
        setIsFullscreen((prev) => !prev);
      }
    } catch (error) {
      console.error('Error toggling fullscreen:', error);
      setIsFullscreen((prev) => !prev);
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) {
        setIsFullscreen(false);
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  return (
    <div ref={containerRef} className={`relative flex flex-col gap-4 ${isFullscreen ? 'fixed inset-0 z-50 industrial-slate p-4' : ''}`}>
      <div className="flex justify-between items-center industrial-card p-2 rounded-t-lg border border-b-0">
        <div className="flex gap-2" />
        <div className="flex gap-2 items-center text-xs industrial-blue">
          <span>{pins.length} anotaciones</span>
        </div>
      </div>

      <div className="relative flex flex-1 border rounded-b-lg overflow-hidden bg-slate-100" style={{ height: isFullscreen ? 'calc(100vh - 120px)' : '600px' }}>
        <TransformWrapper
          initialScale={1}
          minScale={0.5}
          maxScale={8}
          centerOnInit
          limitToBounds={false}
        >
          {({ zoomIn, zoomOut, resetTransform }) => (
            <>
              <div className="absolute top-4 left-4 z-10 glass rounded-lg p-2 flex flex-col gap-1 shadow-lg border">
                <Button variant="secondary" className="industrial-accent" size="icon" onClick={() => zoomIn()}><ZoomIn className="h-4 w-4" /></Button>
                <Button variant="secondary" className="industrial-accent" size="icon" onClick={() => zoomOut()}><ZoomOut className="h-4 w-4" /></Button>
                <Button variant="secondary" className="industrial-accent" size="icon" onClick={() => resetTransform()}><RotateCcw className="h-4 w-4" /></Button>
              </div>
              <div className="absolute top-4 right-4 z-10 glass rounded-lg p-2 shadow-lg border">
                <Button
                  variant="secondary" className="industrial-accent"
                  size="icon"
                  onClick={toggleFullscreen}
                  aria-label={isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
                >
                  {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                </Button>
              </div>

              <TransformComponent wrapperStyle={{ width: '100%', height: '100%' }}>
                <div 
                  className="relative cursor-crosshair"
                  onClick={(e) => handleImageClick(e)}
                >
                  <img
                    src={imageUrl}
                    alt="Plano"
                    className="max-w-none block"
                    style={{ height: '560px', width: 'auto' }} // Reference height for coordinates
                  />

                  {pins.map((pin) => (
                    <div
                      key={pin.id}
                      className={`pin-marker absolute w-6 h-6 rounded-full border-2 border-white -translate-x-1/2 -translate-y-1/2 flex items-center justify-center cursor-pointer transition-transform hover:scale-125 z-20 ${
                        pin.estado === 'resuelta' ? 'bg-green-500' : 'bg-red-500'
                      } ${selectedPin?.id === pin.id ? 'ring-4 ring-blue-400' : ''}`}
                      style={{ left: `${pin.coordX}%`, top: `${pin.coordY}%` }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedPin(pin);
                      }}
                    >
                      <MessageSquare className="h-3 w-3 text-white" />
                    </div>
                  ))}
                </div>
              </TransformComponent>
            </>
          )}
        </TransformWrapper>

        {selectedPin && (
          <div className="absolute right-0 top-0 h-full z-30 animate-in slide-in-from-right">
            <AnnotationThread
              annotationId={selectedPin.id}
              planoId={planoId}
              initialComment={selectedPin.comentario}
              status={selectedPin.estado}
              onClose={() => setSelectedPin(null)}
              onStatusChange={(status) => updatePinStatus(selectedPin.id, status)}
            />
          </div>
        )}

        {loading && (
          <div className="absolute inset-0 flex items-center justify-center industrial-slate/50 z-40">
            <span>Cargando plano y anotaciones...</span>
          </div>
        )}
      </div>
      {!isFullscreen && (
        <p className="text-sm industrial-blue italic">
          * Usa la rueda del mouse para hacer zoom y arrastra para navegar. Click para anotar.
        </p>
      )}
    </div>
  );
}
