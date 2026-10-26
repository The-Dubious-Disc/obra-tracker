'use client'

import { useMemo, useState, useEffect, useCallback } from 'react'
import { useProjectSelection } from '@/contexts/ProjectContext'
import { usePendientes, useUpdatePendiente, useDeletePendiente } from '@/hooks/useProject'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { FileDown, ImageIcon, Loader2, Pencil, Plus, Trash2 } from 'lucide-react'
import { ImageLightbox } from '@/components/reportes/ImageLightbox'
import { PendienteFormDialog } from '@/components/pendientes/PendienteFormDialog'
import { estadoPendienteLabel } from '@/lib/pendientes/format'
import {
  RESPONSABLE_CONSTRUCTOR,
  RESPONSABLE_SIN_ASIGNAR,
  opcionesResponsable,
  responsableLabel,
  type ResponsableOpcion,
} from '@/lib/pendientes/responsable'
import type { PendienteConFotos, PendienteFoto } from '@/types/database.types'

export default function PendientesPage() {
  const { selectedProjectId, projects } = useProjectSelection()
  const { pendientes, isLoading, error, refetch } = usePendientes(selectedProjectId)
  const { updatePendiente } = useUpdatePendiente()
  const { deletePendiente } = useDeletePendiente()

  const [showCompleted, setShowCompleted] = useState(false)
  const [localPendientes, setLocalPendientes] = useState<PendienteConFotos[]>([])
  const [form, setForm] = useState<{ mode: 'create' | 'edit'; pendiente: PendienteConFotos | null } | null>(null)
  const [lightbox, setLightbox] = useState<{ fotos: PendienteFoto[]; index: number } | null>(null)
  const [isExporting, setIsExporting] = useState(false)
  const [exportError, setExportError] = useState<string | null>(null)
  const [pdfAlcance, setPdfAlcance] = useState<'todos' | 'responsable'>('todos')
  const [pdfResponsable, setPdfResponsable] = useState('')
  const [responsables, setResponsables] = useState<ResponsableOpcion[]>([])

  const projectName = projects.find((project) => project.id === selectedProjectId)?.nombre

  useEffect(() => {
    if (!selectedProjectId) {
      setResponsables([])
      return
    }

    let cancelled = false
    setPdfAlcance('todos')
    setPdfResponsable('')

    async function loadResponsables(projectId: string) {
      try {
        const response = await fetch(`/api/projects/${projectId}/members`)
        if (!response.ok) throw new Error('No se pudieron cargar los responsables')
        const payload = await response.json()
        if (cancelled) return
        setResponsables(opcionesResponsable(Array.isArray(payload) ? payload : []))
      } catch {
        if (!cancelled) setResponsables([])
      }
    }

    void loadResponsables(selectedProjectId)
    return () => {
      cancelled = true
    }
  }, [selectedProjectId])

  useEffect(() => {
    setLocalPendientes(pendientes)
  }, [pendientes])

  useEffect(() => {
    if (!form?.pendiente) return
    const fresh = localPendientes.find((item) => item.id === form.pendiente?.id)
    if (fresh && fresh !== form.pendiente) {
      setForm((current) => current ? { ...current, pendiente: fresh } : current)
    }
  }, [localPendientes, form?.pendiente])

  const filtered = useMemo(() => {
    if (showCompleted) return localPendientes
    return localPendientes.filter((pendiente) => pendiente.estado !== 'completado')
  }, [localPendientes, showCompleted])

  const activos = localPendientes.filter((pendiente) => pendiente.estado !== 'completado').length

  const handleToggle = useCallback(async (pendiente: PendienteConFotos, nextChecked: boolean) => {
    const previous = [...localPendientes]
    const estado = nextChecked ? 'completado' : 'pendiente'
    setLocalPendientes((current) => current.map((item) => (
      item.id === pendiente.id ? { ...item, estado } : item
    )))

    const ok = await updatePendiente(pendiente.id, { estado })
    if (ok) refetch()
    else setLocalPendientes(previous)
  }, [localPendientes, updatePendiente, refetch])

  const handleDelete = useCallback(async (pendienteId: string) => {
    if (!confirm('¿Estás seguro de eliminar este pendiente?')) return
    const previous = [...localPendientes]
    setLocalPendientes((current) => current.filter((item) => item.id !== pendienteId))
    const ok = await deletePendiente(pendienteId)
    if (ok) {
      if (form?.pendiente?.id === pendienteId) setForm(null)
      refetch()
    } else {
      setLocalPendientes(previous)
    }
  }, [localPendientes, deletePendiente, refetch, form?.pendiente?.id])

  const handleFotoDeleted = (fotoId: string) => {
    if (!form?.pendiente) return
    const pendienteId = form.pendiente.id
    setLocalPendientes((current) => current.map((item) => (
      item.id === pendienteId
        ? { ...item, fotos: (item.fotos ?? []).filter((foto) => foto.id !== fotoId) }
        : item
    )))
    refetch()
  }

  const exportPdf = async () => {
    if (!selectedProjectId) return
    if (pdfAlcance === 'responsable' && !pdfResponsable) {
      setExportError('Elegí un responsable para el PDF')
      return
    }
    setIsExporting(true)
    setExportError(null)
    try {
      const params = new URLSearchParams()
      if (pdfAlcance === 'responsable') params.set('responsable', pdfResponsable)
      const query = params.toString()
      const response = await fetch(`/api/projects/${selectedProjectId}/pendientes/pdf${query ? `?${query}` : ''}`)
      if (!response.ok) {
        const payload = await response.json().catch(() => null) as { error?: string } | null
        throw new Error(payload?.error || 'No se pudo exportar el PDF')
      }
      const blob = await response.blob()
      const match = response.headers.get('Content-Disposition')?.match(/filename="([^"]+)"/)
      const filename = match?.[1] || 'pendientes.pdf'
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = filename
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      URL.revokeObjectURL(url)
    } catch (err) {
      setExportError(err instanceof Error ? err.message : 'No se pudo exportar el PDF')
    } finally {
      setIsExporting(false)
    }
  }

  if (!selectedProjectId) {
    return <div className="p-6">Selecciona un proyecto para ver los pendientes.</div>
  }

  return (
    <div className="container mx-auto p-4 sm:p-6 space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">Pendientes</h1>
          <p className="text-muted-foreground">
            {projectName ? projectName : 'Definiciones pendientes del proyecto'}
            {' · '}
            {activos} {activos === 1 ? 'activo' : 'activos'}
          </p>
          <p className="text-xs text-muted-foreground">
            El PDF incluye solo los pendientes abiertos, con título, detalle, responsable y fotos.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
          <label htmlFor="pdf-alcance" className="sr-only">Qué pendientes incluir en el PDF</label>
          <select
            id="pdf-alcance"
            value={pdfAlcance}
            onChange={(event) => setPdfAlcance(event.target.value as 'todos' | 'responsable')}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm sm:w-44"
          >
            <option value="todos">Todos</option>
            <option value="responsable">Por responsable</option>
          </select>
          {pdfAlcance === 'responsable' && (
            <>
              <label htmlFor="pdf-responsable" className="sr-only">Responsable del PDF</label>
              <select
                id="pdf-responsable"
                value={pdfResponsable}
                onChange={(event) => setPdfResponsable(event.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm sm:w-56"
              >
                <option value="">Elegí un responsable</option>
                <option value={RESPONSABLE_CONSTRUCTOR}>Constructor</option>
                {responsables.map((opcion) => (
                  <option key={opcion.usuarioId} value={opcion.usuarioId}>{opcion.label}</option>
                ))}
                <option value={RESPONSABLE_SIN_ASIGNAR}>Sin responsable</option>
              </select>
            </>
          )}
          <Button
            variant="outline"
            className="gap-2"
            onClick={exportPdf}
            disabled={isExporting || (pdfAlcance === 'responsable' && !pdfResponsable)}
          >
            {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
            Exportar PDF
          </Button>
          <Button className="gap-2" onClick={() => setForm({ mode: 'create', pendiente: null })}>
            <Plus className="h-4 w-4" />
            Nuevo pendiente
          </Button>
        </div>
      </div>

      {exportError && <p className="text-sm text-destructive">{exportError}</p>}

      <div className="flex items-center gap-2 px-1">
        <Checkbox
          id="show-completed"
          checked={showCompleted}
          onCheckedChange={(value) => setShowCompleted(Boolean(value))}
        />
        <label htmlFor="show-completed" className="text-sm font-medium cursor-pointer">
          Mostrar completados
        </label>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de pendientes</CardTitle>
          <CardDescription>
            {filtered.length === 0
              ? 'Los más antiguos aparecen primero.'
              : `${filtered.length} en esta vista, del más antiguo al más reciente.`}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <p className="text-sm text-destructive">{error}</p>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No hay pendientes {showCompleted ? '' : 'activos'} para mostrar.
            </p>
          ) : (
            filtered.map((pendiente) => {
              const completed = pendiente.estado === 'completado'
              const fotos = pendiente.fotos ?? []

              return (
                <article
                  key={pendiente.id}
                  className="rounded-lg border p-4 space-y-3"
                >
                  <div className="flex items-start gap-3">
                    <Checkbox
                      checked={completed}
                      aria-label={completed ? 'Marcar como pendiente' : 'Marcar como completado'}
                      className="mt-1"
                      onCheckedChange={(value) => handleToggle(pendiente, Boolean(value))}
                    />
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className={`font-medium ${completed ? 'line-through text-muted-foreground' : ''}`}>
                          {pendiente.titulo}
                        </h2>
                        <Badge variant={completed ? 'outline' : 'secondary'}>
                          {estadoPendienteLabel(pendiente.estado)}
                        </Badge>
                        {fotos.length > 0 && (
                          <Badge variant="outline" className="gap-1">
                            <ImageIcon className="h-3 w-3" />
                            {fotos.length}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Responsable: {responsableLabel(pendiente) ?? 'Sin responsable'}
                      </p>
                      {pendiente.descripcion ? (
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">{pendiente.descripcion}</p>
                      ) : (
                        <p className="text-sm text-muted-foreground/70">Sin detalle</p>
                      )}
                    </div>
                  </div>

                  {fotos.length > 0 && (
                    <div className="flex gap-2 overflow-x-auto pb-1 pl-7">
                      {fotos.map((foto, index) => (
                        <button
                          key={foto.id}
                          type="button"
                          className="h-16 w-16 shrink-0 overflow-hidden rounded-md border bg-muted"
                          onClick={() => setLightbox({ fotos, index })}
                        >
                          {foto.downloadUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={foto.downloadUrl} alt={foto.nombre} className="h-full w-full object-cover" />
                          ) : (
                            <span className="flex h-full w-full items-center justify-center text-muted-foreground">
                              <ImageIcon className="h-4 w-4" />
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}

                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="gap-1"
                      onClick={() => setForm({ mode: 'edit', pendiente })}
                    >
                      <Pencil className="h-4 w-4" />
                      Editar
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="gap-1 text-muted-foreground hover:text-destructive"
                      onClick={() => handleDelete(pendiente.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                      Eliminar
                    </Button>
                  </div>
                </article>
              )
            })
          )}
        </CardContent>
      </Card>

      {form && selectedProjectId && (
        <PendienteFormDialog
          key={`${form.mode}-${form.pendiente?.id ?? 'nuevo'}`}
          open
          mode={form.mode}
          projectId={selectedProjectId}
          pendiente={form.pendiente}
          responsables={responsables}
          onOpenChange={(open) => {
            if (!open) setForm(null)
          }}
          onSaved={() => {
            setForm(null)
            refetch()
          }}
          onFotoDeleted={handleFotoDeleted}
        />
      )}

      {lightbox && (
        <ImageLightbox
          images={lightbox.fotos}
          initialIndex={lightbox.index}
          onClose={() => setLightbox(null)}
        />
      )}
    </div>
  )
}
