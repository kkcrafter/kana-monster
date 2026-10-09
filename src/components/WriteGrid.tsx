// The writing band: one canvas per kana over a tracing guide, and a single ink layer on top that
// takes every pointer event and routes each stroke to the cell it starts in.
import { useImperativeHandle, useLayoutEffect, useRef, useState, type PointerEvent, type Ref } from 'react'
import { useApp } from '../AppContext'
import { STROKES } from '../data/strokes'
import { UNDO_KEY } from '../lib/useHotkeys'
import { Icon } from './ui'

export interface GridHandle {
  /** clear the most recently written character */
  undo: () => void
  clearAll: () => void
}

interface Props {
  chars: string[]
  guide: boolean
  nums: boolean
  /** answer shown: no more per-cell clearing */
  done: boolean
  ref: Ref<GridHandle>
}

export function WriteGrid({ chars, guide, nums, done, ref }: Props) {
  const { S } = useApp()
  const band = useRef<HTMLDivElement>(null)
  const cells = useRef<(HTMLDivElement | null)[]>([])
  const canvases = useRef<(HTMLCanvasElement | null)[]>([])
  const order = useRef<number[]>([])   // cells by most recent stroke, latest last — what ⌘Z / Ctrl+Z walks back through
  const active = useRef(-1)            // the cell the current stroke started in
  const [size, setSize] = useState(0)
  const [inked, setInked] = useState(() => chars.map(() => false))
  const [hover, setHover] = useState(-1)

  // Fewest rows that keep each cell at least `least` wide, filled evenly. On a phone a fingertip
  // covers a 60px cell, so a long name wraps onto a second row rather than shrinking.
  useLayoutEffect(() => {
    const room = band.current!.parentElement!.clientWidth - 12   // the band's side padding
    const [least, most] = matchMedia('(min-width: 900px)').matches ? [48, 96] : [88, 120]   // web: mouse, one row
    const fit = (across: number) => Math.floor((room - (across - 1) * 8) / across)   // 8px gaps
    let rows = 1
    while (rows < chars.length && fit(Math.ceil(chars.length / rows)) < least) rows++
    setSize(Math.min(most, fit(Math.ceil(chars.length / rows))))
  }, [chars.length])

  // Sized here rather than in JSX: setting a canvas's width wipes its drawing state.
  useLayoutEffect(() => {
    const dpr = window.devicePixelRatio || 1
    for (const c of canvases.current) {
      if (!c) continue
      c.width = c.height = size * dpr
      const ctx = c.getContext('2d')!
      ctx.scale(dpr, dpr)
      ctx.lineWidth = 4
      ctx.lineCap = ctx.lineJoin = 'round'
    }
  }, [size])

  const ctx = (i: number) => canvases.current[i]!.getContext('2d')!
  const at = (i: number, e: PointerEvent): [number, number] => {
    const r = canvases.current[i]!.getBoundingClientRect()
    return [e.clientX - r.left, e.clientY - r.top]
  }
  const cellAt = (e: PointerEvent, side: number, above: number, below: number) => cells.current.findIndex((c) => {
    const r = c!.getBoundingClientRect()
    return e.clientX >= r.left - side && e.clientX <= r.right + side && e.clientY >= r.top - above && e.clientY <= r.bottom + below
  })
  const clear = (i: number) => {
    ctx(i).clearRect(0, 0, size, size)
    setInked(a => a.with(i, false))
  }

  useImperativeHandle(ref, () => ({
    undo() {
      // cells already cleared another way are skipped
      const o = order.current
      while (o.length && !inked[o.at(-1)!]) o.pop()
      const i = o.pop()
      if (i !== undefined) clear(i)
    },
    clearAll: () => chars.forEach((_, i) => clear(i)),
  }))

  function begin(e: PointerEvent<HTMLDivElement>) {
    const i = active.current = cellAt(e, 0, 0, 0)   // a stroke belongs to the cell it starts in
    if (i < 0) return
    e.currentTarget.setPointerCapture(e.pointerId)
    order.current = [...order.current.filter(c => c !== i), i]
    setInked(a => (a[i] ? a : a.with(i, true)))
    const c = ctx(i)
    c.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--ink').trim()
    c.beginPath()
    c.moveTo(...at(i, e))
    c.lineTo(...at(i, e))   // a tap alone should leave a dot
    c.stroke()
  }

  function move(e: PointerEvent) {
    const i = active.current
    if (i >= 0) { ctx(i).lineTo(...at(i, e)); ctx(i).stroke() }
    // generous zone: the strip below holds the ↺ button, the strip above the dakuten numbers
    setHover(i >= 0 ? i : cellAt(e, 4, 10, 38))
  }

  return (
    <div ref={band} className={`cells${guide ? '' : ' noguide'}${nums ? '' : ' nonums'}${done ? ' done' : ''}`}>
      {size > 0 && chars.map((ch, i) => (
        <div key={i} ref={(el) => { cells.current[i] = el }} className={i === hover ? 'cell hover' : 'cell'} style={{ width: size, height: size }}>
          <StrokeGuide ch={ch} size={size} />
          <canvas ref={(el) => { canvases.current[i] = el }} style={{ width: size, height: size }} />
          <button className="cell-clear" hidden={!inked[i]} title={`${S.clearOne} (${UNDO_KEY})`} aria-label={S.clearOne} onClick={() => clear(i)}>
            <Icon name="undo" size={14} width={2.4} />
          </button>
        </div>
      ))}
      <div className="ink-layer" onPointerDown={begin} onPointerMove={move}
        onPointerUp={() => { active.current = -1 }} onPointerCancel={() => { active.current = -1 }}
        onPointerLeave={() => { if (active.current < 0) setHover(-1) }} />
    </div>
  )
}

// KanjiVG strokes with their numbers; the plain glyph for a character KanjiVG lacks.
function StrokeGuide({ ch, size }: { ch: string; size: number }) {
  const strokes = STROKES[ch]

  if (!strokes) return <div className="guide" style={{ fontSize: Math.round(size * 0.66) }}>{ch}</div>
  return (
    <div className="guide">
      <svg viewBox="0 0 109 109" className="strokes">
        {strokes.p.map((d, i) => <path key={i} d={d} />)}
        {/* KanjiVG's own label spots: the dakuten pair is staggered on purpose and pokes slightly above the cell */}
        {strokes.n.map(([x, y], i) => <text key={i} x={x} y={y}>{i + 1}</text>)}
      </svg>
    </div>
  )
}
