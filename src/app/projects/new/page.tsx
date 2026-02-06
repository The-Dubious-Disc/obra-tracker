'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Progress } from '@/components/ui/progress'
import { Plus, Trash2 } from 'lucide-react'
import { useProjectSelection } from '@/contexts/ProjectContext'

interface TaskForm {
  descripcion: string
}

interface StageForm {
  nombre: string
  porcentaje: string
  duracionJornales: string
  hito: string
  tareas: TaskForm[]
}

export default function NewProjectWizard() {
  const router = useRouter()
  const { setSelectedProjectId } = useProjectSelection()
  const [step, setStep] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [project, setProject] = useState({
    nombre: '',
    moneda: 'UYU',
    presupuestoTotal: ''
  })

  const [stages, setStages] = useState<StageForm[]>([
    { nombre: '', porcentaje: '', duracionJornales: '', hito: '', tareas: [{ descripcion: '' }] }
  ])

  const porcentajeTotal = useMemo(
    () => stages.reduce((sum, s) => sum + (parseFloat(s.porcentaje) || 0), 0),
    [stages]
  )

  const canGoNext = () => {
    if (step === 1) {
      return project.nombre.trim() !== '' && parseFloat(project.presupuestoTotal) > 0
    }
    if (step === 2) {
      return stages.length > 0 && stages.every(s => s.nombre.trim() && parseFloat(s.porcentaje) > 0 && parseInt(s.duracionJornales) > 0 && s.tareas.length > 0 && s.tareas.every(t => t.descripcion.trim()))
    }
    return true
  }

  const addStage = () => {
    setStages(prev => [...prev, { nombre: '', porcentaje: '', duracionJornales: '', hito: '', tareas: [{ descripcion: '' }] }])
  }

  const removeStage = (index: number) => {
    setStages(prev => prev.filter((_, i) => i !== index))
  }

  const updateStage = (index: number, field: keyof StageForm, value: string) => {
    setStages(prev => prev.map((stage, i) => i === index ? { ...stage, [field]: value } : stage))
  }

  const addTask = (stageIndex: number) => {
    setStages(prev => prev.map((stage, i) => i === stageIndex ? { ...stage, tareas: [...stage.tareas, { descripcion: '' }] } : stage))
  }

  const removeTask = (stageIndex: number, taskIndex: number) => {
    setStages(prev => prev.map((stage, i) => i === stageIndex ? { ...stage, tareas: stage.tareas.filter((_, t) => t !== taskIndex) } : stage))
  }

  const updateTask = (stageIndex: number, taskIndex: number, value: string) => {
    setStages(prev => prev.map((stage, i) => {
      if (i !== stageIndex) return stage
      const tareas = stage.tareas.map((task, t) => t === taskIndex ? { ...task, descripcion: value } : task)
      return { ...stage, tareas }
    }))
  }

  const handleSubmit = async () => {
    setError(null)
    if (porcentajeTotal !== 100) {
      setError('La suma de porcentajes debe ser 100%.')
      return
    }

    setIsSubmitting(true)
    try {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: project.nombre,
          moneda: project.moneda,
          presupuestoTotal: parseFloat(project.presupuestoTotal),
          etapas: stages.map((stage) => ({
            nombre: stage.nombre,
            porcentajeTotal: parseFloat(stage.porcentaje),
            duracionEstimadaJornales: parseInt(stage.duracionJornales),
            hitoVerificacion: stage.hito || null,
            tareas: stage.tareas.map(t => ({ descripcion: t.descripcion }))
          }))
        })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Error al crear proyecto')
      }

      const data = await response.json()
      if (data.projectId) {
        setSelectedProjectId(data.projectId)
        router.push('/')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear proyecto')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Nuevo Proyecto</h1>
        <p className="text-muted-foreground">Crea un proyecto completo con presupuesto, etapas y tareas.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Paso {step} de 2</CardTitle>
          <CardDescription>
            {step === 1 ? 'Datos generales del proyecto' : 'Etapas, tareas y estimación'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {step === 1 && (
            <div className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="nombre">Nombre del Proyecto *</Label>
                <Input
                  id="nombre"
                  placeholder="Ej: Casa de Playa"
                  value={project.nombre}
                  onChange={(e) => setProject(prev => ({ ...prev, nombre: e.target.value }))}
                  required
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="moneda">Moneda</Label>
                <Select value={project.moneda} onValueChange={(value) => setProject(prev => ({ ...prev, moneda: value }))}>
                  <SelectTrigger id="moneda">
                    <SelectValue placeholder="Selecciona moneda" />
                  </SelectTrigger>
                  <SelectContent>
                  <SelectItem value="USD">USD - Dólar Americano</SelectItem>
                </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="presupuesto">Presupuesto Total *</Label>
                <Input
                  id="presupuesto"
                  type="number"
                  placeholder="0"
                  value={project.presupuestoTotal}
                  onChange={(e) => setProject(prev => ({ ...prev, presupuestoTotal: e.target.value }))}
                  min="0"
                  step="0.01"
                  required
                />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">Distribución de presupuesto por etapas (%)</p>
                  <span className={`text-sm ${porcentajeTotal === 100 ? 'text-green-600' : 'text-destructive'}`}>
                    {porcentajeTotal}%
                  </span>
                </div>
                <Progress value={Math.min(porcentajeTotal, 100)} className="h-2" />
              </div>

              <div className="space-y-6">
                {stages.map((stage, stageIndex) => (
                  <Card key={stageIndex} className="border-dashed">
                    <CardHeader className="flex flex-row items-center justify-between">
                      <CardTitle className="text-lg">Etapa {stageIndex + 1}</CardTitle>
                      {stages.length > 1 && (
                        <Button variant="ghost" size="icon" onClick={() => removeStage(stageIndex)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid gap-2">
                        <Label>Nombre de la Etapa *</Label>
                        <Input
                          value={stage.nombre}
                          onChange={(e) => updateStage(stageIndex, 'nombre', e.target.value)}
                          placeholder="Ej: Cimientos"
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="grid gap-2">
                          <Label>Porcentaje del Presupuesto *</Label>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={stage.porcentaje}
                            onChange={(e) => updateStage(stageIndex, 'porcentaje', e.target.value)}
                            placeholder="Ej: 25"
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label>Estimación (jornales) *</Label>
                          <Input
                            type="number"
                            min="1"
                            step="1"
                            value={stage.duracionJornales}
                            onChange={(e) => updateStage(stageIndex, 'duracionJornales', e.target.value)}
                            placeholder="Ej: 30"
                          />
                        </div>
                      </div>

                      <div className="grid gap-2">
                        <Label>Hito de verificación (opcional)</Label>
                        <Textarea
                          value={stage.hito}
                          onChange={(e) => updateStage(stageIndex, 'hito', e.target.value)}
                          placeholder="Ej: Revisar instalación eléctrica"
                          rows={2}
                        />
                      </div>

                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <Label>Tareas *</Label>
                          <Button variant="outline" size="sm" onClick={() => addTask(stageIndex)}>
                            <Plus className="h-4 w-4 mr-1" />
                            Agregar tarea
                          </Button>
                        </div>
                        <div className="space-y-2">
                          {stage.tareas.map((task, taskIndex) => (
                            <div key={taskIndex} className="flex items-center gap-2">
                              <Input
                                value={task.descripcion}
                                onChange={(e) => updateTask(stageIndex, taskIndex, e.target.value)}
                                placeholder="Descripción de la tarea"
                              />
                              {stage.tareas.length > 1 && (
                                <Button variant="ghost" size="icon" onClick={() => removeTask(stageIndex, taskIndex)}>
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <Button variant="outline" onClick={addStage} className="gap-2">
                <Plus className="h-4 w-4" />
                Agregar etapa
              </Button>
            </div>
          )}

          {error && (
            <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
              {error}
            </div>
          )}

          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep(prev => Math.max(1, prev - 1))} disabled={step === 1}>
              Atrás
            </Button>
            {step < 2 ? (
              <Button onClick={() => setStep(2)} disabled={!canGoNext()}>
                Siguiente
              </Button>
            ) : (
              <Button onClick={handleSubmit} disabled={!canGoNext() || isSubmitting}>
                {isSubmitting ? 'Creando...' : 'Crear Proyecto'}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
