// Custom hooks for project data fetching
'use client'

import { useState, useEffect, useCallback } from 'react'
import type { ProjectSummary, Proyecto, PresupuestoVersion, Pago, Plano, Tarea, Pendiente } from '@/types/database.types'

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function isNetworkFetchError(error: unknown) {
  if (!(error instanceof Error)) return false
  const message = error.message.toLowerCase()
  return (
    error.name === 'TypeError' ||
    message.includes('failed to fetch') ||
    message.includes('fetch failed') ||
    message.includes('networkerror')
  )
}

async function tryParseJson(response: Response) {
  try {
    return await response.json()
  } catch {
    return null
  }
}

async function fetchWithRetry(input: RequestInfo | URL, init?: RequestInit, options?: { retries?: number; retryDelayMs?: number }) {
  const retries = options?.retries ?? 2
  const retryDelayMs = options?.retryDelayMs ?? 500

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(input, init)

      if (response.status >= 500 || response.status === 429) {
        if (attempt < retries) {
          await delay(retryDelayMs * (attempt + 1))
          continue
        }
      }

      return response
    } catch (error) {
      if (!isNetworkFetchError(error) || attempt >= retries) {
        throw error
      }

      await delay(retryDelayMs * (attempt + 1))
    }
  }

  throw new Error('No se pudo completar la solicitud')
}

