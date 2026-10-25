// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest'
import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { SegmentedProgress } from '@/components/ui/segmented-progress'

function activeCount(container: HTMLElement) {
  return [...container.querySelectorAll('.flex-1')].filter((segment) =>
    segment.className.includes('bg-primary') && !segment.className.includes('bg-transparent'),
  ).length
}

describe('SegmentedProgress', () => {
  it('fills a rounded share of the segments', () => {
    const { container, rerender } = render(<SegmentedProgress value={33} segments={10} />)
    expect(container.querySelectorAll('.flex-1')).toHaveLength(10)
    expect(activeCount(container)).toBe(3)

    rerender(<SegmentedProgress value={0} segments={10} />)
    expect(activeCount(container)).toBe(0)

    rerender(<SegmentedProgress value={100} segments={10} />)
    expect(activeCount(container)).toBe(10)

    rerender(<SegmentedProgress value={95} />)
    expect(activeCount(container)).toBe(10)
  })
})
