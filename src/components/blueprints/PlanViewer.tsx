'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import type { AnotacionPlano } from '@/types/database.types';

interface PlanViewerProps {
  planoId: string;
  imageUrl: string;
  proyectoId?: string; // Required for saving new annotations
}

export default function PlanViewer({ planoId, imageUrl, proyectoId }: PlanViewerProps) {
  const [pins, setPins] = useState<AnotacionPlano[]>([]);
  const [loading, setLoading] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Initialize supabase client safely to avoid build errors when env vars are missing
  const supabase = useMemo(() => {
    try {
      if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
        return null;
      }
      return createClient();
    } catch (e) {
      return null;
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    
    const fetchPins = async () => {
      if (!supabase) {
        if (isMounted) setLoading(false);
        return;
      }

      setLoading(true);
      // Query by plano_url since that's what identifies the plan
      const { data, error } = await supabase
        .from('anotaciones_planos')
        .select('*')
        .eq('plano_url', imageUrl);

      if (!isMounted) return;
      
      if (error) {
        console.error('Error fetching pins:', error);
      } else {
        setPins(data || []);
      }
      setLoading(false);
    };
    
    fetchPins();
    
    return () => {
      isMounted = false;
    };
  }, [imageUrl, supabase]);

  const handleImageClick = async (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current || !supabase) return;
    
    if (!proyectoId) {
      alert('No hay proyecto asociado para guardar anotaciones');
      return;
    }

    const rect = containerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    const comentario = prompt('Ingrese comentario técnico para este punto:');
    if (!comentario) return;

    // Note: In production, creado_por should be the authenticated user's ID
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      alert('Debes iniciar sesión para agregar anotaciones');
      return;
    }

    const newPin = {
      proyecto_id: proyectoId,
      plano_url: imageUrl,
      coord_x: x,
      coord_y: y,
      comentario,
      creado_por: userData.user.id,
    };

    const { data, error } = await supabase
      .from('anotaciones_planos')
      .insert(newPin)
      .select()
      .single();

    if (error) {
      console.error('Error saving pin:', error);
      alert('Error al guardar la anotación');
    } else if (data) {
      setPins([...pins, data]);
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
            style={{ left: `${pin.coord_x}%`, top: `${pin.coord_y}%` }}
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

        {!supabase && !loading && (
          <div className="absolute top-2 right-2 bg-yellow-100 text-yellow-800 text-[10px] px-2 py-1 rounded border border-yellow-200">
            Mode: Offline (No DB)
          </div>
        )}
      </div>
      <p className="text-sm text-muted-foreground italic">
        * Haz click en cualquier parte del plano para agregar una anotación técnica.
      </p>
    </div>
  );
}