async function uploadToR2(params: {
  projectId: string
  file: File
  kind: 'planos' | 'comprobantes' | 'adjuntos'
}): Promise<string> {
  const presignRes = await fetchWithRetry('/api/upload', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify({
      projectId: params.projectId,
      filename: params.file.name,
      contentType: params.file.type || 'application/octet-stream',
      kind: params.kind,
    }),
  }, { retries: 2, retryDelayMs: 600 })

  if (!presignRes.ok) {
    const data = await tryParseJson(presignRes)
    throw new Error(data.error || 'No se pudo generar la URL de subida')
  }

  const { uploadUrl, key } = await presignRes.json()

  const uploadRes = await fetchWithRetry(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': params.file.type || 'application/octet-stream' },
    body: params.file,
  }, { retries: 2, retryDelayMs: 700 })

  if (!uploadRes.ok) {
    throw new Error('No se pudo subir el archivo')
  }

  return key
}

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

  const fetchData = useCallback(async (options?: { silent?: boolean }) => {
    if (!projectId) {
      setData(null)
      if (!options?.silent) setIsLoading(false)
      return
    }

    if (!options?.silent) setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/projects/${projectId}`)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const result = await response.json()
      setData(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch project')
    } finally {
      if (!options?.silent) setIsLoading(false)
    }
  }, [projectId])

  const refetch = useCallback(() => fetchData({ silent: true }), [fetchData])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return { data, isLoading, error, refetch }
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

  const fetchData = useCallback(async (options?: { silent?: boolean }) => {
    if (!options?.silent) setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/projects')
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const result = await response.json()
      const dedupResult = Array.from(new Map(result.map((p: Proyecto) => [p.id, p])).values()) as Proyecto[]
      setProjects(dedupResult)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch projects')
    } finally {
      if (!options?.silent) setIsLoading(false)
    }
  }, [])

  const refetch = useCallback(() => fetchData({ silent: true }), [fetchData])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return { projects, isLoading, error, refetch }
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
        const response = await fetch('/api/projects', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ nombre, moneda, montoInicial }),
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
        }

        const result = await response.json()
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
        const response = await fetch(`/api/projects/${projectId}/budget`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ newAmount, note }),
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
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

  const fetchData = useCallback(async (options?: { silent?: boolean }) => {
    if (!projectId) {
      setHistory([])
      if (!options?.silent) setIsLoading(false)
      return
    }

    if (!options?.silent) setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/projects/${projectId}/budget/history`)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const result = await response.json()
      setHistory(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch budget history')
    } finally {
      if (!options?.silent) setIsLoading(false)
    }
  }, [projectId])

  const refetch = useCallback(() => fetchData({ silent: true }), [fetchData])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return { history, isLoading, error, refetch }
}
// ============================================
// usePayments - Fetch project payments
// ============================================
interface UsePaymentsResult {
  payments: Pago[]
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function usePayments(projectId: string | null): UsePaymentsResult {
  const [payments, setPayments] = useState<Pago[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async (options?: { silent?: boolean }) => {
    if (!projectId) {
      setPayments([])
      if (!options?.silent) setIsLoading(false)
      return
    }

    if (!options?.silent) setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/projects/${projectId}/payments`)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const result = await response.json()
      setPayments(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch payments')
    } finally {
      if (!options?.silent) setIsLoading(false)
    }
  }, [projectId])

  const refetch = useCallback(() => fetchData({ silent: true }), [fetchData])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return { payments, isLoading, error, refetch }
}

// ============================================
// useCreatePayment - Create a new payment
// ============================================
interface CreatePaymentParams {
  proyectoId: string
  etapaId: string | null
  montoPagado: number
  moneda: string
  fechaPago: string
  comentario: string
  comprobanteFile: File | null
}

interface UseCreatePaymentResult {
  createPayment: (params: CreatePaymentParams) => Promise<boolean>
  isCreating: boolean
  error: string | null
}

export function useCreatePayment(): UseCreatePaymentResult {
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const createPayment = useCallback(
    async (params: CreatePaymentParams): Promise<boolean> => {
      setIsCreating(true)
      setError(null)

      try {
        let comprobanteUrl = null;

        // Upload file if present
        if (params.comprobanteFile) {
          comprobanteUrl = await uploadToR2({
            projectId: params.proyectoId,
            file: params.comprobanteFile,
            kind: 'comprobantes',
          })
        }

        const response = await fetch('/api/payments', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            proyectoId: params.proyectoId,
            etapaId: params.etapaId,
            montoPagado: params.montoPagado,
            moneda: params.moneda,
            fechaPago: params.fechaPago,
            comentario: params.comentario,
            comprobanteUrl,
          }),
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
        }

        return true
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Payment creation failed')
        return false
      } finally {
        setIsCreating(false)
      }
    },
    []
  )

  return { createPayment, isCreating, error }
}

// ============================================
// usePlanos - Fetch project planos
// ============================================
interface UsePlanosResult {
  planos: Plano[]
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function usePlanos(projectId: string | null): UsePlanosResult {
  const [planos, setPlanos] = useState<Plano[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async (options?: { silent?: boolean }) => {
    if (!projectId) {
      setPlanos([])
      if (!options?.silent) setIsLoading(false)
      return
    }

    if (!options?.silent) setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/projects/${projectId}/planos`)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const result = await response.json()
      setPlanos(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch planos')
    } finally {
      if (!options?.silent) setIsLoading(false)
    }
  }, [projectId])

  const refetch = useCallback(() => fetchData({ silent: true }), [fetchData])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return { planos, isLoading, error, refetch }
}

// ============================================
// useUploadPlano - Upload a new plano
// ============================================
interface UploadPlanoParams {
  proyectoId: string
  nombre: string
  descripcion: string
  tipo: string
  orden: number
  file: File
}

interface UseUploadPlanoResult {
  uploadPlano: (params: UploadPlanoParams) => Promise<boolean>
  isUploading: boolean
  error: string | null
}

export function useUploadPlano(): UseUploadPlanoResult {
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const uploadPlano = useCallback(
    async (params: UploadPlanoParams): Promise<boolean> => {
      setIsUploading(true)
      setError(null)

      try {
        // 1. Upload file
        const fileUrl = await uploadToR2({
          projectId: params.proyectoId,
          file: params.file,
          kind: 'planos',
        })

        // 2. Create plano record
        const response = await fetch('/api/planos', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            proyectoId: params.proyectoId,
            nombre: params.nombre,
            descripcion: params.descripcion,
            tipo: params.tipo,
            orden: params.orden,
            url: fileUrl,
          }),
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
        }

        return true
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Plano upload failed')
        return false
      } finally {
        setIsUploading(false)
      }
    },
    []
  )

  return { uploadPlano, isUploading, error }
}

