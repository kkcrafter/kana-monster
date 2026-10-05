// Write mode: see the romaji, handwrite the katakana, then rate yourself against the answer.
// Self-rating, flashcard style: mouse and trackpad strokes are too imprecise to grade automatically.
import { useRef, useState } from 'react'
import { useApp } from '../AppContext'
import { nameOf } from '../lib/deck'
import { isKana, toRomaji } from '../lib/romaji'
import { speak } from '../lib/speech'
import { UNDO_KEY, useHotkeys } from '../lib/useHotkeys'
import { Icon, Kbd, PlayButton, Sprite } from './ui'
import { WriteGrid, type GridHandle } from './WriteGrid'

interface Props {
  id: number
  onReveal: () => void
  /** called once, with the self-rating */
  onRate: (correct: boolean) => void
}

export function WriteCard({ id, onReveal, onRate }: Props) {
  const { S, showCue, autoSpeak, showGuide, setShowGuide, showNums, setShowNums } = useApp()
  const name = nameOf(id)
  const chars = [...name.ja].filter(isKana)
  const grid = useRef<GridHandle>(null)
  const [done, setDone] = useState(false)

  function finish() {
    if (done) return
    if (autoSpeak) speak(name.ja)
    setDone(true)
    onReveal()
  }
  const rate = (correct: boolean) => { if (done) onRate(correct) }

  useHotkeys({
    enter: done ? () => rate(true) : finish,
    undo: done ? undefined : () => grid.current?.undo(),
    space: () => name.ja,   // the reading is already on screen as romaji
    screen: done,
  })

  const chip = (on: boolean, label: string, flip: () => void) =>
    <button className="chip" aria-pressed={on} onClick={flip}>{label}</button>

  // The grid keeps its place among the card body's children, so the strokes survive the reveal.
  return (
    <>
      <div className="card-body center">
        {done ? <Sprite id={id} alt={name.en} kind="art" /> : <>
          {showCue && <Sprite id={id} kind="cue" />}
          <p className="prompt-label">{S.writePrompt}</p>
          <div className="prompt-line">
            <span className="romaji-prompt">{toRomaji(name.ja)}</span>
            <button className="round" aria-label={S.play} onClick={() => speak(name.ja)}><Icon name="speaker" size={18} /></button>
          </div>
          <p className="muted">{S.writeCount(chars.length)}</p>
        </>}
        {/* the faint glyph under your strokes is the comparison, so the guide comes back on reveal */}
        <WriteGrid ref={grid} chars={chars} guide={showGuide || done} nums={showNums} done={done} />
        {done ? <>
          <div className="answer-name">
            <span className="romaji-big">{toRomaji(name.ja)}</span>
            <span className="muted">{name.en}</span>
          </div>
          <PlayButton ja={name.ja} />
        </> : (
          <div className="chips">
            {chip(showGuide, S.guide, () => setShowGuide(!showGuide))}
            {chip(showNums, S.numbers, () => setShowNums(!showNums))}
            <button className="chip" onClick={() => grid.current?.undo()}>
              <Icon name="undo" size={16} width={2.4} />{S.undo}<span className="chip-key">{UNDO_KEY}</span>
            </button>
          </div>
        )}
      </div>
      <div className="card-actions">
        <div className="row">
          {done ? <>
            <button className="btn secondary" onClick={() => rate(false)}>{S.missed}</button>
            <button className="btn primary" onClick={() => rate(true)}>{S.gotIt}<Kbd dark>⏎</Kbd></button>
          </> : <>
            <button className="btn secondary" onClick={() => grid.current?.clearAll()}>{S.clearAll}</button>
            <button className="btn primary" onClick={finish}>{S.done}<Kbd dark>⏎</Kbd></button>
          </>}
        </div>
      </div>
    </>
  )
}
