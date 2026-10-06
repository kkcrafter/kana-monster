// Small shared pieces: icons, key caps, segmented buttons, sprites, the play button.
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useApp } from '../AppContext'
import { GENS, learnedShare } from '../lib/deck'
import { ICON_HOSTS } from '../lib/icons'
import { speak } from '../lib/speech'

// Inline stroke icons (24×24), so they take the text colour and need no files.
const ICONS = {
  settings: <><path d="M4 6h10M4 12h4M12 12h8M4 18h12" /><circle cx="17" cy="6" r="2.2" /><circle cx="9.5" cy="12" r="2.2" /><circle cx="18" cy="18" r="2.2" /></>,
  close: <path d="M6 6l12 12M18 6L6 18" />,
  check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  minus: <path d="M6 12h12" />,
  plus: <path d="M6 12h12M12 6v12" />,
  speaker: <><path d="M11 5L6 9H3v6h3l5 4z" /><path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13" /></>,
  chevron: <path d="M9 6l6 6-6 6" />,
  back: <path d="M15 6l-6 6 6 6" />,
  search: <><circle cx="11" cy="11" r="6.5" /><path d="M16 16l4 4" /></>,
  undo: <><path d="M3.5 15a9 9 0 1 0 2.1-9.4L3 9" /><path d="M3 3v6h6" /></>,
  trash: <path d="M4 7h16M9 7V4.5h6V7M6.5 7l1 13h9l1-13" />,
  wrong: <><circle cx="12" cy="12" r="9" /><path d="M9 9l6 6M15 9l-6 6" /></>,
  right: <><circle cx="12" cy="12" r="9" /><path d="M8 12.5l3 3 5-6" /></>,
  up: <path d="M12 19V5M6 11l6-6 6 6" />,
}

export function Icon({ name, size = 20, width = 2 }: { name: keyof typeof ICONS; size?: number; width?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth={width}
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{ICONS[name]}</svg>
  )
}

export const Kbd = ({ children, dark = false }: { children: ReactNode; dark?: boolean }) =>
  <kbd className={dark ? 'kbd on-dark' : 'kbd'}>{children}</kbd>

/** A row of mutually exclusive buttons (practice / challenge, languages). */
export function Seg<T extends string>({ options, value, onPick, label, className = '' }:
  { options: readonly T[]; value: T; onPick: (v: T) => void; label: (v: T) => string; className?: string }) {
  return (
    <div className={`seg ${className}`.trim()}>
      {options.map((o) => <button key={o} aria-pressed={o === value} onClick={() => onPick(o)}>{label(o)}</button>)}
    </div>
  )
}

// Same files, different hosts — raw.githubusercontent.com is blocked on some networks.
const SPRITE_HOSTS = [
  (id: number) => `https://cdn.jsdelivr.net/gh/PokeAPI/sprites@master/sprites/pokemon/other/official-artwork/${id}.png`,
  (id: number) => `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`,
  (id: number) => `https://cdn.jsdelivr.net/gh/PokeAPI/sprites@master/sprites/pokemon/${id}.png`,
]

/** cue: shown with the question; art: shown with the answer. Mount with key={id} if the id can change. */
export function Sprite({ id, alt = '', kind }: { id: number; alt?: string; kind: 'cue' | 'art' }) {
  const { S } = useApp()
  const [attempt, setAttempt] = useState(0)
  if (attempt >= SPRITE_HOSTS.length) return <div className={`sprite ${kind} noimg`}>{S.imgFail}</div>
  return <img className={`sprite ${kind}`} src={SPRITE_HOSTS[attempt](id)} alt={alt} onError={() => setAttempt(attempt + 1)} />
}

