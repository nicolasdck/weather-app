import { useCallback, useEffect, useRef, useState } from 'react'

/** Délai au-delà duquel on recharge même si le nouveau service worker ne s'est pas signalé. */
const RELOAD_FALLBACK_MS = 4000

export interface UseServiceWorkerUpdateResult {
  /** Vrai lorsqu'une nouvelle version est installée et attend d'être activée. */
  updateAvailable: boolean
  /** Vrai entre le clic sur « Recharger » et le rechargement effectif. */
  isUpdating: boolean
  /** Active la nouvelle version puis recharge la page. */
  applyUpdate: () => void
}

/** Enregistre le service worker (uniquement en production, pour ne pas gêner le HMR). */
export function useServiceWorkerUpdate(): UseServiceWorkerUpdateResult {
  const [updateAvailable, setUpdateAvailable] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const registrationRef = useRef<ServiceWorkerRegistration | null>(null)
  const reloadRequested = useRef(false)

  useEffect(() => {
    if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return

    let cancelled = false

    // On relit toujours l'état réel de l'enregistrement : un worker mémorisé peut avoir été
    // remplacé entre-temps par un déploiement plus récent. Sans contrôleur actif, il s'agit
    // de la toute première installation : rien à signaler.
    const sync = () => {
      const registration = registrationRef.current
      if (cancelled || !registration) return
      setUpdateAvailable(Boolean(registration.waiting) && Boolean(navigator.serviceWorker.controller))
    }

    const track = (worker: ServiceWorker | null) => {
      worker?.addEventListener('statechange', sync)
    }

    const handleControllerChange = () => {
      if (reloadRequested.current) window.location.reload()
      else sync()
    }

    // Une PWA installée reste ouverte longtemps : on revérifie à chaque retour au premier plan.
    const handleVisibilityChange = () => {
      if (document.visibilityState !== 'visible') return
      sync()
      registrationRef.current?.update().catch(() => undefined)
    }

    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        if (cancelled) return
        registrationRef.current = registration
        track(registration.installing)
        track(registration.waiting)
        sync()

        registration.addEventListener('updatefound', () => track(registration.installing))
      })
      .catch((error: unknown) => {
        console.error("Échec de l'enregistrement du service worker :", error)
      })

    return () => {
      cancelled = true
      navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])

  const applyUpdate = useCallback(() => {
    reloadRequested.current = true
    setIsUpdating(true)

    const waiting = registrationRef.current?.waiting
    if (!waiting) {
      // La nouvelle version est déjà active : il ne reste qu'à recharger.
      window.location.reload()
      return
    }

    waiting.postMessage({ type: 'SKIP_WAITING' })
    // Le rechargement normal vient de `controllerchange` ; ceci évite un bouton sans effet.
    window.setTimeout(() => window.location.reload(), RELOAD_FALLBACK_MS)
  }, [])

  return { updateAvailable, isUpdating, applyUpdate }
}
