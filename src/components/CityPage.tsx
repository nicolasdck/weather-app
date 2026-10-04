import type { WeatherEntry, WeatherLocation } from '../types/weather'
import { CurrentWeather } from './CurrentWeather'
import { DailyForecast } from './DailyForecast'
import { HourlyForecast } from './HourlyForecast'
import { ErrorMessage } from './StatusMessages'
import { WeatherSkeleton } from './WeatherSkeleton'

interface CityPageProps {
  location: WeatherLocation
  /** Absente tant que la météo de cette ville n'a pas été demandée. */
  entry: WeatherEntry | undefined
  onRefresh: () => void
  onRemove: () => void
}

/** Écran d'une ville dans le carrousel. */
export function CityPage({ location, entry, onRefresh, onRemove }: CityPageProps) {
  const data = entry?.data

  return (
    <section aria-label={location.name} className="w-full shrink-0 snap-center snap-always px-4 pb-4">
      <div className="mx-auto max-w-2xl space-y-4">
        {data ? (
          <>
            <CurrentWeather
              data={data}
              isRefreshing={entry?.status === 'loading'}
              onRefresh={onRefresh}
              onRemove={onRemove}
            />
            <HourlyForecast hours={data.hourly} />
            <DailyForecast days={data.daily} />
          </>
        ) : entry?.status === 'error' ? (
          <ErrorMessage
            title={location.name}
            message={entry.error ?? 'Une erreur inattendue est survenue.'}
            onRetry={onRefresh}
            onRemove={onRemove}
          />
        ) : (
          <WeatherSkeleton />
        )}
      </div>
    </section>
  )
}
