import { useCallback, useEffect, useState } from 'react'

const DISMISS_KEY = 'meteo:install-dismissed-at'
const DISMISS_DURATION_MS = 30 * 24 * 60 * 60 * 1000

/** Événement Chromium absent des types DOM standards. */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  )
}

function isIos(): boolean {
  return (
    /iphone|ipad|ipod/i.test(navigator.userAgent) ||
    // iPadOS se présente comme un Mac.
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  )
}

function wasRecentlyDismissed(): boolean {
  try {
    const dismissedAt = Number(localStorage.getItem(DISMISS_KEY))
    return dismissedAt > 0 && Date.now() - dismissedAt < DISMISS_DURATION_MS
  } catch {
    return false
  }
}

/**
 * `prompt` : le navigateur permet de déclencher l'installation par un bouton.
 * `ios` : installation manuelle via le menu Partager.
 */
export type InstallMode = 'prompt' | 'ios' | null

export interface UsePwaInstallResult {
  mode: InstallMode
  install: () => void
  dismiss: () => void
}

export function usePwaInstall(): UsePwaInstallResult {
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null)
  const [hidden, setHidden] = useState(() => isStandalone() || wasRecentlyDismissed())
  const [ios] = useState(isIos)

  useEffect(() => {
    const handleBeforeInstallPrompt = (event: Event) => {
      // Empêche la mini-barre native pour proposer notre propre bannière.
      event.preventDefault()
      setPromptEvent(event as BeforeInstallPromptEvent)
    }
    const handleInstalled = () => {
      setPromptEvent(null)
      setHidden(true)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleInstalled)
    }
  }, [])

  const dismiss = useCallback(() => {
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()))
    } catch {
      // Stockage indisponible : la bannière réapparaîtra à la prochaine visite.
    }
    setHidden(true)
  }, [])

  const install = useCallback(() => {
    if (!promptEvent) return
    // L'événement n'est utilisable qu'une seule fois.
    setPromptEvent(null)
    promptEvent
      .prompt()
      .then(() => promptEvent.userChoice)
      .then(({ outcome }) => {
        if (outcome === 'dismissed') dismiss()
      })
      .catch((error: unknown) => {
        console.error("Échec de l'invite d'installation :", error)
      })
  }, [promptEvent, dismiss])

  const mode: InstallMode = hidden ? null : promptEvent ? 'prompt' : ios ? 'ios' : null

  return { mode, install, dismiss }
}
