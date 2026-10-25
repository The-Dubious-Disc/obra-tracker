import { vi } from 'vitest'

type QueryFn = ReturnType<typeof vi.fn>

export const findFirst = {
  usuarios: vi.fn(),
  proyectoMiembros: vi.fn(),
  invitaciones: vi.fn(),
  passwordResetTokens: vi.fn(),
  proyectos: vi.fn(),
  presupuestoVersiones: vi.fn(),
  pendientes: vi.fn(),
  adicionales: vi.fn(),
}

export const inserts: Array<{ table: unknown; values: unknown }> = []
export const updates: Array<{ table: unknown; set: unknown }> = []
export const deletes: Array<{ table: unknown }> = []

const insertResults: unknown[] = []
const selectResults: unknown[] = []
let pendingError: Error | null = null
export let selectCount = 0

export function queueInsert(result: unknown) {
  insertResults.push(result)
}

export function queueSelect(result: unknown) {
  selectResults.push(result)
}

export function failNext(error: Error = new Error('db down')) {
  pendingError = error
}

export function resetDb() {
  for (const fn of Object.values(findFirst) as QueryFn[]) {
    fn.mockReset()
  }
  inserts.length = 0
  updates.length = 0
  deletes.length = 0
  insertResults.length = 0
  selectResults.length = 0
  pendingError = null
  selectCount = 0
}

function throwIfPending() {
  if (!pendingError) return
  const error = pendingError
  pendingError = null
  throw error
}

type Chain = {
  from: () => Chain
  where: (clause: unknown) => Chain
  orderBy: (...args: unknown[]) => Chain
  leftJoin: (...args: unknown[]) => Chain
  innerJoin: (...args: unknown[]) => Chain
  set: (data: unknown) => Chain
  values: (data: unknown) => Chain
  returning: () => Promise<unknown>
  then: (
    onFulfilled?: (value: unknown) => unknown,
    onRejected?: (reason: unknown) => unknown,
  ) => Promise<unknown>
}

function chain(resolve: () => unknown, hooks?: {
  onValues?: (data: unknown) => void
  onWhere?: (clause: unknown, setValue: unknown) => void
}): Chain {
  let setValue: unknown
  let consumed = false
  let cached: unknown

  const resolveOnce = () => {
    if (!consumed) {
      cached = resolve()
      consumed = true
    }
    return cached
  }

  const self: Chain = {
    from: () => self,
    where: (clause) => {
      hooks?.onWhere?.(clause, setValue)
      return self
    },
    orderBy: () => self,
    leftJoin: () => self,
    innerJoin: () => self,
    set: (data) => {
      setValue = data
      return self
    },
    values: (data) => {
      hooks?.onValues?.(data)
      return self
    },
    returning: () => Promise.resolve(resolveOnce()),
    then: (onFulfilled, onRejected) => Promise.resolve(resolveOnce()).then(onFulfilled, onRejected),
  }

  return self
}

function defaultInsertResult(valuesData: unknown) {
  if (insertResults.length > 0) return insertResults.shift()
  if (valuesData && typeof valuesData === 'object' && !Array.isArray(valuesData)) {
    return [{ id: 'generated', ...(valuesData as Record<string, unknown>) }]
  }
  return [{ id: 'generated' }]
}

export const db = {
  query: {
    usuarios: { findFirst: findFirst.usuarios },
    proyectoMiembros: { findFirst: findFirst.proyectoMiembros },
    invitaciones: { findFirst: findFirst.invitaciones },
    passwordResetTokens: { findFirst: findFirst.passwordResetTokens },
    proyectos: { findFirst: findFirst.proyectos },
    presupuestoVersiones: { findFirst: findFirst.presupuestoVersiones },
    pendientes: { findFirst: findFirst.pendientes },
    adicionales: { findFirst: findFirst.adicionales },
  },
  insert(table: unknown) {
    throwIfPending()
    let valuesData: unknown
    return chain(() => defaultInsertResult(valuesData), {
      onValues: (values) => {
        valuesData = values
        inserts.push({ table, values })
      },
    })
  },
  update(table: unknown) {
    throwIfPending()
    return chain(() => undefined, {
      onWhere: (_clause, setValue) => updates.push({ table, set: setValue }),
    })
  },
  delete(table: unknown) {
    throwIfPending()
    return chain(() => undefined, {
      onWhere: () => deletes.push({ table }),
    })
  },
  select() {
    throwIfPending()
    selectCount += 1
    return chain(() => (selectResults.length > 0 ? selectResults.shift() : []))
  },
}