/** The small pixel icon in the learning history; a silhouette until the name has been answered. */
export function DexIcon({ id, seen }: { id: number; seen: boolean }) {
  const [attempt, setAttempt] = useState(0)
  const canvas = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    if (attempt >= ICON_HOSTS.length) return
    const img = new Image()
    img.crossOrigin = 'anonymous'   // to read its pixels
    img.onload = () => { if (canvas.current) drawIcon(canvas.current, img) }
    img.onerror = () => setAttempt(attempt + 1)
    img.src = ICON_HOSTS[attempt](id)
  }, [id, attempt])
  if (attempt >= ICON_HOSTS.length) return <span className="dex-icon" />
  return <canvas ref={canvas} className={seen ? 'dex-icon' : 'dex-icon unseen'} />
}

// Box icons draw most first and middle forms in ~20px and final forms in ~40px of a 68×56 frame.
// Grow the small ones to the geometric mean of their size and BIG, so a smaller name never
// outgrows a bigger one, and leave the big ones as they are. Drawn centred in the frame.
const FRAME = [68, 56], BIG = 38
function drawIcon(c: HTMLCanvasElement, img: HTMLImageElement) {
  const { naturalWidth: w, naturalHeight: h } = img
  const scan = document.createElement('canvas')
  scan.width = w
  scan.height = h
  const sx = scan.getContext('2d')!
  sx.drawImage(img, 0, 0)
  const alpha = sx.getImageData(0, 0, w, h).data
  let x0 = w, y0 = h, x1 = -1, y1 = -1
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (!alpha[(y * w + x) * 4 + 3]) continue
      x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y)
    }
  }
  if (x1 < 0) return
  // the 96×96 sprites (after #898) are drawn in pixels about twice a box icon's: halve them first
  const base = w > FRAME[0] ? 0.5 : 1
  const bw = x1 - x0 + 1, bh = y1 - y0 + 1, size = Math.max(bw, bh) * base
  const k = Math.min(base * (size < BIG ? Math.sqrt(BIG / size) : 1), FRAME[0] / bw, FRAME[1] / bh)
  const dpr = Math.ceil(devicePixelRatio || 1)   // draw at screen pixels, so the scaling stays sharp
  c.width = FRAME[0] * dpr
  c.height = FRAME[1] * dpr
  const ctx = c.getContext('2d')!
  ctx.imageSmoothingEnabled = false
  ctx.scale(dpr, dpr)
  ctx.drawImage(img, x0, y0, bw, bh, (FRAME[0] - bw * k) / 2, (FRAME[1] - bh * k) / 2, bw * k, bh * k)
}

/** Generation picker: tiles on a phone, a checklist on the web. Home, and the history's generation sheet. */
export function GenList({ picked, onToggle }: { picked: number[]; onToggle: (n: number) => void }) {
  const { S, progress } = useApp()
  return (
    <div className="gens">
      {GENS.map((_, i) => {
        const n = i + 1, share = learnedShare(progress, n)
        return (
          <button key={n} className="gen" aria-pressed={picked.includes(n)} onClick={() => onToggle(n)}>
            <span className="gen-box"><Icon name="check" size={12} width={3.2} /></span>
            <span className="gen-title"><b>{n}</b><span className="gen-name">
              {/* wrap only between words: after a space or a ・, never inside a title */}
              {S.gens[i].split(/(?<=[\s・])/).map((w, j) => <span key={j} className="nobr">{w}</span>)}
            </span></span>
            <span className="gen-bar"><span style={{ width: `${share}%` }} /></span>
            <span className="gen-pct">{share}%</span>
          </button>
        )
      })}
    </div>
  )
}

export function PlayButton({ ja }: { ja: string }) {
  const { S } = useApp()
  return <button className="pill" onClick={() => speak(ja)}><Icon name="speaker" size={18} />{S.play}<Kbd>Space</Kbd></button>
}

/** A <dl> of key caps and what they do. */
export function Shortcuts({ keys }: { keys: [key: string, what: string][] }) {
  return (
    <dl className="shortcuts">
      {keys.map(([k, what]) => [<dt key={`${k}-k`}><Kbd>{k}</Kbd></dt>, <dd key={`${k}-d`}>{what}</dd>])}
    </dl>
  )
}
