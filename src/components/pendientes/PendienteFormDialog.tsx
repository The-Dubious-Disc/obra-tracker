'use client'

import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Calendar, ImagePlus, Loader2, Trash2, Upload, X } from 'lucide-react'
import { useCreatePendiente, useDeletePendienteFoto, useUpdatePendiente } from '@/hooks/useProject'
import {
  MAX_PENDIENTE_FOTO_BYTES,
  MAX_PENDIENTE_FOTOS,
  resolvePendienteImageContentType,
} from '@/lib/pendientes/photos'
import type { PendienteConFotos, PendienteFoto } from '@/types/database.types'

interface PendienteFormDialogProps {
  open: boolean
  mode: 'create' | 'edit'
  projectId: string
  pendiente: PendienteConFotos | null
  onOpenChange: (open: boolean) => void
  onSaved: () => void
  onFotoDeleted: (fotoId: string) => void
}

function toDateInput(value?: string | null) {
  if (!value) return ''
  return /^(\d{4}-\d{2}-\d{2})/.exec(value)?.[1] ?? ''
}

async function prepareImageFile(file: File): Promise<File> {
  const type = resolvePendienteImageContentType(file.name, file.type)
  if (!type) {
    throw new Error(`${file.name} no es una imagen compatible`)
  }
  if (file.size > MAX_PENDIENTE_FOTO_BYTES) {
    throw new Error(`${file.name} supera el límite de 10 MB`)
  }
  if (type === 'image/jpeg' || type === 'image/png' || type === 'image/webp' || type === 'image/gif') {
    return file.type === type ? file : new File([file], file.name, { type })
  }

  const bitmap = await createImageBitmap(file)
  const canvas = document.createElement('canvas')
  const maxEdge = 2000
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height))
  canvas.width = Math.max(1, Math.round(bitmap.width * scale))
  canvas.height = Math.max(1, Math.round(bitmap.height * scale))
  const context = canvas.getContext('2d')
  if (!context) throw new Error(`No se pudo procesar ${file.name}`)
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.85))
  if (!blob) throw new Error(`No se pudo procesar ${file.name}`)
  const name = file.name.replace(/\.[^.]+$/, '') + '.jpg'
  return new File([blob], name, { type: 'image/jpeg' })
}

