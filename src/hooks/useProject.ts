// Custom hooks for project data fetching
'use client'

import { useState, useEffect, useCallback } from 'react'
import type { ProjectSummary, Proyecto, PresupuestoVersion, Pago, Plano, Tarea, Pendiente } from '@/types/database.types'

async function uploadToR2(params: {
  projectId: string
  file: File
  kind: 'planos' | 'comprobantes' | 'adjuntos'
}): Promise<string> {
  const presignRes = await fetch('/api/upload', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      projectId: params.projectId,
      filename: params.file.name,
      contentType: params.file.type || 'application/octet-stream',
      kind: params.kind,
    }),
  })

  if (!presignRes.ok) {
    const data = await presignRes.json()
    throw new Error(data.error || 'No se pudo generar la URL de subida')
  }

  const { uploadUrl, key } = await presignRes.json()

  const uploadRes = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': params.file.type || 'application/octet-stream' },
    body: params.file,
  })

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

  const fetchData = useCallback(async () => {
    if (!projectId) {
      setData(null)
      setIsLoading(false)
      return
    }

    setIsLoading(true)
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
      const response = await fetch('/api/projects')
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const result = await response.json()
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

  const fetchData = useCallback(async () => {
    if (!projectId) {
      setHistory([])
      setIsLoading(false)
      return
    }

    setIsLoading(true)
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
      setIsLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return { history, isLoading, error, refetch: fetchData }
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

  const fetchData = useCallback(async () => {
    if (!projectId) {
      setPayments([])
      setIsLoading(false)
      return
    }

    setIsLoading(true)
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
      setIsLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return { payments, isLoading, error, refetch: fetchData }
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

  const fetchData = useCallback(async () => {
    if (!projectId) {
      setPlanos([])
      setIsLoading(false)
      return
    }

    setIsLoading(true)
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
      setIsLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return { planos, isLoading, error, refetch: fetchData }
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

  const fetchData = useCallback(async () => {
    if (!projectId) {
      setPendientes([])
      setIsLoading(false)
      return
    }

    setIsLoading(true)
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
      setIsLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return { pendientes, isLoading, error, refetch: fetchData }
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

  const fetchData = useCallback(async () => {
    if (!etapaId) {
      setTasks([])
      return
    }

    setIsLoading(true)
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
      setIsLoading(false)
    }
  }, [etapaId])

  useEffect(() => {
    if (etapaId) {
      fetchData()
    }
  }, [fetchData, etapaId])

  return { tasks, isLoading, error, refetch: fetchData }
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

