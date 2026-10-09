// A running set. Practice: a fixed set of N, untimed, ending in a summary with review / redo / new set.
// Challenge: one countdown over the whole run, counting how many you get right.
import { useEffect, useState } from 'react'
import { useApp, type SessionType } from '../AppContext'
import { counts, drawSet, isNewBest, nameOf, pick, shuffle } from '../lib/deck'
import { toRomaji } from '../lib/romaji'
import { UNDO_KEY, useHotkeys } from '../lib/useHotkeys'
import { ReadCard } from './ReadCard'
import { Summary } from './Summary'
import { Icon, Kbd, Shortcuts } from './ui'
import { WriteCard } from './WriteCard'

export interface Result { id: number; ja: string; correct: boolean; answer: string }

export interface Run {
  type: SessionType
  /** practice: the whole set, drawn up front so "redo" can replay exactly the same questions */
  queue: number[]
  results: Result[]
  /** challenge: when time runs out; 0 until started */
  endsAt: number
  startLearned: number
  /** the finished run whose summary a one-word retry returns to */
  parent: Run | null
  newBest: boolean
}

interface State {
  run: Run
  phase: 'intro' | 'card' | 'summary'
  /** the card up: `at` its index in the set, `seq` remounts it per question */
  card: { id: number; at: number; seq: number } | null
  /** the write card's answer is showing (changes what Enter does) */
  revealed: boolean
}

let seq = 0

/** queue: a fixed practice set (a review picked in the learning history) instead of the home settings */
export function Session({ onExit, queue }: { onExit: () => void; queue?: number[] }) {
  const app = useApp()
  const { S, mode, ids, progress, seen } = app
  const bestKey = `${mode}-${app.challengeMins}`
  const [s, setS] = useState<State>(() => (queue ? begin('practice', queue) : begin(app.sessionType)))
  const { run, phase, card } = s

  function begin(type: SessionType, queue?: number[], parent: Run | null = null): State {
    const next: Run = {
      type, queue: type === 'practice' ? queue ?? shuffle(drawSet(ids, progress, seen, app.practiceCount)) : [],
      results: [], endsAt: 0, parent, newBest: false,
      startLearned: parent?.startLearned ?? counts(ids, progress).learned,
    }
    return type === 'practice' ? ask(next) : { run: next, phase: 'intro', card: null, revealed: false }
  }

  function ask(r: Run): State {
    if (r.type === 'practice' && r.results.length >= r.queue.length) return finish(r)
    const id = r.type === 'practice' ? r.queue[r.results.length] : pick(ids, progress, seen, new Set(r.results.map(x => x.id)))
    return { run: r, phase: 'card', card: { id, at: r.results.length, seq: ++seq }, revealed: false }
  }

  // Scores the challenge once; a retry goes back to its parent's summary, already scored.
  function finish(r: Run): State {
    if (r.parent) return { run: r.parent, phase: 'summary', card: null, revealed: false }
    if (r.type === 'challenge') {
      const correct = r.results.filter(x => x.correct).length
      const newBest = isNewBest(correct, app.best[bestKey])
      if (newBest) app.setBest(bestKey, correct)
      r = { ...r, newBest }
    }
    return { run: r, phase: 'summary', card: null, revealed: false }
  }

  // One answer, scored once: moves the name between Leitner boxes and records it for this set.
  function record(correct: boolean, answer = ''): Run {
    const { id } = card!
    app.grade(id, correct)
    return { ...run, results: [...run.results, { id, ja: nameOf(id).ja, correct, answer }] }
  }

  const startChallenge = () => setS(ask({ ...run, endsAt: Date.now() + app.challengeMins * 60000 }))

  useHotkeys({ escape: onExit, enter: phase === 'intro' ? startChallenge : undefined })

  useEffect(() => { scrollTo(0, 0) }, [phase])

  const right = run.results.filter(r => r.correct).length
  const top = app.best[bestKey]
  // Only the keys that work right now: Space would give a reading away before it's answered, and
  // once a written answer is up there is nothing left for ⌘Z to clear.
  const write = mode === 'write' && phase === 'card'
  const keys: [string, string][] = [
    ['⏎', write ? (s.revealed ? S.gotIt : S.keyWriteDone) : S.keyEnter],
    ...(write && !s.revealed ? [[UNDO_KEY, S.keyUndo] as [string, string]] : []),
    ...(write || s.revealed ? [['Space', S.keySpace] as [string, string]] : []),
    ['Esc', S.keyEsc],
  ]

  return (
    <div className="view">
      <header className="bar session-bar">
        <button className="exit" aria-label={S.exit} onClick={onExit}><Icon name="close" size={22} /><span className="wide-only">{S.exit}</span></button>
        {run.type === 'practice'
          ? <PracticeTrack run={run} at={card?.at ?? null} right={right} />
          : <TimeBar endsAt={run.endsAt} running={phase === 'card'} onTimeUp={() => setS(finish(run))} />}
      </header>
      {run.type === 'challenge' && (
        <div className="subbar"><b>{S.score(right)}</b><span>{top == null ? '' : S.bestShort(top)}</span></div>
      )}
      <main className="session">
        <section className="card">
          {phase === 'intro' && <>
            <div className="card-body center">
              <p className="prompt-label">{S.challenge}</p>
              <p className="intro">{S.intro(app.challengeMins, mode === 'write')}</p>
              <p className="muted">{top == null ? S.noBest : S.best(top)}</p>
            </div>
            <div className="card-actions">
              <button className="btn primary" onClick={startChallenge}>{S.start}<Kbd dark>⏎</Kbd></button>
            </div>
          </>}
          {phase === 'card' && card && (mode === 'read'
              ? <ReadCard key={card.seq} id={card.id} challenge={run.type === 'challenge'}
                  onAnswer={(correct, answer) => setS({ ...s, run: record(correct, answer), revealed: true })}
                  onNext={() => setS(ask(run))} />
              : <WriteCard key={card.seq} id={card.id}
                  onReveal={() => setS({ ...s, revealed: true })}
                  onRate={(correct) => setS(ask(record(correct)))} />)}
          {phase === 'summary' && (
            <Summary run={run} bestKey={bestKey} onExit={onExit}
              onStart={(type, queue, parent) => setS(begin(type, queue, parent))} />
          )}
        </section>
        <aside className="session-side wide-only">
          {run.results.length > 0 && (
            <section className="panel">
              <h2 className="label">{S.history}</h2>
              <ol className="history">
                {run.results.map((r, i) => (
                  <li key={i}>
                    <span className="muted">{i + 1}</span>
                    <span className="h-name"><b lang="ja">{r.ja}</b><small>{toRomaji(r.ja)}</small></span>
                    <span className={r.correct ? 'ok' : 'no'}>{r.correct ? S.right : S.wrong}</span>
                  </li>
                ))}
              </ol>
            </section>
          )}
          <section className="panel">
            <h2 className="label">{S.keys}</h2>
            <Shortcuts keys={keys} />
          </section>
        </aside>
      </main>
    </div>
  )
}

