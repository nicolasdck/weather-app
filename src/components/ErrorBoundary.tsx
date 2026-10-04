import { Component } from 'react'
import type { ErrorInfo, ReactNode } from 'react'
import { ErrorMessage } from './StatusMessages'

interface ErrorBoundaryProps {
  children: ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Erreur d'affichage :", error, info.componentStack)
  }

  render() {
    if (!this.state.hasError) return this.props.children

    return (
      <div className="min-h-dvh bg-linear-to-b from-slate-900 via-indigo-950 to-slate-950 px-4 py-10">
        <div className="mx-auto max-w-2xl">
          <ErrorMessage
            message="Une erreur inattendue a interrompu l'affichage. Rechargez l'application pour continuer."
            onRetry={() => window.location.reload()}
          />
        </div>
      </div>
    )
  }
}
