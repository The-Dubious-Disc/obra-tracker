'use client'

import { useState, useRef } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { PlusCircle, Upload, X, Loader2, ImageIcon } from 'lucide-react'
import { useCreateReporte } from '@/hooks/useProject'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 MB
const MAX_FILES = 10

interface CreateReportDialogProps {
  projectId: string
  onCreated: () => void
}

export function CreateReportDialog({ projectId, onCreated }: CreateReportDialogProps) {
  const [open, setOpen] = useState(false)
  const [descripcion, setDescripcion] = useState('')
  const [fecha, setFecha] = useState(() => new Date().toISOString().split('T')[0])
  const [files, setFiles] = useState<File[]>([])
  const [previews, setPreviews] = useState<string[]>([])
  const [fileError, setFileError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { createReporte, isCreating, error } = useCreateReporte()

  const handleFilesSelected = (selectedFiles: FileList | null) => {
    if (!selectedFiles) return
    setFileError(null)

    const newFiles: File[] = []
    const newPreviews: string[] = []

    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i]

      if (files.length + newFiles.length >= MAX_FILES) {
        setFileError(`Máximo ${MAX_FILES} imágenes por reporte`)
        break
      }

      if (file.size > MAX_FILE_SIZE) {
        setFileError(`${file.name} supera el límite de 10 MB`)
        continue
      }

      if (!file.type.startsWith('image/')) {
        setFileError(`${file.name} no es una imagen`)
        continue
      }

      newFiles.push(file)
      newPreviews.push(URL.createObjectURL(file))
    }

    setFiles((prev) => [...prev, ...newFiles])
    setPreviews((prev) => [...prev, ...newPreviews])
  }

  const removeFile = (index: number) => {
    URL.revokeObjectURL(previews[index])
    setFiles((prev) => prev.filter((_, i) => i !== index))
    setPreviews((prev) => prev.filter((_, i) => i !== index))
    setFileError(null)
  }

  const handleSubmit = async () => {
    if (!descripcion.trim()) return

    const result = await createReporte({
      projectId,
      descripcion: descripcion.trim(),
      fecha,
      files,
    })

    if (result) {
      // Reset form
      setDescripcion('')
      setFecha(new Date().toISOString().split('T')[0])
      previews.forEach((p) => URL.revokeObjectURL(p))
      setFiles([])
      setPreviews([])
      setFileError(null)
      setOpen(false)
      onCreated()
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    handleFilesSelected(e.dataTransfer.files)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2 btn-industrial-primary">
          <PlusCircle className="h-4 w-4" />
          Nuevo Reporte
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-black uppercase tracking-wide">Nuevo Reporte</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* Date */}
          <div className="space-y-1.5">
            <Label htmlFor="report-date" className="text-xs uppercase font-bold tracking-wider text-muted-foreground">Fecha</Label>
            <Input
              id="report-date"
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="report-desc" className="text-xs uppercase font-bold tracking-wider text-muted-foreground">Descripción</Label>
            <Textarea
              id="report-desc"
              placeholder="Describe el avance, novedades, problemas..."
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              rows={4}
            />
          </div>

          {/* Image Upload */}
          <div className="space-y-1.5">
            <Label className="text-xs uppercase font-bold tracking-wider text-muted-foreground">
              Imágenes ({files.length}/{MAX_FILES})
            </Label>

            {/* Drop zone */}
            <div
              className="border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-colors"
              onClick={() => fileInputRef.current?.click()}
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
            >
              <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">
                Arrastrá imágenes o hacé clic para seleccionar
              </p>
              <p className="text-xs text-muted-foreground/70 mt-1">
                Máximo 10 MB por imagen • JPG, PNG, WebP
              </p>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*"
              className="hidden"
              onChange={(e) => handleFilesSelected(e.target.files)}
            />

            {fileError && (
              <p className="text-xs text-destructive font-medium">{fileError}</p>
            )}

            {/* Previews */}
            {previews.length > 0 && (
              <div className="grid grid-cols-3 gap-2 mt-2">
                {previews.map((preview, index) => (
                  <div key={index} className="relative group aspect-square rounded-lg overflow-hidden border border-border">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={preview}
                      alt={files[index]?.name || 'Preview'}
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => removeFile(index)}
                      className="absolute top-1 right-1 h-5 w-5 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-3 w-3" />
                    </button>
                    <div className="absolute bottom-0 inset-x-0 bg-black/50 px-1 py-0.5">
                      <p className="text-[9px] text-white truncate">{files[index]?.name}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {error && (
            <p className="text-sm text-destructive font-medium">{error}</p>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={isCreating}>
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!descripcion.trim() || isCreating}
              className="btn-industrial-primary gap-2"
            >
              {isCreating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Subiendo...
                </>
              ) : (
                <>
                  <ImageIcon className="h-4 w-4" />
                  Crear Reporte
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
