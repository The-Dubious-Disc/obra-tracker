'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Send, X, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

interface Comment {
  id: string;
  anotacionId: string;
  usuarioId: string;
  texto: string;
  createdAt: string;
}

interface AnnotationThreadProps {
  annotationId: string;
  planoId: string;
  initialComment: string;
  status: 'abierta' | 'resuelta';
  onClose: () => void;
  onStatusChange: (newStatus: 'abierta' | 'resuelta') => void;
  onDelete?: () => void;
}

export function AnnotationThread({ 
  annotationId, 
  planoId, 
  initialComment, 
  status, 
  onClose,
  onStatusChange,
  onDelete
}: AnnotationThreadProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const fetchComments = async () => {
      try {
        const res = await fetch(`/api/planos/${planoId}/annotations/${annotationId}/comments`);
        if (res.ok) {
          const data = await res.json();
          setComments(data);
        }
      } catch (error) {
        console.error('Error fetching comments:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchComments();
  }, [annotationId, planoId]);

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    try {
      const res = await fetch(`/api/planos/${planoId}/annotations/${annotationId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          texto: newComment,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setComments([...comments, data]);
        setNewComment('');
      }
    } catch (error) {
      console.error('Error posting comment:', error);
    }
  };

  const toggleStatus = async () => {
    const nextStatus = status === 'abierta' ? 'resuelta' : 'abierta';
    try {
      const res = await fetch(`/api/planos/${planoId}/annotations/${annotationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado: nextStatus }),
      });

      if (res.ok) {
        onStatusChange(nextStatus);
      }
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/planos/${planoId}/annotations/${annotationId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setIsDeleteOpen(false);
        onDelete?.();
      } else {
        const data = await res.json();
        alert(data.error || 'Error al eliminar el hilo');
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al eliminar el hilo');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white border-l shadow-xl w-80">
      <div className="p-4 border-b flex justify-between items-center bg-slate-50">
        <div className="flex flex-col">
          <span className="text-xs font-semibold text-slate-500 uppercase">Hilo de Revisión</span>
          <Badge variant={status === 'resuelta' ? 'default' : 'destructive'} className="w-fit mt-1">
            {status === 'resuelta' ? 'Resuelta' : 'Abierta'}
          </Badge>
        </div>
        <div className="flex gap-1">
          {onDelete && (
            <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive transition-colors">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle className="text-lg font-bold uppercase tracking-tight text-destructive">
                    Eliminar Hilo
                  </DialogTitle>
                </DialogHeader>
                <div className="py-4">
                  <p className="text-sm text-muted-foreground font-semibold">
                    ¿Estás seguro de que deseas eliminar este hilo de revisión? Esta acción eliminará permanentemente la anotación y todos sus comentarios.
                  </p>
                </div>
                <div className="flex justify-end gap-3">
                  <Button type="button" variant="outline" onClick={() => setIsDeleteOpen(false)}>Cancelar</Button>
                  <Button 
                    type="button" 
                    variant="destructive" 
                    onClick={handleDelete} 
                    disabled={deleting}
                  >
                    {deleting ? 'Eliminando...' : 'Eliminar hilo'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex-1 p-4 overflow-y-auto">
        <div className="space-y-4">
          <div className="bg-slate-100 p-3 rounded-lg border">
            <p className="text-sm font-medium text-slate-900">{initialComment}</p>
            <p className="text-[10px] text-slate-500 mt-2">Anotación Original</p>
          </div>

          {comments.map((c) => (
            <div key={c.id} className="border-l-2 border-slate-200 pl-3 py-1">
              <p className="text-sm text-slate-700">{c.texto}</p>
              <p className="text-[10px] text-slate-400 mt-1">
                {new Date(c.createdAt).toLocaleString()}
              </p>
            </div>
          ))}
          {loading && <p className="text-center text-xs text-slate-400">Cargando...</p>}
        </div>
      </div>

      <div className="p-4 border-t bg-slate-50">
        <form onSubmit={handleSubmitComment} className="flex gap-2">
          <Input 
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Responder..."
            className="text-sm"
          />
          <Button type="submit" size="icon" disabled={!newComment.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
        <Button 
          variant="outline" 
          className="w-full mt-2 h-8 text-xs gap-2" 
          onClick={toggleStatus}
        >
          <CheckCircle2 className="h-3 w-3" />
          {status === 'abierta' ? 'Marcar como resuelta' : 'Reabrir anotación'}
        </Button>
      </div>
    </div>
  );
}