// ============================================
// usePendientes - Fetch project pendientes
// ============================================
interface UsePendientesResult {
  pendientes: Pendiente[]
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function usePendientes(projectId: string | null): UsePendientesResult {
  const [pendientes, setPendientes] = useState<Pendiente[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async (options?: { silent?: boolean }) => {
    if (!projectId) {
      setPendientes([])
      if (!options?.silent) setIsLoading(false)
      return
    }

    if (!options?.silent) setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/projects/${projectId}/pendientes`)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const result = await response.json()
      setPendientes(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch pendientes')
    } finally {
      if (!options?.silent) setIsLoading(false)
    }
  }, [projectId])

  const refetch = useCallback(() => fetchData({ silent: true }), [fetchData])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return { pendientes, isLoading, error, refetch }
}

export function usePendingCount(projectId: string | null) {
  const [count, setCount] = useState(0)

  useEffect(() => {
    let cancelled = false

    async function fetchCount() {
      if (!projectId) {
        setCount(0)
        return
      }

      try {
        const response = await fetch(`/api/projects/${projectId}/pendientes?estado=pendiente`)
        if (!response.ok) return
        const result = await response.json()
        if (!cancelled) setCount(Array.isArray(result) ? result.length : 0)
      } catch {
        if (!cancelled) setCount(0)
      }
    }

    fetchCount()
    return () => {
      cancelled = true
    }
  }, [projectId])

  return count
}

export function useCreatePendiente() {
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const createPendiente = useCallback(async (params: {
    projectId: string
    titulo: string
    descripcion?: string
    fechaVencimiento: string
  }) => {
    setIsCreating(true)
    setError(null)

    try {
      const response = await fetch(`/api/projects/${params.projectId}/pendientes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          titulo: params.titulo,
          descripcion: params.descripcion,
          fechaVencimiento: params.fechaVencimiento,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || `HTTP error! status: ${response.status}`)
      }

      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create pendiente')
      return false
    } finally {
      setIsCreating(false)
    }
  }, [])

  return { createPendiente, isCreating, error }
}