// One segment per question: green right, red wrong, dark for the one up (`at`, null on the summary).
function PracticeTrack({ run, at, right }: { run: Run; at: number | null; right: number }) {
  const { S } = useApp()
  const { results, queue } = run
  const n = Math.min(at === null ? results.length : at + 1, queue.length)
  return <>
    <div className="track">
      {queue.map((_, i) => (
        <span key={i} className={i < results.length ? (results[i].correct ? 'ok' : 'no') : i === at ? 'now' : ''} />
      ))}
    </div>
    <span className="count">
      <span className="narrow-only">{n} / {queue.length}</span>
      <span className="wide-only">{S.progressWide(n, queue.length, right)}</span>
    </span>
  </>
}

// Time left. Wall-clock based, so a throttled background tab still ends on time.
function TimeBar({ endsAt, running, onTimeUp }: { endsAt: number; running: boolean; onTimeUp: () => void }) {
  const { challengeMins } = useApp()
  const [now, setNow] = useState(Date.now)
  useEffect(() => {
    if (!running) return
    const timer = setInterval(() => setNow(Date.now()), 250)
    return () => clearInterval(timer)
  }, [running])
  useEffect(() => { if (running && now >= endsAt) onTimeUp() })

  const total = challengeMins * 60000
  const leftMs = endsAt ? Math.min(total, Math.max(0, endsAt - now)) : total
  const left = Math.ceil(leftMs / 1000)
  return <>
    <div className="track timed"><span className="time" style={{ width: `${100 * leftMs / total}%` }} /></div>
    <span className="count">
      <span className={`clock${endsAt && left <= 10 ? ' low' : ''}`}>{Math.floor(left / 60)}:{String(left % 60).padStart(2, '0')}</span>
    </span>
  </>
}
