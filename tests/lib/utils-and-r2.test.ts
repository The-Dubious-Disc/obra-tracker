import { describe, expect, it } from 'vitest'
import { cn } from '@/lib/utils'
import { buildObjectKey, isR2Key } from '@/lib/services/r2'

describe('cn', () => {
  it('merges conflicting tailwind classes', () => {
    expect(cn('px-2', 'px-4', false && 'hidden')).toBe('px-4')
  })
})

describe('R2 object keys', () => {
  it('builds a project-scoped key and strips unsafe filename characters', () => {
    const key = buildObjectKey({
      projectId: 'proj-1',
      kind: 'planos',
      filename: 'plano final (1).pdf',
    })

    expect(key).toMatch(/^obratracker\/projects\/proj-1\/planos\/\d+-plano_final__1_\.pdf$/)
  })

  it('replaces path separators so a filename cannot escape the prefix', () => {
    const key = buildObjectKey({
      projectId: 'proj-1',
      kind: 'comprobantes',
      filename: '../../etc/passwd',
    })

    expect(key).toMatch(/^obratracker\/projects\/proj-1\/comprobantes\/\d+-\.\._\.\._etc_passwd$/)
    expect(key.includes('..//')).toBe(false)
  })

  it('treats only stored object keys as R2 keys', () => {
    expect(isR2Key('obratracker/projects/p/planos/file.pdf')).toBeTruthy()
    expect(isR2Key('https://cdn.example/file.pdf')).toBe(false)
    expect(isR2Key('http://cdn.example/file.pdf')).toBe(false)
    expect(isR2Key('/uploads/local.pdf')).toBe(false)
    expect(isR2Key('')).toBeFalsy()
  })
})
