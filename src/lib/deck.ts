// Which Pokémon are in play, and Leitner-weighted picking among them.
import { NAMES } from '../data/names'

/** dex number → Leitner box 1..5 (absent = never answered) */
export type Progress = Record<number, number>

export interface Name { ja: string; en: string }

// National dex ranges, gen 1..9.
export const GENS: readonly (readonly [from: number, to: number])[] = [
  [1, 151], [152, 251], [252, 386], [387, 493], [494, 649],
  [650, 721], [722, 809], [810, 905], [906, 1025],
]

export function nameOf(id: number): Name {
  const [ja, en] = NAMES[id - 1]
  return { ja, en }
}

export function buildDeck(gens: number[]): number[] {
  return gens.flatMap((g) => {
    const [from, to] = GENS[g - 1]
    return Array.from({ length: to - from + 1 }, (_, i) => from + i)
  })
}

const WEIGHTS = [16, 8, 4, 2, 1]

// Leitner-weighted draw, skipping ids already used this session (all of them once the deck runs out).
// ponytail: rebuilds the weighted pool each draw — ~1000 ids at most, nobody will notice
export function pick(ids: number[], progress: Progress, exclude: Set<number> = new Set()): number {
  let pool = ids.filter(id => !exclude.has(id))
  if (!pool.length) pool = ids
  const weighted = pool.flatMap(id => Array<number>(WEIGHTS[(progress[id] || 1) - 1]).fill(id))
  return weighted[Math.floor(Math.random() * weighted.length)]
}

// Drawn up front so "redo" can replay exactly the same questions.
export function drawSet(ids: number[], progress: Progress, n: number): number[] {
  const taken = new Set<number>()
  while (taken.size < Math.min(n, ids.length)) taken.add(pick(ids, progress, taken))
  return [...taken]
}

export function shuffle<T>(list: readonly T[]): T[] {
  const a = [...list]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export function counts(ids: number[], progress: Progress) {
  let learned = 0, learning = 0
  for (const id of ids) { const box = progress[id]; if (box >= 4) learned++; else if (box) learning++ }
  return { learned, learning, unseen: ids.length - learned - learning }
}

export const nextBox = (box: number | undefined, correct: boolean) => (correct ? Math.min((box || 1) + 1, 5) : 1)
