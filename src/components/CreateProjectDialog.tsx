'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Plus, Loader2 } from 'lucide-react'
import { useCreateProject } from '@/hooks/useProject'

interface CreateProjectDialogProps {
  onProjectCreated?: (projectId: string) => void
  children?: React.ReactNode
}

export function CreateProjectDialog({ onProjectCreated, children }: CreateProjectDialogProps) {
  const [open, setOpen] = useState(false)
  const [nombre, setNombre] = useState('')
  const [moneda, setMoneda] = useState('UYU')
  const [monto, setMonto] = useState('')
  
  const { createNewProject, isCreating, error } = useCreateProject()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const montoNum = parseFloat(monto) || 0
    const projectId = await createNewProject(nombre, moneda, montoNum)
    
    if (projectId) {
      setOpen(false)
      setNombre('')
      setMonto('')
      onProjectCreated?.(projectId)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button size="lg" className="gap-2">
            <Plus className="h-5 w-5" />
            Nuevo Proyecto
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Crear Nuevo Proyecto</DialogTitle>
          <DialogDescription>
            Completa los datos para comenzar a rastrear tu obra.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="nombre">Nombre del Proyecto *</Label>
              <Input
                id="nombre"
                placeholder="Ej: Casa de Playa"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                required
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="moneda">Moneda</Label>
              <Select value={moneda} onValueChange={setMoneda}>
                <SelectTrigger id="moneda">
                  <SelectValue placeholder="Selecciona moneda" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD - Dólar Americano</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="monto">Presupuesto Inicial (opcional)</Label>
              <Input
                id="monto"
                type="number"
                placeholder="0"
                value={monto}
                onChange={(e) => setMonto(e.target.value)}
                min="0"
                step="0.01"
              />
            </div>

            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isCreating || !nombre.trim()}>
              {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Crear Proyecto
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
