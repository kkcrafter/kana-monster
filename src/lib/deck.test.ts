import { describe, expect, it } from 'vitest'
import { buildDeck, counts, drawSet, dueAt, isNewBest, learnedShare, nextBox, pick, shuffle } from './deck'

const MINUTE = 60 * 1000
const DAY = 24 * 60 * MINUTE
const NOW = Date.UTC(2026, 9, 9)
const ago = (days: number) => NOW - days * DAY

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

describe('dueAt', () => {
  it('is due straight away in box 1, then after 3 minutes, 30 minutes, 1 day and 3 days', () => {
    expect([1, 2, 3, 4, 5].map(box => dueAt(box, NOW) - NOW)).toEqual([0, 3 * MINUTE, 30 * MINUTE, DAY, 3 * DAY])
  })
  it('brings a name answered right every time back next game, later that hour, the next day, then in 3 days', () => {
    let at = NOW
    const due = [2, 3, 4, 5].map(box => (at = dueAt(box, at)) - NOW)
    expect(due).toEqual([3 * MINUTE, 33 * MINUTE, 33 * MINUTE + DAY, 33 * MINUTE + 4 * DAY])
  })
  it('counts progress from before answers were timed as long overdue', () => {
    expect(dueAt(5)).toBeLessThan(NOW)
  })
})

describe('drawSet', () => {
  // 1: missed now (box 1, due now)   2: box 2 answered 3 days ago (overdue by ~3 days)
  // 3: box 3 answered now (due in 30 minutes)   4: box 5 answered 30 days ago (overdue by 27 days)
  // 5, 6: never answered   7: box 4 answered now (due in 1 day)
  const ids = [1, 2, 3, 4, 5, 6, 7]
  const progress = { 1: 1, 2: 2, 3: 3, 4: 5, 7: 4 }
  const seen = { 1: NOW, 2: ago(3), 3: NOW, 4: ago(30), 7: NOW }

  it('asks due names first, longest overdue first, then new names, then the ones due soonest', () => {
    const set = drawSet(ids, progress, seen, 7, NOW)
    expect(set.slice(0, 3)).toEqual([4, 2, 1])
    expect(set.slice(3, 5).sort()).toEqual([5, 6])
    expect(set.slice(5)).toEqual([3, 7])
  })
  it('stops at n', () => {
    expect(drawSet(ids, progress, seen, 2, NOW)).toEqual([4, 2])
  })
  it('keeps a name just answered right out until its interval is up', () => {
    const one = { 9: 2 }
    expect(drawSet([9, 10], one, { 9: NOW }, 1, NOW + 3 * MINUTE - 1)).toEqual([10])
    expect(drawSet([9, 10], one, { 9: NOW }, 1, NOW + 3 * MINUTE)).toEqual([9])
  })
  it('treats untimed progress as due, weakest box first', () => {
    expect(drawSet([1, 2, 3], { 1: 5, 2: 1, 3: 3 }, {}, 3, NOW)).toEqual([2, 3, 1])
  })
  it('draws different names, never more than the deck holds', () => {
    const set = drawSet(buildDeck([1]), {}, {}, 10, NOW)
    expect(new Set(set).size).toBe(10)
    expect(drawSet([1, 2, 3], {}, {}, 50, NOW).sort()).toEqual([1, 2, 3])
    expect(drawSet([], {}, {}, 5, NOW)).toEqual([])
  })
  it('skips names already excluded', () => {
    expect(drawSet(ids, progress, seen, 7, NOW, new Set([4, 2]))[0]).toBe(1)
  })
})

describe('pick', () => {
  it('gives the most urgent name not asked yet', () => {
    expect(pick([1, 2, 3], { 1: 2, 2: 1 }, { 1: ago(5), 2: NOW }, new Set(), NOW)).toBe(1)
    expect(pick([1, 2, 3], { 1: 2, 2: 1 }, { 1: ago(5), 2: NOW }, new Set([1]), NOW)).toBe(2)
  })
  it('starts over once every name has been asked', () => {
    expect([1, 2]).toContain(pick([1, 2], {}, {}, new Set([1, 2]), NOW))
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
