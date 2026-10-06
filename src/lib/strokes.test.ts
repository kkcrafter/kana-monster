import { describe, expect, it } from 'vitest'
import { isStrokes } from './strokes'

describe('isStrokes', () => {
  it('accepts what getStrokes writes', () => {
    expect(isStrokes({ p: ['M1 2L3 4', 'M5 6'], n: [[10, 20], [30.5, 40]] })).toBe(true)
    expect(isStrokes({ p: [], n: [] })).toBe(true)
  })
  it('rejects anything else, so a damaged cache is fetched again instead of breaking the page', () => {
    for (const bad of [null, undefined, 5, 'x', [], {}, { p: ['M1'] }, { p: 'M1', n: [] },
      { p: [1], n: [] }, { p: [], n: [[1]] }, { p: [], n: [[1, 'x']] }, { p: [], n: [5] }])
      expect(isStrokes(bad)).toBe(false)
  })
})
