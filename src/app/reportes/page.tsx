'use client'

import { useState } from 'react'
import { useProjects, useReportes, useReporte, useDeleteReporte } from '@/hooks/useProject'
import { useProjectSelection } from '@/contexts/ProjectContext'
import { CreateReportDialog } from '@/components/reportes/CreateReportDialog'
import { ImageLightbox } from '@/components/reportes/ImageLightbox'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Loader2, Camera, ImageIcon, Calendar, Trash2, FileText } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function ReportesPage() {
  const { projects, isLoading: projectsLoading } = useProjects()
  const { selectedProjectId } = useProjectSelection()
  const activeProjectId = selectedProjectId || (projects.length > 0 ? projects[0].id : null)

  const { reportes, isLoading: reportesLoading, refetch } = useReportes(activeProjectId)
  const [selectedReporteId, setSelectedReporteId] = useState<string | null>(null)
  const { reporte, isLoading: reporteLoading } = useReporte(selectedReporteId)
  const { deleteReporte, isDeleting } = useDeleteReporte()

  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)

  const handleDelete = async () => {
    if (!selectedReporteId) return
    if (!confirm('¿Estás seguro de eliminar este reporte?')) return

    const success = await deleteReporte(selectedReporteId)
    if (success) {
      setSelectedReporteId(null)
      refetch()
    }
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T12:00:00')
    return date.toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })
  }

  if (projectsLoading || reportesLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
        <p className="text-muted-foreground animate-pulse">Cargando reportes...</p>
      </div>
    )
  }

  if (!activeProjectId) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-xl font-semibold">No hay proyectos activos</h2>
        <p className="text-muted-foreground mt-2">Crea un proyecto primero.</p>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6 animate-in fade-in duration-700">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border/50 pb-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-primary animate-pulse shadow-[0_0_8px_rgba(249,115,22,0.5)]" />
            <span className="text-[10px] uppercase font-black text-primary tracking-[0.2em]">Gestión de Obra</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-slate-50 tracking-tighter uppercase italic">
            Reportes
          </h1>
        </div>
        <CreateReportDialog projectId={activeProjectId} onCreated={refetch} />
      </div>

      {/* Empty state */}
      {reportes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <Camera className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">Sin reportes aún</h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-sm">
            Creá tu primer reporte para documentar el avance de la obra con fotos y descripciones.
          </p>
        </div>
      ) : (
        /* Split layout */
        <div className="flex flex-col md:flex-row gap-4 min-h-[60vh]">
          {/* Left panel - Report list */}
          <div className="md:w-1/3 lg:w-[320px] flex-shrink-0 space-y-2 md:overflow-y-auto md:max-h-[calc(100vh-220px)] pr-1">
            {reportes.map((r) => (
              <Card
                key={r.id}
                className={cn(
                  'p-4 cursor-pointer transition-all hover:shadow-md border-l-4',
                  selectedReporteId === r.id
                    ? 'border-l-primary bg-primary/5 shadow-md'
                    : 'border-l-transparent hover:border-l-primary/30'
                )}
                onClick={() => setSelectedReporteId(r.id)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Calendar className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                      <span className="text-xs font-bold text-muted-foreground mono-data tracking-wider">
                        {formatDate(r.fecha)}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-200 line-clamp-2 leading-snug">
                      {r.descripcion}
                    </p>
                  </div>
                  {r.imageCount > 0 && (
                    <Badge variant="secondary" className="flex-shrink-0 gap-1 text-[10px]">
                      <ImageIcon className="h-3 w-3" />
                      {r.imageCount}
                    </Badge>
                  )}
                </div>
              </Card>
            ))}
          </div>

          {/* Right panel - Report detail */}
          <div className="flex-1 md:overflow-y-auto md:max-h-[calc(100vh-220px)]">
            {!selectedReporteId ? (
              <div className="flex flex-col items-center justify-center h-full text-center py-20">
                <FileText className="h-12 w-12 text-muted-foreground/40 mb-3" />
                <p className="text-muted-foreground text-sm">
                  Seleccioná un reporte de la lista para ver sus detalles
                </p>
              </div>
            ) : reporteLoading ? (
              <div className="flex items-center justify-center h-full py-20">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : reporte ? (
              <div className="space-y-6">
                {/* Detail header */}
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-primary" />
                      <span className="text-sm font-black text-primary mono-data tracking-wider uppercase">
                        {formatDate(reporte.fecha)}
                      </span>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground hover:text-destructive gap-1"
                    onClick={handleDelete}
                    disabled={isDeleting}
                  >
                    {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                    Eliminar
                  </Button>
                </div>

                {/* Description */}
                <Card className="p-4">
                  <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                    {reporte.descripcion}
                  </p>
                </Card>

                {/* Image gallery */}
                {reporte.imagenes && reporte.imagenes.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-xs uppercase font-black text-muted-foreground tracking-widest">
                      Imágenes ({reporte.imagenes.length})
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {reporte.imagenes.map((img, index) => (
                        <div
                          key={img.id}
                          className="relative group aspect-[4/3] rounded-lg overflow-hidden border border-border cursor-pointer hover:shadow-lg transition-shadow"
                          onClick={() => setLightboxIndex(index)}
                        >
                          {img.downloadUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={img.downloadUrl}
                              alt={img.nombre}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                          ) : (
                            <div className="w-full h-full bg-muted flex items-center justify-center">
                              <ImageIcon className="h-8 w-8 text-muted-foreground" />
                            </div>
                          )}
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                          <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <p className="text-[10px] text-white truncate">{img.nombre}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {reporte.imagenes && reporte.imagenes.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    Este reporte no tiene imágenes adjuntas.
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* Lightbox */}
      {lightboxIndex !== null && reporte?.imagenes && (
        <ImageLightbox
          images={reporte.imagenes}
          initialIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      )}
    </div>
  )
}
