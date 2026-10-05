// Read mode: see the katakana, type the romaji, then the answer syllable by syllable.
import { useState, type ReactNode } from 'react'
import { useApp } from '../AppContext'
import { nameOf } from '../lib/deck'
import { diffAnswer, isKana, kanaUnits, matches, toRomaji, type DiffUnit } from '../lib/romaji'
import { speak } from '../lib/speech'
import { useHotkeys } from '../lib/useHotkeys'
import { Icon, Kbd, PlayButton, Sprite } from './ui'

interface Props {
  id: number
  challenge: boolean
  /** called once, when the answer is revealed */
  onAnswer: (correct: boolean, answer: string) => void
  onNext: () => void
}

export function ReadCard({ id, challenge, onAnswer, onNext }: Props) {
  const { S, showCue, autoSpeak } = useApp()
  const name = nameOf(id)
  const [typed, setTyped] = useState('')
  const [shown, setShown] = useState<{ answer: string; correct: boolean } | null>(null)

  useHotkeys({ enter: shown ? onNext : undefined, space: () => (shown ? name.ja : null), screen: !!shown })

  function reveal(answer: string) {
    if (shown) return
    const correct = answer.trim() !== '' && matches(answer, name.ja)
    setShown({ answer: answer.trim(), correct })
    onAnswer(correct, answer.trim())
    if (autoSpeak) speak(name.ja)
  }

  if (!shown) return (
    <>
      <div className="card-body center">
        {showCue && <Sprite id={id} kind="cue" />}
        <p className="prompt-label">{S.readPrompt}</p>
        <div className="kana-big" lang="ja">{name.ja}</div>
        <p className="muted">{S.kanaCount([...name.ja].filter(isKana).length)}</p>
      </div>
      <div className="card-actions">
        <label className="label" htmlFor="answer-input">{S.romajiLabel}</label>
        <input id="answer-input" className="answer-input" type="text" autoCapitalize="off" autoComplete="off"
          autoCorrect="off" spellCheck={false} placeholder="romaji" autoFocus value={typed}
          onChange={(e) => setTyped(e.target.value)}
          onKeyDown={(e) => {
            if (e.key !== 'Enter' || e.nativeEvent.isComposing) return
            e.preventDefault()
            reveal(typed)
          }} />
        <div className="row">
          <button className="btn secondary" onClick={() => reveal('')}>{challenge ? S.pass : S.skip}</button>
          <button className="btn primary" onClick={() => reveal(typed)}>{S.check}<Kbd dark>⏎</Kbd></button>
        </div>
      </div>
    </>
  )

  const { answer, correct } = shown
  const units: DiffUnit[] = !correct && answer ? diffAnswer(name.ja, answer)
    : kanaUnits(name.ja).filter(u => u.romaji.trim()).map(u => ({ ...u, typed: '', ok: true }))
  // the typed answer, with the part belonging to wrong syllables underlined
  const yours = <span>{S.yourAnswer}{units.map((u, i) => (u.ok ? u.typed : <b key={i}>{u.typed}</b>))}</span>

  return (
    <>
      <div className="card-body">
        {correct ? <Banner ok title={S.correctTitle} lines={[S.correctNote]} />
          : answer ? <Banner title={S.wrongTitle} lines={[yours, S.wrongNote]} />
          : <Banner title={S.skippedTitle} lines={[S.wrongNote]} />}
        <div className="answer-main">
          <Sprite id={id} alt={name.en} kind="art" />
          <div className="answer-info">
            <SyllableTiles units={units} />
            <div className="answer-name">
              <span className="romaji-big">{toRomaji(name.ja)}</span>
              <span className="muted">{name.en}</span>
            </div>
            <PlayButton ja={name.ja} />
          </div>
        </div>
      </div>
      <div className="card-actions">
        <button className="btn primary" onClick={onNext}>{S.next}<Kbd dark>⏎</Kbd></button>
      </div>
    </>
  )
}

// A wide note across the top of an answer: what happened, and what it means for the deck.
function Banner({ ok = false, title, lines }: { ok?: boolean; title: string; lines: ReactNode[] }) {
  return (
    <div className={`banner ${ok ? 'ok' : 'no'}`}>
      <Icon name={ok ? 'right' : 'wrong'} size={20} width={2.2} />
      <div><b>{title}</b>{lines.map((l, i) => <small key={i}>{l}</small>)}</div>
    </div>
  )
}

// Each syllable with its romaji; on a wrong answer the wrong ones are marked with what was typed.
function SyllableTiles({ units }: { units: DiffUnit[] }) {
  const { S } = useApp()
  return (
    <div className="tiles">
      {units.map((u, i) => (
        <div className="tile-col" key={i}>
          <div className={u.ok ? 'tile' : 'tile bad'}>
            <span className="tile-kana" lang="ja">{u.kana}</span>
            <span className="tile-romaji">{u.romaji}</span>
          </div>
          <span className="tile-you">{u.ok ? '' : S.you + (u.typed || '–')}</span>
        </div>
      ))}
    </div>
  )
}
