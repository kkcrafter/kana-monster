import { createContext, useContext } from 'react'
import type { Lang, Strings } from './i18n'
import type { Progress } from './lib/deck'

export type Mode = 'read' | 'write'
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
  /** one answer: moves the name between Leitner boxes */
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
