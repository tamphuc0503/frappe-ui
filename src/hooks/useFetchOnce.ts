import { useEffect, useRef } from 'react'

// Runs `effect` exactly once per unique `key`. Solves React StrictMode's
// double-invoke of effects in dev without disabling the safeguard. Pass `''`
// (default) for "run only on mount"; pass a string derived from deps to allow
// legitimate re-fetches when those deps change.
export function useFetchOnce(effect: () => void, key: string = ''): void {
  const lastKeyRef = useRef<string | null>(null)
  useEffect(() => {
    if (lastKeyRef.current === key) return
    lastKeyRef.current = key
    effect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])
}
