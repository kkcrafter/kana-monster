// localStorage with a fallback, so a blocked or corrupt store never breaks the app.

export const KEYS = {
  progress: 'kanamon.progress',
  lang: 'kanamon.lang',
  mode: 'kanamon.mode',
  session: 'kanamon.session',
  count: 'kanamon.count',
  mins: 'kanamon.mins',
  best: 'kanamon.best',
  gens: 'kanamon.gens',
  cue: 'kanamon.cue',
  speak: 'kanamon.autospeak',
  guide: 'kanamon.guide',
  nums: 'kanamon.strokenums',
  strokes: 'kanamon.strokes.v1',
} as const

export function load<T>(key: string, fallback: T): T {
  try { return JSON.parse(localStorage.getItem(key) ?? 'null') ?? fallback }
  catch { return fallback }
}

export function save(key: string, value: unknown): void {
  try { localStorage.setItem(key, JSON.stringify(value)) } catch { /* private mode or full: keep going */ }
}
