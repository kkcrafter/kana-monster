import { describe, expect, it } from 'vitest'
import { buildDeck } from './deck'
import { allPicked, filterNames, levelOf, pickAll, togglePick } from './history'

describe('levelOf', () => {
  it('maps Leitner boxes to the tabs', () => {
    expect([undefined, 1, 2, 3, 4, 5].map(levelOf)).toEqual(['unseen', 'weak', 'learning', 'learning', 'learned', 'learned'])
  })
})

describe('filterNames', () => {
  const gen1 = buildDeck([1])
  const progress = { 1: 1, 4: 3, 7: 5 }   // Bulbasaur missed, Charmander learning, Squirtle learned
  it('keeps the tab', () => {
    expect(filterNames(gen1, progress, 'weak', '')).toEqual([1])
    expect(filterNames(gen1, progress, 'learning', '')).toEqual([4])
    expect(filterNames(gen1, progress, 'learned', '')).toEqual([7])
    expect(filterNames(gen1, progress, 'all', '')).toHaveLength(151)
  })
  it('searches katakana, romaji and English, ignoring case and spaces', () => {
    expect(filterNames(gen1, {}, 'all', 'ピカチュウ')).toEqual([25])
    expect(filterNames(gen1, {}, 'all', 'pikachuu')).toEqual([25])
    expect(filterNames(gen1, {}, 'all', '  BULBA ')).toEqual([1])
  })
  it('applies the tab and the search together', () => {
    expect(filterNames(gen1, progress, 'weak', 'hitokage')).toEqual([])
    expect(filterNames(gen1, progress, 'learning', 'hitokage')).toEqual([4])
  })
})

describe('togglePick', () => {
  const shown = [10, 11, 12, 13, 14]
  it('flips one name on a plain click', () => {
    expect([...togglePick(new Set(), shown, 12, 0, false)]).toEqual([12])
    expect([...togglePick(new Set([12]), shown, 12, 0, false)]).toEqual([])
  })
  it('on shift-click, picks the run when the last clicked one is picked, in either direction', () => {
    expect([...togglePick(new Set([11]), shown, 13, 11, true)].sort()).toEqual([11, 12, 13])
    expect([...togglePick(new Set([13]), shown, 11, 13, true)].sort()).toEqual([11, 12, 13])
  })
  it('on shift-click, unpicks the run when the last clicked one is unpicked', () => {
    expect([...togglePick(new Set([10, 12, 13, 14]), shown, 13, 11, true)].sort()).toEqual([10, 14])
  })
  it('treats shift-click as a plain click when the last clicked name is off screen', () => {
    expect([...togglePick(new Set(), shown, 12, 99, true)]).toEqual([12])
  })
})

describe('pickAll', () => {
  it('selects all on screen and keeps picks off screen', () => {
    const next = pickAll(new Set([99, 10]), [10, 11, 12])
    expect([...next].sort((a, b) => a - b)).toEqual([10, 11, 12, 99])
    expect(allPicked(next, [10, 11, 12])).toBe(true)
  })
  it('unselects those on screen when pressed again, still keeping the rest', () => {
    expect([...pickAll(new Set([10, 11, 12, 99]), [10, 11, 12])]).toEqual([99])
  })
  it('does nothing with nothing on screen', () => {
    expect(allPicked(new Set([1]), [])).toBe(false)
    expect([...pickAll(new Set([1]), [])]).toEqual([1])
  })
})
