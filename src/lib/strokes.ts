// Stroke order from KanjiVG (https://kanjivg.tagaini.net), CC BY-SA 3.0: fetched at runtime and
// cached, never bundled.
import { KEYS, load, save } from './storage'

/** paths in stroke order, and where each stroke's number goes (109×109 viewBox) */
export interface Strokes { p: string[]; n: [number, number][] }

/** A cached entry is only trusted in the shape we wrote it; anything else is fetched again. */
export const isStrokes = (s: unknown): s is Strokes => {
  const { p, n } = (s ?? {}) as Partial<Strokes>
  return Array.isArray(p) && p.every(d => typeof d === 'string') &&
    Array.isArray(n) && n.every(xy => Array.isArray(xy) && xy.length === 2 && xy.every(Number.isFinite))
}

const cache: Record<string, Strokes> = Object.fromEntries(
  Object.entries(load<Record<string, unknown>>(KEYS.strokes, {})).filter(([, s]) => isStrokes(s)) as [string, Strokes][])
const requests: Record<string, Promise<Strokes | null>> = {}

// Pinned to one commit of KanjiVG, so a change upstream can't swap the strokes under us.
const KANJIVG_SHA = '70a0b7ae0c18ceb5cb358274b029cce0234a43bc'

const HOSTS = [
  (hex: string) => `https://cdn.jsdelivr.net/gh/KanjiVG/kanjivg@${KANJIVG_SHA}/kanji/${hex}.svg`,
  (hex: string) => `https://raw.githubusercontent.com/KanjiVG/kanjivg/${KANJIVG_SHA}/kanji/${hex}.svg`,
]

export const cachedStrokes = (ch: string): Strokes | undefined => cache[ch]

export function getStrokes(ch: string): Promise<Strokes | null> {
  if (cache[ch]) return Promise.resolve(cache[ch])
  return (requests[ch] ??= (async () => {
    const hex = ch.codePointAt(0)!.toString(16).padStart(5, '0')
    for (const host of HOSTS) {
      try {
        const res = await fetch(host(hex), { signal: AbortSignal.timeout(10000) })
        if (!res.ok) continue
        const svg = await res.text()
        const p = [...svg.matchAll(/<path[^>]*?id="kvg:[^"]*-s(\d+)"[^>]*?\sd="([^"]+)"/g)]
          .sort((a, b) => +a[1] - +b[1]).map(m => m[2])
        const n = [...svg.matchAll(/matrix\(1 0 0 1 ([\d.]+) ([\d.]+)\)">(\d+)</g)]
          .sort((a, b) => +a[3] - +b[3]).map(m => [+m[1], +m[2]] as [number, number])
        if (!p.length) return null
        cache[ch] = { p, n }
        save(KEYS.strokes, cache)
        return cache[ch]
      } catch { /* try the next host */ }
    }
    return null   // keep the plain glyph
  })())
}

/** Resolves once every character's strokes are in, or after `ms`, whichever is first. */
export function preloadStrokes(chars: string[], ms = 2000): Promise<unknown> {
  return Promise.race([Promise.all(chars.map(getStrokes)), new Promise(r => setTimeout(r, ms))])
}
