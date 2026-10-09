import { afterEach, describe, expect, it, vi } from 'vitest'
import { buildDeck, counts, drawSet, isNewBest, learnedShare, nextBox, pick, shuffle } from './deck'

afterEach(() => { vi.restoreAllMocks() })

// Walks Math.random over every slot of the weighted pool once, so a draw count is exact.
function drawEverySlot(slots: number, draw: () => number) {
  const seen: number[] = []
  for (let i = 0; i < slots; i++) {
    vi.spyOn(Math, 'random').mockReturnValueOnce(i / slots)
    seen.push(draw())
  }
  return seen
}

describe('nextBox', () => {
  it('moves up one box per right answer, up to 5', () => {
    expect(nextBox(undefined, true)).toBe(2)   // a first right answer skips box 1
    expect(nextBox(1, true)).toBe(2)
    expect(nextBox(4, true)).toBe(5)
    expect(nextBox(5, true)).toBe(5)
  })
  it('sends a wrong answer back to box 1', () => {
    for (const box of [undefined, 1, 3, 5]) expect(nextBox(box, false)).toBe(1)
  })
})

describe('pick', () => {
  it('draws a box-1 name 16 times as often as a box-5 one', () => {
    const seen = drawEverySlot(17, () => pick([1, 2], { 1: 1, 2: 5 }))
    expect(seen.filter(id => id === 1)).toHaveLength(16)
    expect(seen.filter(id => id === 2)).toHaveLength(1)
  })
  it('weighs an unseen name like box 1', () => {
    const seen = drawEverySlot(32, () => pick([1, 2], { 2: 1 }))
    expect(seen.filter(id => id === 1)).toHaveLength(16)
  })
  it('skips excluded names, and draws from all once every name is excluded', () => {
    for (let i = 0; i < 20; i++) expect(pick([1, 2, 3], {}, new Set([1, 2]))).toBe(3)
    expect([1, 2]).toContain(pick([1, 2], {}, new Set([1, 2])))
  })
})

describe('drawSet', () => {
  it('draws n different names', () => {
    const set = drawSet(buildDeck([1]), {}, 10)
    expect(set).toHaveLength(10)
    expect(new Set(set).size).toBe(10)
  })
  it('stops at the deck size instead of looping forever', () => {
    expect(drawSet([1, 2, 3], {}, 50).sort()).toEqual([1, 2, 3])
    expect(drawSet([], {}, 5)).toEqual([])
  })
})

describe('buildDeck', () => {
  it('lists the national dex range of each generation, in order', () => {
    const gen1 = buildDeck([1])
    expect([gen1.length, gen1[0], gen1.at(-1)]).toEqual([151, 1, 151])
    const gen9 = buildDeck([9])
    expect([gen9[0], gen9.at(-1)]).toEqual([906, 1025])
    expect(buildDeck([1, 2])).toHaveLength(251)
    expect(buildDeck([1, 2, 3, 4, 5, 6, 7, 8, 9])).toHaveLength(1025)
  })
})

describe('counts and learnedShare', () => {
  it('counts boxes 4–5 as learned, 1–3 as learning, the rest as unseen', () => {
    expect(counts([1, 2, 3, 4, 5], { 1: 1, 2: 3, 3: 4, 4: 5, 99: 5 })).toEqual({ learned: 2, learning: 2, unseen: 1 })
  })
  it('gives the whole percent learned in a generation', () => {
    const progress = Object.fromEntries(buildDeck([1]).slice(0, 76).map(id => [id, 4]))
    expect(learnedShare(progress, 1)).toBe(50)   // 76 / 151
    expect(learnedShare(progress, 2)).toBe(0)
  })
})

describe('isNewBest', () => {
  it('needs at least one right and more than the old best', () => {
    expect(isNewBest(0, undefined)).toBe(false)
    expect(isNewBest(3, undefined)).toBe(true)
    expect(isNewBest(3, 3)).toBe(false)
    expect(isNewBest(4, 3)).toBe(true)
    expect(isNewBest(2, 3)).toBe(false)
  })
})

describe('shuffle', () => {
  it('keeps every item and leaves the input alone', () => {
    const list = [1, 2, 3, 4, 5]
    const out = shuffle(list)
    expect(out.sort()).toEqual([1, 2, 3, 4, 5])
    expect(list).toEqual([1, 2, 3, 4, 5])
  })
})
