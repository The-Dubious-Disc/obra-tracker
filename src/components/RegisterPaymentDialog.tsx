import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, DollarSign } from 'lucide-react';
import { useCreatePayment } from '@/hooks/useProject';

interface RegisterPaymentDialogProps {
  projectId: string;
  etapas: Array<{ id: string; nombre: string; orden: number }>;
  children: React.ReactNode;
  onPaymentCreated?: () => void;
}

export function RegisterPaymentDialog({ projectId, etapas, children, onPaymentCreated }: RegisterPaymentDialogProps) {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    montoPagado: '',
    moneda: 'USD',
    fechaPago: new Date().toISOString().split('T')[0],
    comentario: '',
    etapaId: 'none',
  });
  const [comprobanteFile, setComprobanteFile] = useState<File | null>(null);

  const { createPayment, isCreating, error } = useCreatePayment();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const success = await createPayment({
      proyectoId: projectId,
      etapaId: formData.etapaId === 'none' ? null : formData.etapaId,
      montoPagado: parseFloat(formData.montoPagado),
      moneda: formData.moneda,
      fechaPago: formData.fechaPago,
      comentario: formData.comentario,
      comprobanteFile,
    });

    if (success) {
      setOpen(false);
      setFormData({
        montoPagado: '',
        moneda: 'USD',
        fechaPago: new Date().toISOString().split('T')[0],
        comentario: '',
        etapaId: 'none',
      });
      setComprobanteFile(null);
      onPaymentCreated?.();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setComprobanteFile(file);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Registrar Pago
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="monto">Monto</Label>
              <Input
                id="monto"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={formData.montoPagado}
                onChange={(e) => setFormData(prev => ({ ...prev, montoPagado: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="moneda">Moneda</Label>
              <Select value={formData.moneda} onValueChange={(value) => setFormData(prev => ({ ...prev, moneda: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="UYU">UYU</SelectItem>
                  <SelectItem value="EUR">EUR</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="fecha">Fecha de Pago</Label>
            <Input
              id="fecha"
              type="date"
              value={formData.fechaPago}
              onChange={(e) => setFormData(prev => ({ ...prev, fechaPago: e.target.value }))}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="etapa">Etapa (Opcional)</Label>
            <Select value={formData.etapaId} onValueChange={(value) => setFormData(prev => ({ ...prev, etapaId: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar etapa..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sin etapa específica</SelectItem>
                {etapas.map((etapa) => (
                  <SelectItem key={etapa.id} value={etapa.id}>
                    {etapa.orden}. {etapa.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="comentario">Comentario</Label>
            <Textarea
              id="comentario"
              placeholder="Descripción del pago..."
              value={formData.comentario}
              onChange={(e) => setFormData(prev => ({ ...prev, comentario: e.target.value }))}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="comprobante">Comprobante (Opcional)</Label>
            <div className="flex items-center gap-2">
              <Input
                id="comprobante"
                type="file"
                accept="image/*,.pdf"
                onChange={handleFileChange}
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => document.getElementById('comprobante')?.click()}
                className="flex items-center gap-2"
              >
                <Upload className="h-4 w-4" />
                {comprobanteFile ? comprobanteFile.name : 'Seleccionar archivo'}
              </Button>
            </div>
            {comprobanteFile && (
              <p className="text-sm text-muted-foreground">
                Archivo seleccionado: {comprobanteFile.name}
              </p>
            )}
          </div>

          {error && (
            <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} className="flex-1">
              Cancelar
            </Button>
            <Button type="submit" disabled={isCreating} className="flex-1">
              {isCreating ? 'Registrando...' : 'Registrar Pago'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}