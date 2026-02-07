'use client'

import { createContext, useContext, useMemo, useState } from 'react'

interface ProjectContextValue {
  selectedProjectId: string | null
  setSelectedProjectId: (id: string | null) => void
}

const ProjectContext = createContext<ProjectContextValue | undefined>(undefined)

export function ProjectProvider({ children }: { children: React.ReactNode }) {
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)

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
