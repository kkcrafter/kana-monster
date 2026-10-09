import { createContext, useContext } from 'react'
import type { Lang, Strings } from './i18n'
import type { Progress, Seen } from './lib/deck'

export type Mode = 'read' | 'write'

/** Practice set size and challenge length: the defaults are the minimums. */
export const COUNT = { min: 5, max: 50, step: 5 } as const
export const MINS = { min: 1, max: 10, step: 1 } as const
export type SessionType = 'practice' | 'challenge'

export interface App {
  S: Strings
  lang: Lang
  setLang: (l: Lang) => void
  mode: Mode
  setMode: (m: Mode) => void
  sessionType: SessionType
  setSessionType: (t: SessionType) => void
  practiceCount: number
  setPracticeCount: (n: number) => void
  challengeMins: number
  setChallengeMins: (n: number) => void
  showCue: boolean
  setShowCue: (on: boolean) => void
  autoSpeak: boolean
  setAutoSpeak: (on: boolean) => void
  showGuide: boolean
  setShowGuide: (on: boolean) => void
  showNums: boolean
  setShowNums: (on: boolean) => void
  gens: number[]
  toggleGen: (n: number) => void
  /** dex numbers in the selected generations */
  ids: number[]
  progress: Progress
  /** when each name was last answered, which with its box says when it is due */
  seen: Seen
  /** one answer: moves the name between Leitner boxes and restarts its interval */
  grade: (id: number, correct: boolean) => void
  /** `${mode}-${minutes}` → most correct in one challenge */
  best: Record<string, number>
  setBest: (key: string, n: number) => void
  openSettings: () => void
}

export const AppContext = createContext<App | null>(null)

export function useApp(): App {
  const app = useContext(AppContext)
  if (!app) throw new Error('useApp outside <AppContext>')
  return app
}
