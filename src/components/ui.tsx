// Small shared pieces: icons, key caps, segmented buttons, sprites, the play button.
import { useState, type ReactNode } from 'react'
import { useApp } from '../AppContext'
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
  undo: <><path d="M3.5 15a9 9 0 1 0 2.1-9.4L3 9" /><path d="M3 3v6h6" /></>,
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
