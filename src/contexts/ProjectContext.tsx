'use client'

import { createContext, useContext, useMemo, useState, useEffect } from 'react'

interface ProjectContextValue {
  selectedProjectId: string | null
  setSelectedProjectId: (id: string | null) => void
}

const ProjectContext = createContext<ProjectContextValue | undefined>(undefined)

const STORAGE_KEY = 'obra_tracker_selected_project_id';

export function ProjectProvider({ children }: { children: React.ReactNode }) {
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)
  const [isInitialized, setIsInitialized] = useState(false)

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      setSelectedProjectId(saved)
    }
    setIsInitialized(true)
  }, [])

  // Save to localStorage on change
  const handleSetSelectedProjectId = (id: string | null) => {
    setSelectedProjectId(id)
    if (id) {
      localStorage.setItem(STORAGE_KEY, id)
    } else {
      localStorage.removeItem(STORAGE_KEY)
    }
  }

  const value = useMemo(
    () => ({ 
      selectedProjectId, 
      setSelectedProjectId: handleSetSelectedProjectId,
      isInitialized 
    }),
    [selectedProjectId, isInitialized]
  )

  return <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>
}

export function useProjectSelection() {
  const ctx = useContext(ProjectContext)
  if (!ctx) throw new Error('useProjectSelection must be used within ProjectProvider')
  return ctx
}
