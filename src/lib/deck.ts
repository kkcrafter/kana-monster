// Which Pokémon are in play, and which of them are due: Leitner boxes with a review interval each.
import { NAMES } from '../data/names'

/** dex number → Leitner box 1..5 (absent = never answered) */
export type Progress = Record<number, number>
/** dex number → when it was last answered, ms since 1970 (absent on progress from before this was kept) */
export type Seen = Record<number, number>

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

// ---------- spaced repetition ----------
// Leitner boxes: right moves a name up a box (max 5), wrong sends it to box 1, and each box has an
// interval before the name is due again. Due names are asked first, then new ones.
// The rules, the reasons for the intervals and an animation: docs/spaced-repetition.md

// In milliseconds, the unit of Date.now() and of `Seen`.
const MINUTE = 60 * 1000
const DAY = 24 * 60 * MINUTE
/** How long after a name's last answer it is due again, by box: box 1 (missed) straight away. */
export const INTERVALS = [0, 3 * MINUTE, 30 * MINUTE, DAY, 3 * DAY]

/** When an answered name is due. Progress from before answers were timed counts as long overdue. */
export const dueAt = (box: number, seen = 0) => seen + INTERVALS[box - 1]

/** Up to n names, most urgent first: those due, longest overdue first; then names never answered, at
 *  random; then those not due yet, soonest first (reviewing ahead once nothing else is left).
 *  Drawn up front so "redo" can replay exactly the same questions. */
// ponytail: sorts the whole deck per draw; ~1000 names at most, nobody will notice
export function drawSet(ids: number[], progress: Progress, seen: Seen, n: number,
  now = Date.now(), exclude: Set<number> = new Set()): number[] {
  const due: number[] = [], fresh: number[] = [], ahead: number[] = []
  for (const id of ids) {
    if (exclude.has(id)) continue
    const box = progress[id]
    if (!box) fresh.push(id)
    else (dueAt(box, seen[id]) <= now ? due : ahead).push(id)
  }
  const when = (id: number) => dueAt(progress[id], seen[id])
  // shuffled first, so names due at the same moment come in a different order each time (sort is stable)
  const soonest = (list: number[]) => shuffle(list).sort((a, b) => when(a) - when(b))
  return [...soonest(due), ...shuffle(fresh), ...soonest(ahead)].slice(0, n)
}

/** The next name for a challenge: the most urgent one not asked yet, any once all have been. */
export const pick = (ids: number[], progress: Progress, seen: Seen, asked: Set<number>, now = Date.now()): number =>
  drawSet(ids, progress, seen, 1, now, asked)[0] ?? drawSet(ids, progress, seen, 1, now)[0]

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

/** whole percent of a generation's names in box 4 or 5 */
export function learnedShare(progress: Progress, gen: number): number {
  const [from, to] = GENS[gen - 1]
  let learned = 0
  for (let id = from; id <= to; id++) if (progress[id] >= 4) learned++
  return Math.round(100 * learned / (to - from + 1))
}

/** A challenge score is a new best when it beats the old one; zero right never counts. */
export const isNewBest = (correct: number, prev: number | undefined) => correct > 0 && (prev == null || correct > prev)

export const nextBox = (box: number | undefined, correct: boolean) => (correct ? Math.min((box || 1) + 1, 5) : 1)
