import React, { useState } from 'react';
import { format } from 'date-fns';
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
  adicionales?: Array<{ id: string; nombre: string }>;
  children: React.ReactNode;
  onPaymentCreated?: () => void;
}

export function RegisterPaymentDialog({ 
  projectId, 
  etapas, 
  adicionales = [], 
  children, 
  onPaymentCreated 
}: RegisterPaymentDialogProps) {
  const [open, setOpen] = useState(false);
  const [imputationType, setImputationType] = useState<'etapa' | 'adicional'>('etapa');
  const [formData, setFormData] = useState({
    montoPagado: '',
    moneda: 'USD',
    fechaPago: format(new Date(), 'yyyy-MM-dd'),
    comentario: '',
    etapaId: 'none',
    adicionalId: 'none',
  });
  const [comprobanteFile, setComprobanteFile] = useState<File | null>(null);

  const { createPayment, isCreating, error } = useCreatePayment();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const selectedEtapaId = imputationType === 'etapa' && formData.etapaId !== 'none' ? formData.etapaId : null;
    const selectedAdicionalId = imputationType === 'adicional' && formData.adicionalId !== 'none' ? formData.adicionalId : null;

    const success = await createPayment({
      proyectoId: projectId,
      etapaId: selectedEtapaId,
      adicionalId: selectedAdicionalId,
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
        fechaPago: format(new Date(), 'yyyy-MM-dd'),
        comentario: '',
        etapaId: 'none',
        adicionalId: 'none',
      });
      setImputationType('etapa');
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
          <DialogTitle className="flex items-center gap-2 text-xl font-bold uppercase tracking-tight">
            <DollarSign className="h-5 w-5 text-primary" />
            Registrar Pago
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="monto" className="text-xs uppercase font-bold text-muted-foreground">Monto (USD)</Label>
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
              <Label htmlFor="moneda" className="text-xs uppercase font-bold text-muted-foreground">Moneda</Label>
              <Select value={formData.moneda} onValueChange={(value) => setFormData(prev => ({ ...prev, moneda: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="fecha" className="text-xs uppercase font-bold text-muted-foreground">Fecha de Pago</Label>
            <Input
              id="fecha"
              type="date"
              value={formData.fechaPago}
              onChange={(e) => setFormData(prev => ({ ...prev, fechaPago: e.target.value }))}
              required
            />
          </div>

          {/* Imputación del pago */}
          <div className="space-y-2">
            <Label className="text-xs uppercase font-bold text-muted-foreground">Imputar Pago a</Label>
            <Select 
              value={imputationType} 
              onValueChange={(val: 'etapa' | 'adicional') => {
                setImputationType(val);
                setFormData(prev => ({ ...prev, etapaId: 'none', adicionalId: 'none' }));
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="etapa">Etapa</SelectItem>
                <SelectItem value="adicional">Adicional</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Select de Etapas */}
          {imputationType === 'etapa' && (
            <div className="space-y-2 animate-in slide-in-from-top-1 duration-200">
              <Label htmlFor="etapa" className="text-xs uppercase font-bold text-muted-foreground">Seleccionar Etapa</Label>
              <Select value={formData.etapaId} onValueChange={(value) => setFormData(prev => ({ ...prev, etapaId: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar etapa..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Seleccionar etapa...</SelectItem>
                  {etapas.map((etapa) => (
                    <SelectItem key={etapa.id} value={etapa.id}>
                      {etapa.orden}. {etapa.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Select de Adicionales */}
          {imputationType === 'adicional' && (
            <div className="space-y-2 animate-in slide-in-from-top-1 duration-200">
              <Label htmlFor="adicional" className="text-xs uppercase font-bold text-muted-foreground">Seleccionar Item Adicional</Label>
              <Select value={formData.adicionalId} onValueChange={(value) => setFormData(prev => ({ ...prev, adicionalId: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar adicional..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Seleccionar adicional...</SelectItem>
                  {adicionales.map((ad) => (
                    <SelectItem key={ad.id} value={ad.id}>
                      {ad.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="comentario" className="text-xs uppercase font-bold text-muted-foreground">Comentario</Label>
            <Textarea
              id="comentario"
              placeholder="Descripción del pago o justificación..."
              value={formData.comentario}
              onChange={(e) => setFormData(prev => ({ ...prev, comentario: e.target.value }))}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="comprobante" className="text-xs uppercase font-bold text-muted-foreground">Comprobante (Opcional)</Label>
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
              <p className="text-xs text-muted-foreground">
                Archivo seleccionado: {comprobanteFile.name}
              </p>
            )}
          </div>

          {error && (
            <div className="text-xs text-destructive bg-destructive/10 p-3 rounded-md font-bold text-center">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} className="flex-1">
              Cancelar
            </Button>
            <Button type="submit" disabled={isCreating} className="flex-1 btn-industrial-primary">
              {isCreating ? 'Registrando...' : 'Registrar Pago'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}