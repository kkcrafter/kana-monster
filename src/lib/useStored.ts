import { useEffect, useState } from 'react'
import { load, save } from './storage'

/** useState that starts from, and writes back to, localStorage. `valid` rejects stale or foreign values. */
export function useStored<T>(key: string, initial: T, valid: (v: unknown) => boolean = () => true) {
  const [value, setValue] = useState<T>(() => {
    const stored = load<unknown>(key, initial)
    return valid(stored) ? (stored as T) : initial
  })
  useEffect(() => save(key, value), [key, value])
  return [value, setValue] as const
}