export function useUpdatePendiente() {
  const [isUpdating, setIsUpdating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const updatePendiente = useCallback(async (pendienteId: string, data: {
    titulo?: string
    descripcion?: string | null
    fechaVencimiento?: string
    estado?: 'pendiente' | 'completado'
  }) => {
    setIsUpdating(true)
    setError(null)

    try {
      const response = await fetch(`/api/pendientes/${pendienteId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const payload = await response.json()
        throw new Error(payload.error || `HTTP error! status: ${response.status}`)
      }

      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update pendiente')
      return false
    } finally {
      setIsUpdating(false)
    }
  }, [])

  return { updatePendiente, isUpdating, error }
}

export function useDeletePendiente() {
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const deletePendiente = useCallback(async (pendienteId: string) => {
    setIsDeleting(true)
    setError(null)

    try {
      const response = await fetch(`/api/pendientes/${pendienteId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const payload = await response.json()
        throw new Error(payload.error || `HTTP error! status: ${response.status}`)
      }

      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete pendiente')
      return false
    } finally {
      setIsDeleting(false)
    }
  }, [])

  return { deletePendiente, isDeleting, error }
}

// ============================================
// useStageTasks - Fetch tasks for a stage
// ============================================
interface UseStageTasksResult {
  tasks: Tarea[]
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useStageTasks(etapaId: string | null): UseStageTasksResult {
  const [tasks, setTasks] = useState<Tarea[]>([])
  const [isLoading, setIsLoading] = useState(false) // Start false, only load when expanding or id set
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async (options?: { silent?: boolean }) => {
    if (!etapaId) {
      setTasks([])
      return
    }

    if (!options?.silent) setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/etapas/${etapaId}/tasks`)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const result = await response.json()
      setTasks(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch tasks')
    } finally {
      if (!options?.silent) setIsLoading(false)
    }
  }, [etapaId])

  const refetch = useCallback(() => fetchData({ silent: true }), [fetchData])

  useEffect(() => {
    if (etapaId) {
      fetchData()
    }
  }, [fetchData, etapaId])

  return { tasks, isLoading, error, refetch }
}

// ============================================
// useUpdateTask - Update task status
// ============================================
interface UseUpdateTaskResult {
  updateTask: (taskId: string, estado: 'pendiente' | 'en_progreso' | 'completada') => Promise<boolean>
  isUpdating: boolean
  error: string | null
}

export function useUpdateTask(): UseUpdateTaskResult {
  const [isUpdating, setIsUpdating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const updateTask = useCallback(async (taskId: string, estado: 'pendiente' | 'en_progreso' | 'completada', descripcion?: string) => {
    setIsUpdating(true)
    setError(null)

    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado, descripcion })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Update failed')
      }

      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed')
      return false
    } finally {
      setIsUpdating(false)
    }
  }, [])

  return { updateTask, isUpdating, error }
}

// ============================================
// useDeleteTask - Delete a task
// ============================================
export function useDeleteTask() {
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const deleteTask = useCallback(async (taskId: string) => {
    setIsDeleting(true)
    setError(null)

    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Delete failed')
      }

      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed')
      return false
    } finally {
      setIsDeleting(false)
    }
  }, [])

  return { deleteTask, isDeleting, error }
}

// ============================================
// useAddEtapa - Add a new stage to a project
// ============================================
interface UseAddEtapaResult {
  addEtapa: (projectId: string, payload: {
    nombre: string;
    porcentajeTotal: number;
    duracionEstimadaJornales: number;
    hitoVerificacion?: string | null;
    tareas: Array<{ descripcion: string }>;
  }) => Promise<boolean>
  isAdding: boolean
  error: string | null
}

export function useAddEtapa(): UseAddEtapaResult {
  const [isAdding, setIsAdding] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const addEtapa = useCallback(async (projectId: string, payload: {
    nombre: string;
    porcentajeTotal: number;
    duracionEstimadaJornales: number;
    hitoVerificacion?: string | null;
    tareas: Array<{ descripcion: string }>;
  }) => {
    setIsAdding(true)
    setError(null)
    try {
      const response = await fetch(`/api/projects/${projectId}/etapas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to add stage')
      }
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add stage')
      return false
    } finally {
      setIsAdding(false)
    }
  }, [])

  return { addEtapa, isAdding, error }
}

export function useUpdateStage() {
  const [isUpdating, setIsUpdating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const updateStage = useCallback(async (etapaId: string, data: {
    nombre?: string;
    duracionEstimadaJornales?: number;
    hitoVerificacion?: string | null;
  }) => {
    setIsUpdating(true)
    setError(null)
    try {
      const response = await fetch(`/api/etapas/${etapaId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update stage')
      }
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update stage')
      return false
    } finally {
      setIsUpdating(false)
    }
  }, [])

  return { updateStage, isUpdating, error }
}

export function useDeleteStage() {
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const deleteStage = useCallback(async (etapaId: string) => {
    setIsDeleting(true)
    setError(null)
    try {
      const response = await fetch(`/api/etapas/${etapaId}`, {
        method: 'DELETE',
      })
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete stage')
      }
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete stage')
      return false
    } finally {
      setIsDeleting(false)
    }
  }, [])

  return { deleteStage, isDeleting, error }
}

// ============================================
// useAddTask - Add a new task to a stage
// ============================================
interface UseAddTaskResult {
  addTask: (etapaId: string, descripcion: string) => Promise<boolean>
  isAdding: boolean
  error: string | null
}

export function useAddTask(): UseAddTaskResult {
  const [isAdding, setIsAdding] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const addTask = useCallback(async (etapaId: string, descripcion: string) => {
    setIsAdding(true)
    setError(null)
    try {
      const response = await fetch(`/api/etapas/${etapaId}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ descripcion })
      })
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to add task')
      }
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add task')
      return false
    } finally {
      setIsAdding(false)
    }
  }, [])

  return { addTask, isAdding, error }
}

