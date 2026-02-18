'use client'

import { createContext, useContext, useMemo, useState, useEffect, useCallback } from 'react'
import { usePathname } from 'next/navigation'
import { Proyecto } from '@/types/database.types'

const PUBLIC_ROUTES = ['/login', '/register', '/recover-password', '/reset-password']
const PUBLIC_PREFIXES = ['/invitations']

interface ProjectContextValue {
  selectedProjectId: string | null
  setSelectedProjectId: (id: string | null) => void
  projects: Proyecto[]
  isLoading: boolean
  isInitialized: boolean
  error: string | null
  refreshProjects: () => Promise<void>
}

const ProjectContext = createContext<ProjectContextValue | undefined>(undefined)

const STORAGE_KEY = 'obra_tracker_selected_project_id';

export function ProjectProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)
  const [projects, setProjects] = useState<Proyecto[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isInitialized, setIsInitialized] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Initialization: fetch projects and validate stored ID
  const initialize = useCallback(async () => {
    // If we are on a public route, don't fetch projects
    if (PUBLIC_ROUTES.includes(pathname) || PUBLIC_PREFIXES.some(p => pathname.startsWith(p))) {
       setIsInitialized(true)
       setIsLoading(false)
       return
    }

    setIsLoading(true)
    setError(null)
    
    try {
      const res = await fetch('/api/projects')
      
      if (!res.ok) {
        if (res.status === 401) {
          // Not logged in, exit initialization
          setProjects([])
          setIsInitialized(true)
          setIsLoading(false)
          return
        }
        throw new Error('Failed to fetch projects')
      }

      const data: Proyecto[] = await res.json()

      setProjects(data)

      const saved = localStorage.getItem(STORAGE_KEY)
      
      if (saved && data.find(p => p.id === saved)) {
        // Stored project is valid
        setSelectedProjectId(saved)
      } else if (data.length > 0) {
        // Fallback to first available project
        setSelectedProjectId(data[0].id)
        localStorage.setItem(STORAGE_KEY, data[0].id)
      } else {
        // No projects available
        setSelectedProjectId(null)
        localStorage.removeItem(STORAGE_KEY)
      }
    } catch (err) {
      console.error('Error initializing project context:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setIsInitialized(true)
      setIsLoading(false)
    }
  }, [pathname])

  useEffect(() => {
    initialize()
  }, [initialize]) 

  // Handle manual selection
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
      projects,
      isLoading,
      isInitialized,
      error,
      refreshProjects: initialize
    }),
    [selectedProjectId, projects, isLoading, isInitialized, error, initialize]
  )

  return <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>
}

export function useProjectSelection() {
  const ctx = useContext(ProjectContext)
  if (!ctx) throw new Error('useProjectSelection must be used within ProjectProvider')
  return ctx
}
