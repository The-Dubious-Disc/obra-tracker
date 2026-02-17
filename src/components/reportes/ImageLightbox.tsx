'use client'

import { useState } from 'react'
import { X, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ImageLightboxProps {
  images: { downloadUrl?: string | null; nombre: string }[]
  initialIndex: number
  onClose: () => void
}

export function ImageLightbox({ images, initialIndex, onClose }: ImageLightboxProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex)

  const goNext = () => setCurrentIndex((i) => (i + 1) % images.length)
  const goPrev = () => setCurrentIndex((i) => (i - 1 + images.length) % images.length)

  const current = images[currentIndex]

  return (
    <div
      className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
      onClick={onClose}
      onKeyDown={(e) => {
        if (e.key === 'Escape') onClose()
        if (e.key === 'ArrowRight') goNext()
        if (e.key === 'ArrowLeft') goPrev()
      }}
      tabIndex={0}
      role="dialog"
    >
      {/* Close */}
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-4 right-4 text-white hover:bg-white/20 z-10"
        onClick={(e) => { e.stopPropagation(); onClose() }}
      >
        <X className="h-6 w-6" />
      </Button>

      {/* Counter */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 text-white/80 text-sm font-mono z-10">
        {currentIndex + 1} / {images.length}
      </div>

      {/* Previous */}
      {images.length > 1 && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute left-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/20 z-10 h-12 w-12"
          onClick={(e) => { e.stopPropagation(); goPrev() }}
        >
          <ChevronLeft className="h-8 w-8" />
        </Button>
      )}

      {/* Image */}
      <div className="max-w-[90vw] max-h-[90vh] flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
        {current?.downloadUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={current.downloadUrl}
            alt={current.nombre}
            className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl"
          />
        ) : (
          <div className="text-white/60 text-center p-8">
            <p>No se pudo cargar la imagen</p>
            <p className="text-sm mt-1">{current?.nombre}</p>
          </div>
        )}
      </div>

      {/* Next */}
      {images.length > 1 && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/20 z-10 h-12 w-12"
          onClick={(e) => { e.stopPropagation(); goNext() }}
        >
          <ChevronRight className="h-8 w-8" />
        </Button>
      )}

      {/* Caption */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/70 text-xs font-medium max-w-md truncate">
        {current?.nombre}
      </div>
    </div>
  )
}