// ============================================
// useReportes - Fetch project reports
// ============================================
import type { Reporte, ReporteConImagenes } from '@/types/database.types'

export function useReportes(projectId: string | null) {
  const [reportes, setReportes] = useState<(Reporte & { imageCount: number })[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async (options?: { silent?: boolean }) => {
    if (!projectId) {
      setReportes([])
      if (!options?.silent) setIsLoading(false)
      return
    }

    if (!options?.silent) setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/projects/${projectId}/reportes`)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const result = await response.json()
      setReportes(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch reportes')
    } finally {
      if (!options?.silent) setIsLoading(false)
    }
  }, [projectId])

  const refetch = useCallback(() => fetchData({ silent: true }), [fetchData])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return { reportes, isLoading, error, refetch }
}

// ============================================
// useReporte - Fetch single report with images
// ============================================
export function useReporte(reporteId: string | null) {
  const [reporte, setReporte] = useState<ReporteConImagenes | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async (options?: { silent?: boolean }) => {
    if (!reporteId) {
      setReporte(null)
      return
    }

    if (!options?.silent) setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/reportes/${reporteId}`)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const result = await response.json()
      setReporte(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch reporte')
    } finally {
      if (!options?.silent) setIsLoading(false)
    }
  }, [reporteId])

  const refetch = useCallback(() => fetchData({ silent: true }), [fetchData])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return { reporte, isLoading, error, refetch }
}

// ============================================
// useCreateReporte - Create a report with images
// ============================================
export function useCreateReporte() {
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const createReporte = useCallback(async (params: {
    projectId: string
    descripcion: string
    fecha: string
    files: File[]
  }) => {
    setIsCreating(true)
    setError(null)

    try {
      // Upload all files first
      const imagenes: { r2Key: string; nombre: string; orden: number }[] = []

      for (let i = 0; i < params.files.length; i++) {
        const file = params.files[i]

        const key = await uploadToR2({
          projectId: params.projectId,
          file,
          kind: 'adjuntos',
        })

        imagenes.push({ r2Key: key, nombre: file.name, orden: i })
      }

      // Create the report record
      const response = await fetchWithRetry(`/api/projects/${params.projectId}/reportes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          descripcion: params.descripcion,
          fecha: params.fecha,
          imagenes,
        }),
      }, { retries: 1, retryDelayMs: 700 })

      if (!response.ok) {
        const data = await tryParseJson(response)
        throw new Error(data.error || 'Error al crear reporte')
      }

      const result = await response.json()
      return result.id as string
    } catch (err) {
      if (isNetworkFetchError(err)) {
        setError('Error de red al enviar el reporte. Verificá la conexión y reintentá.')
      } else {
        setError(err instanceof Error ? err.message : 'Error al crear reporte')
      }
      return null
    } finally {
      setIsCreating(false)
    }
  }, [])

  return { createReporte, isCreating, error }
}

// ============================================
// useDeleteReporte - Delete a report
// ============================================
export function useDeleteReporte() {
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const deleteReporte = useCallback(async (reporteId: string) => {
    setIsDeleting(true)
    setError(null)

    try {
      const response = await fetch(`/api/reportes/${reporteId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Error al eliminar reporte')
      }

      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al eliminar reporte')
      return false
    } finally {
      setIsDeleting(false)
    }
  }, [])

  return { deleteReporte, isDeleting, error }
}
