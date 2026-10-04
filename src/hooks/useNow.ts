import { useEffect, useState } from 'react'

/** Horodatage courant (ms), rafraîchi à intervalle régulier pour les affichages relatifs. */
export function useNow(intervalMs = 60_000): number {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), intervalMs)
    return () => window.clearInterval(timer)
  }, [intervalMs])

  return now
}
