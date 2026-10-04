import { useEffect } from 'react'
import { CurrentWeather } from './components/CurrentWeather'
import { DailyForecast } from './components/DailyForecast'
import { HourlyForecast } from './components/HourlyForecast'
import { SearchBar } from './components/SearchBar'
import { EmptyState, ErrorMessage } from './components/StatusMessages'
import { WeatherSkeleton } from './components/WeatherSkeleton'
import { PwaBanners } from './components/PwaBanners'
import { usePwaInstall } from './hooks/usePwaInstall'
import { useServiceWorkerUpdate } from './hooks/useServiceWorkerUpdate'
import { useWeather } from './hooks/useWeather'

const DAY_THEME_COLOR = '#0ea5e9'
const NIGHT_THEME_COLOR = '#0f172a'

/** Avant les premières données, on se fie à l'heure de l'appareil. */
function isDeviceNight(): boolean {
  const hour = new Date().getHours()
  return hour < 7 || hour >= 20
}

function App() {
  const { state, selectLocation, searchByName, locate, refresh } = useWeather()
  const { status, data, error, notice } = state
  const { mode: installMode, install, dismiss: dismissInstall } = usePwaInstall()
  const { updateAvailable, applyUpdate } = useServiceWorkerUpdate()

  const isNight = data ? !data.current.isDay : isDeviceNight()

  useEffect(() => {
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', isNight ? NIGHT_THEME_COLOR : DAY_THEME_COLOR)
  }, [isNight])

  return (
    <div className="relative min-h-dvh text-white">
      {/* Deux fonds superposés pour un fondu entre les thèmes jour et nuit. */}
      <div
        aria-hidden="true"
        className="fixed inset-0 -z-10 bg-linear-to-b from-sky-500 via-sky-600 to-indigo-700"
      />
      <div
        aria-hidden="true"
        className={`fixed inset-0 -z-10 bg-linear-to-b from-slate-900 via-indigo-950 to-slate-950 transition-opacity duration-1000 ${
          isNight ? 'opacity-100' : 'opacity-0'
        }`}
      />

      <div className="mx-auto flex min-h-dvh max-w-2xl flex-col gap-4 px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        <header>
          <SearchBar onSelect={selectLocation} onSubmitQuery={searchByName} onLocate={locate} />
        </header>

        <main className="flex-1 space-y-4">
          {status === 'loading' && <WeatherSkeleton />}

          {status === 'error' && (
            <ErrorMessage
              message={error ?? 'Une erreur inattendue est survenue.'}
              onRetry={refresh}
            />
          )}

          {status === 'idle' && <EmptyState notice={notice} onLocate={locate} />}

          {status === 'success' && data && (
            <>
              <CurrentWeather data={data} onRefresh={refresh} />
              <HourlyForecast hours={data.hourly} />
              <DailyForecast days={data.daily} />
            </>
          )}
        </main>

        <footer className="text-center text-xs text-white/50">
          Données météo fournies par{' '}
          <a
            href="https://open-meteo.com"
            target="_blank"
            rel="noreferrer"
            className="underline underline-offset-2 hover:text-white/80"
          >
            Open-Meteo
          </a>
        </footer>
      </div>

      <PwaBanners
        installMode={installMode}
        onInstall={install}
        onDismissInstall={dismissInstall}
        updateAvailable={updateAvailable}
        onUpdate={applyUpdate}
      />
    </div>
  )
}

export default App
