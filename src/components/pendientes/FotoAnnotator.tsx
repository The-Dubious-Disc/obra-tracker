'use client'

import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { ArrowUpRight, Circle, Eraser, Loader2, Pencil, Undo2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { MAX_PENDIENTE_FOTO_BYTES } from '@/lib/pendientes/photos'
import {
  ANNOTATED_FOTO_MAX_EDGE,
  DEFAULT_MARK_COLOR,
  MARK_COLORS,
  annotatedFotoName,
  canCommit,
  drawMarks,
  extendStroke,
  fitImageSize,
  pickJpegBlob,
  pointerToMark,
  undoMarks,
  type MarkStroke,
  type MarkTool,
} from '@/lib/pendientes/annotate'

interface FotoAnnotatorProps {
  src: string
  nombre: string
  onCancel: () => void
  onSave: (file: File) => void
}

const TOOLS: { id: MarkTool; label: string; icon: typeof Pencil }[] = [
  { id: 'pen', label: 'Lápiz', icon: Pencil },
  { id: 'circle', label: 'Círculo', icon: Circle },
  { id: 'arrow', label: 'Flecha', icon: ArrowUpRight },
]

export function FotoAnnotator({ src, nombre, onCancel, onSave }: FotoAnnotatorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const frameRef = useRef<HTMLDivElement>(null)
  const imageRef = useRef<HTMLImageElement | null>(null)
  const marksRef = useRef<MarkStroke[]>([])
  const draftRef = useRef<MarkStroke | null>(null)
  const [tool, setTool] = useState<MarkTool>('pen')
  const [color, setColor] = useState<string>(DEFAULT_MARK_COLOR)
  const [ready, setReady] = useState(false)
  const [markCount, setMarkCount] = useState(0)
  const [applying, setApplying] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const toolRef = useRef(tool)
  const colorRef = useRef(color)
  toolRef.current = tool
  colorRef.current = color

  const fitDisplay = useCallback(() => {
    const canvas = canvasRef.current
    const frame = frameRef.current
    if (!canvas || !frame || canvas.width <= 0 || canvas.height <= 0) return
    const maxWidth = frame.clientWidth
    const maxHeight = Math.min(window.innerHeight * 0.62, 720)
    if (maxWidth <= 0 || maxHeight <= 0) return
    const scale = Math.min(maxWidth / canvas.width, maxHeight / canvas.height, 1)
    canvas.style.width = `${Math.max(1, Math.floor(canvas.width * scale))}px`
    canvas.style.height = `${Math.max(1, Math.floor(canvas.height * scale))}px`
  }, [])

  const redraw = useCallback(() => {
    const canvas = canvasRef.current
    const image = imageRef.current
    if (!canvas || !image) return
    const context = canvas.getContext('2d')
    if (!context) return
    context.clearRect(0, 0, canvas.width, canvas.height)
    context.drawImage(image, 0, 0, canvas.width, canvas.height)
    const visible = draftRef.current ? [...marksRef.current, draftRef.current] : marksRef.current
    drawMarks(context, canvas.width, canvas.height, visible)
  }, [])

  useEffect(() => {
    let cancelled = false
    const image = new Image()
    image.onload = () => {
      if (cancelled) return
      const size = fitImageSize(image.naturalWidth, image.naturalHeight, ANNOTATED_FOTO_MAX_EDGE)
      if (size.width <= 1 && size.height <= 1 && image.naturalWidth <= 0) {
        setError('No se pudo leer la foto')
        return
      }
      imageRef.current = image
      const canvas = canvasRef.current
      if (!canvas) return
      canvas.width = size.width
      canvas.height = size.height
      setReady(true)
      fitDisplay()
      redraw()
    }
    image.onerror = () => {
      if (!cancelled) setError('No se pudo abrir la foto')
    }
    image.src = src
    return () => {
      cancelled = true
    }
  }, [fitDisplay, redraw, src])

  useEffect(() => {
    if (!ready) return undefined
    const id = requestAnimationFrame(() => fitDisplay())
    window.addEventListener('resize', fitDisplay)
    return () => {
      cancelAnimationFrame(id)
      window.removeEventListener('resize', fitDisplay)
    }
  }, [fitDisplay, ready])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        event.stopPropagation()
        onCancel()
      }
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [onCancel])

  const pointFromEvent = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    return pointerToMark(event.clientX, event.clientY, event.currentTarget.getBoundingClientRect())
  }

  const onPointerDown = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!ready || applying) return
    const point = pointFromEvent(event)
    if (!point) return
    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    draftRef.current = { tool: toolRef.current, color: colorRef.current, points: [point] }
    redraw()
  }

  const onPointerMove = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!draftRef.current) return
    const point = pointFromEvent(event)
    if (!point) return
    event.preventDefault()
    draftRef.current = extendStroke(draftRef.current, point)
    redraw()
  }

  const finishStroke = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!draftRef.current) return
    const point = pointFromEvent(event)
    const draft = point ? extendStroke(draftRef.current, point) : draftRef.current
    draftRef.current = null
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    if (canCommit(draft)) {
      marksRef.current = [...marksRef.current, draft]
      setMarkCount(marksRef.current.length)
    }
    redraw()
  }

  const undo = () => {
    marksRef.current = undoMarks(marksRef.current)
    draftRef.current = null
    setMarkCount(marksRef.current.length)
    redraw()
  }

  const clear = () => {
    marksRef.current = []
    draftRef.current = null
    setMarkCount(0)
    redraw()
  }

  const apply = async () => {
    const canvas = canvasRef.current
    if (!canvas || !ready) return
    setApplying(true)
    setError(null)
    try {
      draftRef.current = null
      redraw()
      const blob = await pickJpegBlob(
        (quality) => new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality)),
        MAX_PENDIENTE_FOTO_BYTES,
      )
      onSave(new File([blob], annotatedFotoName(nombre), { type: 'image/jpeg', lastModified: Date.now() }))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar la foto marcada')
      setApplying(false)
    }
  }

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onCancel() }}>
      <DialogContent className="flex max-h-[96dvh] w-[calc(100%-1rem)] max-w-3xl flex-col gap-0 overflow-hidden p-0">
        <div className="border-b px-4 py-3 pr-12">
          <DialogTitle>Marcar {nombre}</DialogTitle>
          <DialogDescription>
            Lápiz, círculo o flecha. Las marcas se fusionan con la imagen y se suben al guardar el pendiente.
          </DialogDescription>
        </div>

        <div ref={frameRef} className="flex min-h-[40dvh] flex-1 items-center justify-center overflow-hidden bg-neutral-950 p-2">
          <canvas
            ref={canvasRef}
            className="touch-none cursor-crosshair"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={finishStroke}
            onPointerCancel={finishStroke}
          />
        </div>

        <div className="space-y-3 border-t px-3 py-3">
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex flex-wrap items-center gap-2">
            {TOOLS.map((item) => {
              const Icon = item.icon
              const selected = tool === item.id
              return (
                <Button
                  key={item.id}
                  type="button"
                  size="sm"
                  variant={selected ? 'default' : 'outline'}
                  aria-pressed={selected}
                  onClick={() => setTool(item.id)}
                  disabled={applying}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Button>
              )
            })}
            <div className="flex items-center gap-1" role="group" aria-label="Color">
              {MARK_COLORS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  aria-label={item.label}
                  aria-pressed={color === item.value}
                  disabled={applying}
                  onClick={() => setColor(item.value)}
                  className={`h-9 w-9 rounded-full border-2 ${color === item.value ? 'border-primary' : 'border-transparent'}`}
                  style={{ backgroundColor: item.value, boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.25)' }}
                />
              ))}
            </div>
            <Button type="button" size="sm" variant="outline" onClick={undo} disabled={!ready || applying || markCount === 0}>
              <Undo2 className="h-4 w-4" />
              Deshacer
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={clear} disabled={!ready || applying || markCount === 0}>
              <Eraser className="h-4 w-4" />
              Borrar
            </Button>
            <Button type="button" size="sm" variant="outline" className="sm:ml-auto" onClick={onCancel} disabled={applying}>
              Cancelar
            </Button>
            <Button type="button" size="sm" onClick={() => void apply()} disabled={!ready || applying || markCount === 0}>
              {applying ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Aplicar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
