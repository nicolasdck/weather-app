import type { ReactNode } from 'react'
import { Download, RefreshCw, Share, X } from 'lucide-react'
import type { InstallMode } from '../hooks/usePwaInstall'

const actionClass =
  'inline-flex shrink-0 items-center gap-1.5 rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-white/90 active:scale-95'

interface BannerProps {
  icon: ReactNode
  title: string
  description: ReactNode
  action?: ReactNode
  onDismiss?: () => void
}

function Banner({ icon, title, description, action, onDismiss }: BannerProps) {
  return (
    <div
      role="status"
      className="pointer-events-auto flex items-center gap-3 rounded-2xl border border-white/20 bg-slate-900/85 p-3 pl-4 text-white shadow-2xl shadow-black/40 backdrop-blur-2xl"
    >
      <span className="shrink-0 text-white/80">{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">{title}</p>
        <p className="text-xs text-white/70">{description}</p>
      </div>
      {action}
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Fermer"
          className="grid size-8 shrink-0 place-items-center rounded-full text-white/70 transition hover:bg-white/15 hover:text-white"
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      )}
    </div>
  )
}

interface PwaBannersProps {
  installMode: InstallMode
  onInstall: () => void
  onDismissInstall: () => void
  updateAvailable: boolean
  onUpdate: () => void
}

export function PwaBanners({
  installMode,
  onInstall,
  onDismissInstall,
  updateAvailable,
  onUpdate,
}: PwaBannersProps) {
  if (!updateAvailable && !installMode) return null

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
      <div className="mx-auto flex max-w-2xl flex-col gap-2">
        {updateAvailable && (
          <Banner
            icon={<RefreshCw className="size-5" aria-hidden="true" />}
            title="Nouvelle version disponible"
            description="Rechargez pour profiter des dernières améliorations."
            action={
              <button type="button" onClick={onUpdate} className={actionClass}>
                Recharger
              </button>
            }
          />
        )}

        {installMode === 'prompt' && (
          <Banner
            icon={<Download className="size-5" aria-hidden="true" />}
            title="Installer l'application"
            description="Accès rapide depuis l'écran d'accueil, même hors ligne."
            action={
              <button type="button" onClick={onInstall} className={actionClass}>
                Installer
              </button>
            }
            onDismiss={onDismissInstall}
          />
        )}

        {installMode === 'ios' && (
          <Banner
            icon={<Download className="size-5" aria-hidden="true" />}
            title="Installer l'application"
            description={
              <>
                Appuyez sur{' '}
                <Share className="inline size-3.5 align-text-bottom" aria-label="Partager" />, puis
                « Sur l'écran d'accueil ».
              </>
            }
            onDismiss={onDismissInstall}
          />
        )}
      </div>
    </div>
  )
}
