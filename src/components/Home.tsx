// Home: pick mode, session type and generations, then start.
import { useApp, type Mode } from '../AppContext'
import { I18N, type Lang } from '../i18n'
import { counts, GENS } from '../lib/deck'
import { useHotkeys } from '../lib/useHotkeys'
import { Icon, Kbd, Seg } from './ui'

const LANGS = Object.keys(I18N) as Lang[]
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

export function Home({ onStart }: { onStart: () => void }) {
  const app = useApp()
  const { S, ids, progress, gens } = app
  const practice = app.sessionType === 'practice'
  useHotkeys({ enter: onStart })

  const step = (d: number) => practice
    ? app.setPracticeCount(clamp(app.practiceCount + 5 * d, 5, 100))
    : app.setChallengeMins(clamp(app.challengeMins + d, 1, 30))

  return (
    <div className="view">
      <header className="bar">
        <div className="brand"><span className="logo" lang="ja">カ</span><span className="wordmark">KANA MONSTER</span></div>
        <div className="bar-end">
          <Seg className="lang-seg wide-only" options={LANGS} value={app.lang} onPick={app.setLang} label={(l) => I18N[l].name} />
          <button className="icon-btn" aria-label={S.settings} onClick={app.openSettings}><Icon name="settings" size={22} /></button>
        </div>
      </header>
      <main className="home">
        <section className="home-main">
          <h1 className="home-title wide-only">{S.homeTitle}</h1>
          <section className="group mode-group">
            <h2 className="label">{S.modeLabel}</h2>
            <div className="modes">
              {(['read', 'write'] as Mode[]).map((m) => <ModeCard key={m} mode={m} />)}
            </div>
          </section>
          <section className="group method-group">
            <h2 className="label">{S.methodLabel}</h2>
            <div className="method">
              <Seg options={['practice', 'challenge'] as const} value={app.sessionType} onPick={app.setSessionType} label={(t) => S[t]} />
              <div className="stepper-row">
                <div className="stepper-text">
                  <b>{practice ? S.countTitle : S.minsTitle}</b>
                  <small>{practice ? S.countDesc : S.minsDesc}</small>
                </div>
                <div className="stepper">
                  <button className="step" aria-label={S.less} onClick={() => step(-1)}><Icon name="minus" size={18} width={2.2} /></button>
                  <span className="step-value">
                    {practice ? app.practiceCount : app.challengeMins}<small>{practice ? S.countUnit : S.minsUnit}</small>
                  </span>
                  <button className="step" aria-label={S.more} onClick={() => step(1)}><Icon name="plus" size={18} width={2.2} /></button>
                </div>
              </div>
            </div>
          </section>
          <div className="start-row">
            <button className="btn primary" onClick={onStart}>
              {practice ? S.startPractice(app.practiceCount) : S.startChallenge(app.challengeMins)}<Kbd dark>⏎</Kbd>
            </button>
            <span className="or-press wide-only">{S.orPress} <Kbd>⏎</Kbd></span>
          </div>
        </section>
        <aside className="home-side">
          <Stats />
          <section className="group gens-group">
            <div className="label-row"><h2 className="label">{S.gensLabel}</h2><span className="label-note">{S.gensCount(ids.length)}</span></div>
            <div className="gens">
              {GENS.map(([from, to], i) => {
                const n = i + 1, size = to - from + 1
                let learned = 0
                for (let id = from; id <= to; id++) if (progress[id] >= 4) learned++
                const share = Math.round(100 * learned / size)
                return (
                  <button key={n} className="gen" aria-pressed={gens.includes(n)} onClick={() => app.toggleGen(n)}>
                    <span className="gen-box"><Icon name="check" size={12} width={3.2} /></span>
                    <span className="gen-title"><b>{n}</b><span className="gen-name">{S.gens[i]}</span></span>
                    <span className="gen-bar"><span style={{ width: `${share}%` }} /></span>
                    <span className="gen-pct">{share}%</span>
                  </button>
                )
              })}
            </div>
          </section>
        </aside>
      </main>
    </div>
  )
}

function ModeCard({ mode }: { mode: Mode }) {
  const { S, mode: current, setMode } = useApp()
  const arrow = <span className="arrow">→</span>
  return (
    <button className="mode-card" aria-pressed={mode === current} onClick={() => setMode(mode)}>
      <span className="mode-glyph" lang="ja">
        {mode === 'read' ? <>ア {arrow} a</> : <>a {arrow} <span className="ink">ア</span></>}
      </span>
      <b>{S[mode]}</b>
      <small>{mode === 'read' ? S.readDesc : S.writeDesc}</small>
      {mode === current && <span className="tick"><Icon name="check" size={14} width={3} /></span>}
    </button>
  )
}

function Stats() {
  const { S, ids, progress, gens } = useApp()
  const total = ids.length, c = counts(ids, progress)
  const pct = (n: number) => `${(100 * n / total).toFixed(1)}%`
  const swatch = (kind: string, label: string, n: number) => <span><i className={`swatch ${kind}`} />{label} {n}</span>
  return (
    <section className="panel stats">
      <div className="stats-top">
        <div className="stats-num"><b>{c.learned}</b><span>{S.learnedOf(total)}</span></div>
        <span className="label-note">{S.gensSelected(gens.length)}</span>
      </div>
      <div className="meter">
        <span className="learned" style={{ width: pct(c.learned) }} />
        <span className="learning" style={{ width: pct(c.learning) }} />
      </div>
      <div className="legend">
        {swatch('learned', S.learned, c.learned)}{swatch('learning', S.learning, c.learning)}{swatch('unseen', S.unseen, c.unseen)}
      </div>
    </section>
  )
}
