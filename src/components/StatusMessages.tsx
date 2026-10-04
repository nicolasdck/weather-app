import { CloudOff, CloudSun, LocateFixed, RotateCcw } from 'lucide-react'
import { GlassCard } from './GlassCard'

const buttonClass =
  'inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/15 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-white/25 active:scale-95'

interface EmptyStateProps {
  /** Explication optionnelle (ex. géolocalisation refusée). */
  notice: string | null
  onLocate: () => void
}

export function EmptyState({ notice, onLocate }: EmptyStateProps) {
  return (
    <GlassCard className="flex flex-col items-center px-6 py-12 text-center">
      <CloudSun className="size-16 text-white" strokeWidth={1.25} aria-hidden="true" />
      <h1 className="mt-4 text-xl font-semibold text-white">Quel temps fait-il ?</h1>
      <p className="mt-2 max-w-sm text-sm text-white/75">
        Recherchez une ville ci-dessus ou utilisez votre position pour afficher la météo.
      </p>
      {notice && (
        <p role="status" className="mt-3 max-w-sm text-sm text-amber-100">
          {notice}
        </p>
      )}
      <button type="button" onClick={onLocate} className={`mt-6 ${buttonClass}`}>
        <LocateFixed className="size-4" aria-hidden="true" />
        Utiliser ma position
      </button>
    </GlassCard>
  )
}

interface ErrorMessageProps {
  message: string
  onRetry?: () => void
}

export function ErrorMessage({ message, onRetry }: ErrorMessageProps) {
  return (
    <GlassCard className="flex flex-col items-center px-6 py-12 text-center">
      <CloudOff className="size-16 text-white" strokeWidth={1.25} aria-hidden="true" />
      <h1 className="mt-4 text-xl font-semibold text-white">Météo indisponible</h1>
      <p role="alert" className="mt-2 max-w-sm text-sm text-white/80">
        {message}
      </p>
      {onRetry && (
        <button type="button" onClick={onRetry} className={`mt-6 ${buttonClass}`}>
          <RotateCcw className="size-4" aria-hidden="true" />
          Réessayer
        </button>
      )}
    </GlassCard>
  )
}
