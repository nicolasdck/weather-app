import { useCallback, useEffect, useRef, useState } from 'react'

export interface UseServiceWorkerUpdateResult {
  /** Vrai lorsqu'une nouvelle version est installée et attend d'être activée. */
  updateAvailable: boolean
  /** Active la nouvelle version puis recharge la page. */
  applyUpdate: () => void
}

/** Enregistre le service worker (uniquement en production, pour ne pas gêner le HMR). */
export function useServiceWorkerUpdate(): UseServiceWorkerUpdateResult {
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null)
  const reloadRequested = useRef(false)

  useEffect(() => {
    if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return

    let cancelled = false
    let registration: ServiceWorkerRegistration | null = null

    // Sans contrôleur actif, il s'agit de la toute première installation : rien à signaler.
    const reportIfWaiting = (worker: ServiceWorker | null) => {
      if (!cancelled && worker && worker.state === 'installed' && navigator.serviceWorker.controller) {
        setWaitingWorker(worker)
      }
    }

    const handleControllerChange = () => {
      if (reloadRequested.current) window.location.reload()
    }

    // Une PWA installée reste ouverte longtemps : on revérifie à chaque retour au premier plan.
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        registration?.update().catch(() => undefined)
      }
    }

    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    navigator.serviceWorker
      .register('/sw.js')
      .then((result) => {
        if (cancelled) return
        registration = result
        reportIfWaiting(result.waiting)

        result.addEventListener('updatefound', () => {
          const installing = result.installing
          installing?.addEventListener('statechange', () => reportIfWaiting(installing))
        })
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
    if (!waitingWorker) return
    reloadRequested.current = true
    waitingWorker.postMessage({ type: 'SKIP_WAITING' })
  }, [waitingWorker])

  return { updateAvailable: waitingWorker !== null, applyUpdate }
}
