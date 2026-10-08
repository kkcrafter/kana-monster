import { useEffect, useMemo, useRef, useState } from 'react'
import { AppContext, type App as AppState, type Mode, type SessionType } from './AppContext'
import { History, type HistoryState } from './components/History'
import { Home } from './components/Home'
import { Session } from './components/Session'
import { SettingsSheet } from './components/SettingsSheet'
import { I18N, type Lang } from './i18n'
import { buildDeck, GENS, nextBox, type Progress } from './lib/deck'
import { preloadIcons } from './lib/icons'
import { stopSpeaking } from './lib/speech'
import { KEYS } from './lib/storage'
import { useStored } from './lib/useStored'

const inRange = (lo: number, hi: number) => (v: unknown) => Number.isInteger(v) && (v as number) >= lo && (v as number) <= hi
const isBool = (v: unknown) => typeof v === 'boolean'
const isGens = (v: unknown) => Array.isArray(v) && v.length > 0 && v.every(inRange(1, GENS.length))

type View = { at: 'home' } | { at: 'history'; saved?: HistoryState } | { at: 'session'; queue?: number[]; from?: HistoryState }

export function App() {
  const [lang, setLang] = useStored<Lang>(KEYS.lang, 'zh', (v) => typeof v === 'string' && v in I18N)
  const [mode, setMode] = useStored<Mode>(KEYS.mode, 'read', (v) => v === 'read' || v === 'write')
  const [sessionType, setSessionType] = useStored<SessionType>(KEYS.session, 'practice', (v) => v === 'practice' || v === 'challenge')
  const [practiceCount, setPracticeCount] = useStored(KEYS.count, 10, inRange(5, 100))
  const [challengeMins, setChallengeMins] = useStored(KEYS.mins, 1, inRange(1, 30))
  const [showCue, setShowCue] = useStored(KEYS.cue, true, isBool)        // image as cue (easy, the default) vs reveal-only
  const [autoSpeak, setAutoSpeak] = useStored(KEYS.speak, false, isBool) // the play button works either way
  const [showGuide, setShowGuide] = useStored(KEYS.guide, true, isBool)
  const [showNums, setShowNums] = useStored(KEYS.nums, true, isBool)
  const [gens, setGens] = useStored<number[]>(KEYS.gens, [1], isGens)
  const [progress, setProgress] = useStored<Progress>(KEYS.progress, {})
  const [best, setBestMap] = useStored<Record<string, number>>(KEYS.best, {})
  const [view, setView] = useState<View>({ at: 'home' })
  const settings = useRef<HTMLDialogElement>(null)
  const ids = useMemo(() => buildDeck(gens), [gens])
  const S = I18N[lang]

  useEffect(() => { document.documentElement.lang = S.htmlLang }, [S])
  // after the first screen is up, so the icons don't compete with it
  useEffect(() => {
    const t = setTimeout(() => preloadIcons(ids), 1000)
    return () => clearTimeout(t)
  }, [ids])

  const app: AppState = {
    S, lang, setLang, mode, setMode, sessionType, setSessionType,
    practiceCount, setPracticeCount, challengeMins, setChallengeMins,
    showCue, setShowCue, showGuide, setShowGuide, showNums, setShowNums,
    autoSpeak, setAutoSpeak: (on) => { setAutoSpeak(on); if (!on) stopSpeaking() },
    gens, ids, progress, best,
    // keep at least one generation in the deck
    toggleGen: (n) => setGens(g => (g.includes(n) ? (g.length > 1 ? g.filter(x => x !== n) : g) : [...g, n].sort((a, b) => a - b))),
    grade: (id, correct) => setProgress(p => ({ ...p, [id]: nextBox(p[id], correct) })),
    setBest: (key, n) => setBestMap(b => ({ ...b, [key]: n })),
    openSettings: () => settings.current?.showModal(),
  }

  const home = () => setView({ at: 'home' })
  const history = () => setView({ at: 'history' })
  return (
    <AppContext value={app}>
      {view.at === 'session'
        // a review goes back to the history it was picked from, as it was left
        ? <Session queue={view.queue} onExit={() => { stopSpeaking(); setView(view.from ? { at: 'history', saved: view.from } : { at: 'home' }) }} />
        : view.at === 'history'
          ? <History saved={view.saved} onBack={home} onReview={(queue, from) => setView({ at: 'session', queue, from })} />
          : <Home onStart={() => setView({ at: 'session' })} onHistory={history} />}
      <SettingsSheet ref={settings} />
    </AppContext>
  )
}
