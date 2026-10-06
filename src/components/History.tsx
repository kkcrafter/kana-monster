// Learning history: every name in some generations by Leitner box, to pick some and review them.
import { useEffect, useMemo, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import { useApp } from '../AppContext'
import { buildDeck, GENS, learnedShare, nameOf, shuffle } from '../lib/deck'
import { toRomaji } from '../lib/romaji'
import { useHotkeys } from '../lib/useHotkeys'
import { DexIcon, GenList, Icon, Kbd, Seg } from './ui'

type Tab = 'all' | 'weak' | 'learning' | 'learned'
type Level = Exclude<Tab, 'all'> | 'unseen'
const TABS: Tab[] = ['all', 'weak', 'learning', 'learned']

// Box 1 is only reached by a wrong answer (a first right answer goes straight to 2): "missed last time".
const levelOf = (box?: number): Level => (!box ? 'unseen' : box === 1 ? 'weak' : box < 4 ? 'learning' : 'learned')

/** The page as it was left for a review, to come back to it. */
export type HistoryState = { gens: number[]; tab: Tab; query: string; picked: Set<number>; y: number }

export function History({ saved, onBack, onReview }:
  { saved?: HistoryState; onBack: () => void; onReview: (queue: number[], state: HistoryState) => void }) {
  const app = useApp()
  const { S, progress } = app
  // Starts from the home selection; changing it here leaves the practice deck alone.
  const [gens, setGens] = useState(saved?.gens ?? app.gens)
  const ids = useMemo(() => buildDeck(gens), [gens])
  const [tab, setTab] = useState<Tab>(saved?.tab ?? 'all')
  const [query, setQuery] = useState(saved?.query ?? '')
  const [picked, setPicked] = useState<Set<number>>(() => saved?.picked ?? new Set())

  useEffect(() => { scrollTo(0, saved?.y ?? 0) }, [saved])
  // a back-to-top button once the page is a screen down
  const [far, setFar] = useState(false)
  useEffect(() => {
    const onScroll = () => setFar(scrollY > innerHeight)
    addEventListener('scroll', onScroll, { passive: true })
    return () => removeEventListener('scroll', onScroll)
  }, [])

  const tally = useMemo(() => {
    const t = { all: ids.length, weak: 0, learning: 0, learned: 0, unseen: 0 }
    for (const id of ids) t[levelOf(progress[id])]++
    return t
  }, [ids, progress])

  const q = query.trim().toLowerCase()
  const shown = ids.filter((id) => {
    if (tab !== 'all' && levelOf(progress[id]) !== tab) return false
    if (!q) return true
    const { ja, en } = nameOf(id)
    return ja.includes(q) || toRomaji(ja).includes(q) || en.toLowerCase().includes(q)
  })

  const sections = gens.map((g) => {
    const [from, to] = GENS[g - 1]
    let seen = 0
    for (let id = from; id <= to; id++) if (progress[id]) seen++
    return { g, seen, size: to - from + 1, inGen: shown.filter(id => id >= from && id <= to) }
  }).filter(s => s.inGen.length)

  // Nothing picked: the whole tab as filtered.
  const queue = picked.size ? [...picked] : shown
  const review = () => { if (queue.length) onReview(shuffle(queue), { gens, tab, query, picked, y: scrollY }) }
  // a second press undoes it, for the names on screen
  const allPicked = shown.length > 0 && shown.every(id => picked.has(id))
  const pickAll = () => setPicked((p) => {
    const next = new Set(p)
    for (const id of shown) {
      if (allPicked) next.delete(id)
      else next.add(id)
    }
    return next
  })
  const toggle = (id: number) => setPicked((p) => {
    const next = new Set(p)
    if (!next.delete(id)) next.add(id)
    return next
  })

  // keep at least one generation, as on the home screen
  const toggleGen = (n: number) => setGens(g => (g.includes(n) ? (g.length > 1 ? g.filter(x => x !== n) : g) : [...g, n].sort((a, b) => a - b)))
  // Animate ticking a generation (the sections slide) and land on a heading: the added section,
  // or, if the removed one was under the top of the screen, the one after it (or before).
  const pickGen = (n: number) => {
    const i = sections.findIndex(s => s.g === n)
    const box = document.getElementById(`gen-${n}`)?.getBoundingClientRect()
    const land = !gens.includes(n) ? n : box && box.top <= 0 && box.bottom > 0 ? (sections[i + 1] ?? sections[i - 1])?.g : undefined
    const update = () => {
      flushSync(() => toggleGen(n))
      if (land) document.getElementById(`gen-${land}`)?.scrollIntoView({ block: 'start' })
    }
    if (!document.startViewTransition || matchMedia('(prefers-reduced-motion: reduce)').matches) update()
    else document.startViewTransition(update)
  }
  // jump to a generation's section, showing it first if it was filtered out
  const jumpTo = (n: number) => {
    if (gens.includes(n)) document.getElementById(`gen-${n}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    else pickGen(n)
  }
  const sheet = useRef<HTMLDialogElement>(null)
  const multi = sections.length > 1

  useHotkeys({ escape: onBack, enter: review })

  return (
    <div className="view">
      <header className="bar hist-bar">
        <button className="exit" aria-label={S.home} onClick={onBack}><Icon name="back" size={22} /><span className="wide-only">{S.home}</span></button>
        <h1 className="hist-title">{S.historyTitle}</h1>
        <span className="label-note">{S.historyStats(tally.all - tally.unseen, tally.learned)}</span>
      </header>
      <div className="hist-body">
        {/* web: a sticky card on the right; a name jumps to its section, the box filters */}
        <aside className="hist-gens">
          <div className="label-row"><h2 className="label">{S.gensLabel}</h2><span className="label-note">{S.gensPicked(gens.length)}</span></div>
          {GENS.map((_, i) => {
            const n = i + 1
            return (
              <div key={n} className="gen-row">
                <label className="gen-check">
                  <input type="checkbox" aria-label={S.gens[i]} checked={gens.includes(n)} onChange={() => pickGen(n)} />
                </label>
                <button className="gen-jump" onClick={() => jumpTo(n)}>
                  <b>{n}</b><span className="gen-row-name">{S.gens[i]}</span>
                  <span className="gen-row-pct">{learnedShare(progress, n)}%</span>
                  <Icon name="chevron" size={14} width={2.2} />
                </button>
              </div>
            )
          })}
        </aside>
        <div className="hist-main">
          <div className="hist-tools">
            <div className="search-row">
              <label className="search">
                <Icon name="search" size={18} />
                <input type="search" aria-label={S.search} placeholder={S.searchHint} value={query} onChange={e => setQuery(e.target.value)} />
              </label>
              {/* phone: generations live in a sheet */}
              <button className="btn-sm gen-open" aria-label={`${S.gensLabel} · ${S.gensPicked(gens.length)}`} onClick={() => sheet.current?.showModal()}>
                {S.gensLabel}<span className="badge">{gens.length}</span>
              </button>
              <button className="btn-sm pick-all-top" onClick={pickAll}>{allPicked ? S.unselectAll : S.selectAll}</button>
            </div>
            <div className="seg tabs">
              {TABS.map(t => (
                <button key={t} aria-pressed={t === tab} onClick={() => setTab(t)}>{S[t]}<small>{tally[t]}</small></button>
              ))}
            </div>
          </div>
          <main className="dex">
            {sections.length ? sections.map(({ g, seen, size, inGen }) => (
              <section key={g} id={`gen-${g}`} className="dex-section" style={{ viewTransitionName: `gen-${g}` }}>
                <h2 className={multi ? 'dex-head jumps' : 'dex-head'}>
                  <span className="dex-title">{g} · {S.gens[g - 1]}</span>
                  {/* phone: the sticky heading doubles as the jump menu */}
                  {multi && (
                    <select className="dex-jump" aria-label={S.jumpTo} value={g} onChange={e => jumpTo(Number(e.target.value))}>
                      {sections.map(s => <option key={s.g} value={s.g}>{s.g} · {S.gens[s.g - 1]}</option>)}
                    </select>
                  )}
                  <i /><small>{S.seenOf(seen, size)}</small>
                </h2>
                <div className="dex-grid">
                  {inGen.map(id => <DexTile key={id} id={id} on={picked.has(id)} onToggle={() => toggle(id)} />)}
                </div>
              </section>
            )) : <p className="empty">{S.noMatch}</p>}
          </main>
        </div>
      </div>
      <div className="review-bar">
        {far && <button className="to-top" aria-label={S.toTop} onClick={() => scrollTo({ top: 0, behavior: 'smooth' })}><Icon name="up" size={20} /></button>}
        <div className="review-row">
          <span className="review-info">
            {picked.size ? S.picked(picked.size) : S.nonePicked}
            <button className="link-btn pick-all-bar" onClick={pickAll}>{allPicked ? S.unselectAll : S.selectAll}</button>
            {picked.size > 0 && !allPicked && <button className="link-btn" onClick={() => setPicked(new Set())}>{S.unpick}</button>}
          </span>
          <Seg options={['read', 'write'] as const} value={app.mode} onPick={app.setMode} label={m => S[m]} />
        </div>
        <button className="btn primary" disabled={!queue.length} onClick={review}>
          {picked.size ? S.reviewPicked(picked.size) : S.reviewTab(shown.length)}<Kbd dark>⏎</Kbd>
        </button>
      </div>
      <dialog ref={sheet} className="settings" onClick={(e) => { if (e.target === e.currentTarget) e.currentTarget.close() }}>
        <div className="sheet-grip" />
        <header className="sheet-head">
          <h2>{S.gensLabel} <small className="label-note">{S.gensPicked(gens.length)}</small></h2>
          <button className="link-btn" onClick={() => sheet.current?.close()}>{S.done}</button>
        </header>
        <GenList picked={gens} onToggle={pickGen} />
      </dialog>
    </div>
  )
}

function DexTile({ id, on, onToggle }: { id: number; on: boolean; onToggle: () => void }) {
  const { S, progress } = useApp()
  const box = progress[id] ?? 0
  const level = levelOf(box)
  const seen = level !== 'unseen'
  const { ja } = nameOf(id)
  return (
    <button className={`dex-tile ${level}`} aria-pressed={on} onClick={onToggle}
      aria-label={`${seen ? ja : `#${id}`} · ${S[level]}`}>
      <span className="dex-no">#{String(id).padStart(3, '0')}</span>
      {on && <span className="dex-tick"><Icon name="check" size={11} width={3.4} /></span>}
      <DexIcon id={id} seen={seen} />
      {/* names not met yet stay hidden, like an unregistered dex entry */}
      <span className="dex-name" lang="ja">{seen ? ja : '？？？'}</span>
      <span className="dex-romaji">{seen ? toRomaji(ja) : ''}</span>
      <span className="dex-foot">
        <span className="pips">{[1, 2, 3, 4, 5].map(i => <i key={i} className={i <= box ? 'on' : undefined} />)}</span>
        <span className="dex-level">{S[level]}</span>
      </span>
    </button>
  )
}
