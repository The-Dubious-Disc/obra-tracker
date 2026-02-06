// Custom hooks for project data fetching
'use client'

import { useState, useEffect, useCallback } from 'react'
import type { ProjectSummary, Proyecto, PresupuestoVersion } from '@/types/database.types'
import { 
  getProjectSummary, 
  getAllProjects, 
  updateBudget,
  getBudgetHistory,
  createProject
} from '@/lib/services/projectService'

// ============================================
// useProjectSummary - Fetch project with full summary
// ============================================
interface UseProjectSummaryResult {
  data: ProjectSummary | null
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useProjectSummary(projectId: string | null): UseProjectSummaryResult {
  const [data, setData] = useState<ProjectSummary | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    if (!projectId) {
      setData(null)
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const result = await getProjectSummary(projectId)
      if (result) {
        setData(result)
      } else {
        setError('Project not found')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch project')
    } finally {
      setIsLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return { data, isLoading, error, refetch: fetchData }
}

// ============================================
// useProjects - Fetch all projects
// ============================================
interface UseProjectsResult {
  projects: Proyecto[]
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useProjects(): UseProjectsResult {
  const [projects, setProjects] = useState<Proyecto[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const result = await getAllProjects()
      setProjects(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch projects')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return { projects, isLoading, error, refetch: fetchData }
}

// ============================================
// useCreateProject - Create a new project
// ============================================
interface UseCreateProjectResult {
  createNewProject: (nombre: string, moneda: string, montoInicial: number) => Promise<string | null>
  isCreating: boolean
  error: string | null
}

export function useCreateProject(): UseCreateProjectResult {
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const createNewProject = useCallback(
    async (nombre: string, moneda: string, montoInicial: number): Promise<string | null> => {
      setIsCreating(true)
      setError(null)

      try {
        const result = await createProject(nombre, moneda, montoInicial)
        if (!result.success) {
          setError(result.error || 'Create failed')
          return null
        }
        return result.projectId || null
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Create failed')
        return null
      } finally {
        setIsCreating(false)
      }
    },
    []
  )

  return { createNewProject, isCreating, error }
}

// ============================================
// useBudgetUpdate - Update budget with optimistic UI
// ============================================
interface UseBudgetUpdateResult {
  updateProjectBudget: (projectId: string, newAmount: number, note: string) => Promise<boolean>
  isUpdating: boolean
  error: string | null
}

export function useBudgetUpdate(): UseBudgetUpdateResult {
  const [isUpdating, setIsUpdating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const updateProjectBudget = useCallback(
    async (projectId: string, newAmount: number, note: string): Promise<boolean> => {
      setIsUpdating(true)
      setError(null)

      try {
        const result = await updateBudget(projectId, newAmount, note)
        if (!result.success) {
          setError(result.error || 'Update failed')
          return false
        }
        return true
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Update failed')
        return false
      } finally {
        setIsUpdating(false)
      }
    },
    []
  )

  return { updateProjectBudget, isUpdating, error }
}

// ============================================
// useBudgetHistory - Fetch budget version history
// ============================================
interface UseBudgetHistoryResult {
  history: PresupuestoVersion[]
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useBudgetHistory(projectId: string | null): UseBudgetHistoryResult {
  const [history, setHistory] = useState<PresupuestoVersion[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    if (!projectId) {
      setHistory([])
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const result = await getBudgetHistory(projectId)
      setHistory(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch budget history')
    } finally {
      setIsLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return { history, isLoading, error, refetch: fetchData }
}