export function PendienteFormDialog({
  open,
  mode,
  projectId,
  pendiente,
  onOpenChange,
  onSaved,
  onFotoDeleted,
}: PendienteFormDialogProps) {
  const { createPendiente, isCreating, error: createError } = useCreatePendiente()
  const { updatePendiente, isUpdating, error: updateError } = useUpdatePendiente()
  const { deleteFoto, deletingFotoId, error: deleteError } = useDeletePendienteFoto()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const previewsRef = useRef<string[]>([])

  const [titulo, setTitulo] = useState(pendiente?.titulo ?? '')
  const [detalle, setDetalle] = useState(pendiente?.descripcion ?? '')
  const [fechaVencimiento, setFechaVencimiento] = useState(toDateInput(pendiente?.fechaVencimiento))
  const [estado, setEstado] = useState<'pendiente' | 'completado'>(
    pendiente?.estado === 'completado' ? 'completado' : 'pendiente',
  )
  const [files, setFiles] = useState<File[]>([])
  const [previews, setPreviews] = useState<string[]>([])
  const [fileError, setFileError] = useState<string | null>(null)

  useEffect(() => {
    previewsRef.current = previews
  }, [previews])

  useEffect(() => () => {
    previewsRef.current.forEach((url) => URL.revokeObjectURL(url))
  }, [])

  const existingFotos: PendienteFoto[] = pendiente?.fotos ?? []
  const remaining = MAX_PENDIENTE_FOTOS - existingFotos.length - files.length
  const isSaving = isCreating || isUpdating
  const formError = fileError || (mode === 'create' ? createError : updateError) || deleteError

  const handleFilesSelected = async (selected: FileList | null) => {
    if (!selected) return
    setFileError(null)
    const nextFiles: File[] = []
    const nextPreviews: string[] = []

    for (const file of Array.from(selected)) {
      if (existingFotos.length + files.length + nextFiles.length >= MAX_PENDIENTE_FOTOS) {
        setFileError(`Máximo ${MAX_PENDIENTE_FOTOS} fotos por pendiente`)
        break
      }
      try {
        const prepared = await prepareImageFile(file)
        nextFiles.push(prepared)
        nextPreviews.push(URL.createObjectURL(prepared))
      } catch (error) {
        setFileError(error instanceof Error ? error.message : 'No se pudo leer la imagen')
      }
    }

    setFiles((current) => [...current, ...nextFiles])
    setPreviews((current) => [...current, ...nextPreviews])
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const removeNewFile = (index: number) => {
    URL.revokeObjectURL(previews[index])
    setFiles((current) => current.filter((_, i) => i !== index))
    setPreviews((current) => current.filter((_, i) => i !== index))
    setFileError(null)
  }

  const handleDeleteExisting = async (foto: PendienteFoto) => {
    if (!pendiente) return
    if (!confirm('¿Quitar esta foto del pendiente?')) return
    const ok = await deleteFoto(pendiente.id, foto.id)
    if (ok) onFotoDeleted(foto.id)
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!titulo.trim() || !fechaVencimiento) return

    if (mode === 'create') {
      const ok = await createPendiente({
        projectId,
        titulo: titulo.trim(),
        descripcion: detalle.trim() || undefined,
        fechaVencimiento,
        estado,
        files,
      })
      if (!ok) return
    } else if (pendiente) {
      const ok = await updatePendiente(pendiente.id, {
        titulo: titulo.trim(),
        descripcion: detalle.trim() || null,
        fechaVencimiento,
        estado,
      }, {
        projectId,
        files,
      })
      if (!ok) return
    } else {
      return
    }

    onSaved()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={(next) => {
      if (!next && isSaving) return
      onOpenChange(next)
    }}>
      <DialogContent className="w-[calc(100%-1.5rem)] max-w-lg max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? 'Nuevo pendiente' : 'Editar pendiente'}</DialogTitle>
          <DialogDescription>
            Título, detalle y fotos quedan guardados en el proyecto actual.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="pendiente-titulo">Título</Label>
            <Input
              id="pendiente-titulo"
              value={titulo}
              onChange={(event) => setTitulo(event.target.value)}
              placeholder="Ej: Revisar encuentro de losa"
              maxLength={200}
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="pendiente-detalle">Detalle</Label>
            <Textarea
              id="pendiente-detalle"
              value={detalle}
              onChange={(event) => setDetalle(event.target.value)}
              placeholder="Describí qué falta definir o resolver..."
              rows={4}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="pendiente-fecha">Fecha de vencimiento</Label>
              <div className="relative">
                <Calendar className="h-4 w-4 absolute left-3 top-3 text-muted-foreground" />
                <Input
                  id="pendiente-fecha"
                  type="date"
                  value={fechaVencimiento}
                  onChange={(event) => setFechaVencimiento(event.target.value)}
                  className="pl-9"
                  required
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="pendiente-estado">Estado</Label>
              <select
                id="pendiente-estado"
                value={estado}
                onChange={(event) => setEstado(event.target.value as 'pendiente' | 'completado')}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="pendiente">Pendiente</option>
                <option value="completado">Completado</option>
              </select>
            </div>
          </div>

          <div className="grid gap-2">
            <Label>
              Fotos ({existingFotos.length + files.length}/{MAX_PENDIENTE_FOTOS})
            </Label>
            <div
              role="button"
              tabIndex={0}
              className="border-2 border-dashed border-border rounded-lg p-4 text-center cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-colors"
              onClick={() => fileInputRef.current?.click()}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  fileInputRef.current?.click()
                }
              }}
              onDrop={(event) => {
                event.preventDefault()
                void handleFilesSelected(event.dataTransfer.files)
              }}
              onDragOver={(event) => event.preventDefault()}
            >
              <Upload className="h-6 w-6 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">
                Tocá para sacar o elegir fotos
              </p>
              <p className="text-xs text-muted-foreground/80 mt-1">
                JPG, PNG, WebP o GIF · hasta 10 MB · {Math.max(remaining, 0)} disponibles
              </p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif,.heic,.heif"
              className="hidden"
              onChange={(event) => void handleFilesSelected(event.target.files)}
            />

            {(existingFotos.length > 0 || previews.length > 0) && (
              <div className="grid grid-cols-3 gap-2">
                {existingFotos.map((foto) => (
                  <div key={foto.id} className="relative aspect-square rounded-lg overflow-hidden border border-border bg-muted">
                    {foto.downloadUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={foto.downloadUrl} alt={foto.nombre} className="h-full w-full object-cover" />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center text-muted-foreground">
                        <ImagePlus className="h-5 w-5" />
                      </div>
                    )}
                    <button
                      type="button"
                      aria-label={`Quitar ${foto.nombre}`}
                      className="absolute top-1 right-1 h-7 w-7 rounded-full bg-black/70 text-white flex items-center justify-center"
                      onClick={() => void handleDeleteExisting(foto)}
                      disabled={deletingFotoId === foto.id}
                    >
                      {deletingFotoId === foto.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                ))}
                {previews.map((preview, index) => (
                  <div key={preview} className="relative aspect-square rounded-lg overflow-hidden border border-border">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={preview} alt={files[index]?.name || 'Foto nueva'} className="h-full w-full object-cover" />
                    <button
                      type="button"
                      aria-label={`Quitar ${files[index]?.name || 'foto nueva'}`}
                      className="absolute top-1 right-1 h-7 w-7 rounded-full bg-black/70 text-white flex items-center justify-center"
                      onClick={() => removeNewFile(index)}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {formError && <p className="text-sm text-destructive">{formError}</p>}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSaving || !titulo.trim() || !fechaVencimiento}>
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Guardando...
                </>
              ) : mode === 'create' ? 'Crear pendiente' : 'Guardar cambios'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
