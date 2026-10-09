// The learning history's rules: which names a tab and search show, and how picking them works.
import { nameOf, type Progress } from './deck'
import { toRomaji } from './romaji'

export type Tab = 'all' | 'weak' | 'learning' | 'learned'
export type Level = Exclude<Tab, 'all'> | 'unseen'

// Box 1 is only reached by a wrong answer (a first right answer goes straight to 2): "missed last time".
export const levelOf = (box?: number): Level => (!box ? 'unseen' : box === 1 ? 'weak' : box < 4 ? 'learning' : 'learned')

/** The names on screen: in the tab, matching the search in katakana, romaji or English. */
export function filterNames(ids: number[], progress: Progress, tab: Tab, query: string): number[] {
  const q = query.trim().toLowerCase()
  return ids.filter((id) => {
    if (tab !== 'all' && levelOf(progress[id]) !== tab) return false
    if (!q) return true
    const { ja, en } = nameOf(id)
    return ja.includes(q) || toRomaji(ja).includes(q) || en.toLowerCase().includes(q)
  })
}

/** A click flips one name. A shift-click sets every name on screen from the last clicked one
 *  (`anchor`) to this one as the last one is; with no anchor on screen it is a plain click. */
export function togglePick(picked: Set<number>, shown: number[], id: number, anchor: number, shift: boolean): Set<number> {
  const next = new Set(picked)
  const from = shown.indexOf(anchor), to = shown.indexOf(id)
  if (shift && from >= 0) {
    const on = picked.has(anchor)
    for (const x of shown.slice(Math.min(from, to), Math.max(from, to) + 1)) {
      if (on) next.add(x)
      else next.delete(x)
    }
  } else if (!next.delete(id)) next.add(id)
  return next
}

export const allPicked = (picked: Set<number>, shown: number[]) => shown.length > 0 && shown.every(id => picked.has(id))

/** Select all on screen; pressed again once they all are, unselect them. Names off screen stay as they are. */
export function pickAll(picked: Set<number>, shown: number[]): Set<number> {
  const next = new Set(picked)
  const undo = allPicked(picked, shown)
  for (const id of shown) {
    if (undo) next.delete(id)
    else next.add(id)
  }
  return next
}
