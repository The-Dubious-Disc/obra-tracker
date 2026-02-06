'use client'

import { createContext, useContext, useEffect, useMemo, useState } from 'react'

const STORAGE_KEY = 'selectedProjectId'

interface ProjectContextValue {
  selectedProjectId: string | null
  setSelectedProjectId: (id: string | null) => void
}

const ProjectContext = createContext<ProjectContextValue | undefined>(undefined)

export function ProjectProvider({ children }: { children: React.ReactNode }) {
  const [selectedProjectId, setSelectedProjectIdState] = useState<string | null>(null)

  useEffect(() => {
    const stored = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null
    if (stored) setSelectedProjectIdState(stored)
  }, [])

  const setSelectedProjectId = (id: string | null) => {
    setSelectedProjectIdState(id)
    if (typeof window === 'undefined') return
    if (id) localStorage.setItem(STORAGE_KEY, id)
    else localStorage.removeItem(STORAGE_KEY)
  }

  const value = useMemo(
    () => ({ selectedProjectId, setSelectedProjectId }),
    [selectedProjectId]
  )

  return <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>
}

export function useProjectSelection() {
  const ctx = useContext(ProjectContext)
  if (!ctx) throw new Error('useProjectSelection must be used within ProjectProvider')
  return ctx
}
