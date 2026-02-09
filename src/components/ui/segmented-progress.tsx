'use client'

import React from 'react'
import { cn } from "@/lib/utils"

interface SegmentedProgressProps {
  value: number
  segments?: number
  className?: string
}

export function SegmentedProgress({ value, segments = 10, className }: SegmentedProgressProps) {
  const activeSegments = Math.round((value / 100) * segments)
  
  return (
    <div className={cn("flex gap-0.5 h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden", className)}>
      {Array.from({ length: segments }).map((_, i) => (
        <div 
          key={i} 
          className={cn(
            "h-full flex-1 transition-all duration-500",
            i < activeSegments 
              ? "bg-primary shadow-[0_0_8px_rgba(249,115,22,0.3)]" 
              : "bg-transparent"
          )}
        />
      ))}
    </div>
  )
}
