// End of a set: score, what was learned, and the missed names to review (all together or one by one).
import { useApp, type SessionType } from '../AppContext'
import { counts, shuffle } from '../lib/deck'
import { toRomaji } from '../lib/romaji'
import { useHotkeys } from '../lib/useHotkeys'
import type { Run } from './Session'
import { Icon, Kbd } from './ui'

interface Props {
  run: Run
  bestKey: string
  onStart: (type: SessionType, queue?: number[], parent?: Run) => void
  onExit: () => void
}

export function Summary({ run, bestKey, onStart, onExit }: Props) {
  const { S, ids, progress, best } = useApp()
  const { type, results } = run
  const practice = type === 'practice'
  const correct = results.filter(r => r.correct).length
  const misses = results.filter(r => !r.correct)
  const nowLearned = counts(ids, progress).learned
  const top = best[bestKey]

  const review = () => onStart('practice', shuffle(misses.map(r => r.id)))
  const newSet = () => onStart(type)
  const redo = () => onStart('practice', shuffle(run.queue))
  const primary = practice && misses.length ? review : newSet
  useHotkeys({ enter: primary })

  return (
    <>
      <div className="card-body summary">
        <div className="summary-head">
          <p className="prompt-label">{practice ? S.setDone : S.timeUp}</p>
          <div className="score">
            <b>{correct}</b>
            <span>{practice ? `/ ${results.length}` : S.attempted(results.length)}</span>
          </div>
          {nowLearned > run.startLearned && (
            <span className="delta"><Icon name="up" size={14} width={2.6} />{S.learnedDelta(run.startLearned, nowLearned)}</span>
          )}
          {!practice && (
            <span className={run.newBest ? 'delta' : 'muted'}>{run.newBest ? S.newBest : top == null ? S.noBest : S.best(top)}</span>
          )}
        </div>
        {misses.length > 0 ? (
          <section className="group">
            <div className="label-row">
              <h2 className="label">{S.reviewCount(misses.length)}</h2>
              <span className="label-note">{S.tapToRetry}</span>
            </div>
            {misses.map((r, i) => (
              <button key={i} className="miss" onClick={() => onStart('practice', [r.id], run)}>
                <span className="miss-text">
                  <span className="miss-kana" lang="ja">{r.ja}</span>
                  <small>{toRomaji(r.ja)}{r.answer && <> · <span className="no">{S.you + r.answer}</span></>}</small>
                </span>
                <Icon name="chevron" size={20} />
              </button>
            ))}
          </section>
        ) : results.length > 0 && <p className="all-correct">{S.allCorrect}</p>}
      </div>
      <div className="card-actions">
        <button className="btn primary" onClick={primary}>
          {practice ? (misses.length ? S.reviewAll(misses.length) : S.newSet) : S.again}<Kbd dark>⏎</Kbd>
        </button>
        {practice ? (
          <div className="row">
            <button className="btn secondary" onClick={redo}>{S.redo}</button>
            {misses.length > 0 && <button className="btn secondary" onClick={newSet}>{S.newSet}</button>}
          </div>
        ) : <button className="btn secondary" onClick={onExit}>{S.home}</button>}
      </div>
    </>
  )
}
