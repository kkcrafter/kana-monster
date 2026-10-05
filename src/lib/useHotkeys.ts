import { useEffect, useLayoutEffect, useRef } from 'react'
import { speak } from './speech'

export interface Hotkeys {
  /** the screen's main action */
  enter?: () => void
  /** the name Space should pronounce, or null where hearing it would give the answer away */
  space?: () => string | null
  undo?: () => void
  escape?: () => void
  /** changes when the screen does (e.g. the answer is revealed); Enter is then ignored for 300 ms, so the
   *  keypress that brought the new screen up can't also act on it */
  screen?: unknown
}

export const UNDO_KEY = /Mac|iPhone|iPad/.test(navigator.platform) ? '⌘Z' : 'Ctrl+Z'

/** Keyboard shortcuts for whichever screen is mounted. Handlers are read fresh on every keypress.
 *  Several screens can be mounted at once (the session and its card); each handles only the keys it is given. */
export function useHotkeys(keys: Hotkeys) {
  const latest = useRef(keys)
  const shownAt = useRef(0)
  useLayoutEffect(() => { latest.current = keys })
  useLayoutEffect(() => { shownAt.current = performance.now() }, [keys.screen])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (document.querySelector('dialog[open]')) return   // the settings sheet keeps its own keys
      const k = latest.current
      const target = e.target instanceof HTMLElement ? e.target : document.body

      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && !e.altKey && (e.key.toLowerCase() === 'z' || e.code === 'KeyZ')) {
        if (!k.undo || target.closest('input, textarea')) return   // inputs keep their own undo
        e.preventDefault()
        k.undo()
        return
      }

      // Space is always pronunciation: it never scrolls, toggles a checkbox or presses a button.
      if (e.key === ' ') {
        if (target.matches('input[type="text"], input[type="search"]')) return   // typing a space; nothing to speak there anyway
        e.preventDefault()
        if (target !== document.body) target.blur()   // keyup would otherwise activate the focused control
        const text = k.space?.()
        if (text && !e.repeat) speak(text)
        return
      }

      if (e.key === 'Escape' && k.escape) { e.preventDefault(); k.escape(); return }

      // Handled here rather than by a focused button, so Enter means the main action, not the last click.
      if (e.key !== 'Enter' || !k.enter || target.closest('input, textarea, select')) return
      if (performance.now() - shownAt.current < 300) return
      e.preventDefault()
      k.enter()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])
}
