import { CalendarDays, Droplet } from 'lucide-react'
import type { DailyForecastItem } from '../types/weather'
import { formatDayLabel, formatDayMonth, formatTemperature } from '../utils/format'
import { getWeatherLabel } from '../utils/wmoCodes'
import { GlassCard } from './GlassCard'
import { WeatherIcon } from './WeatherIcon'

interface DailyForecastProps {
  days: DailyForecastItem[]
}

export function DailyForecast({ days }: DailyForecastProps) {
  const weekMin = Math.min(...days.map((day) => day.temperatureMin))
  const weekMax = Math.max(...days.map((day) => day.temperatureMax))
  const span = Math.max(1, weekMax - weekMin)

  return (
    <GlassCard
      title="Prévisions sur 7 jours"
      icon={<CalendarDays className="size-4" aria-hidden="true" />}
    >
      <ul className="divide-y divide-white/10">
        {days.map((day, index) => {
          const rain = day.precipitationProbabilityMax
          const left = ((day.temperatureMin - weekMin) / span) * 100
          const width = Math.max(6, ((day.temperatureMax - day.temperatureMin) / span) * 100)

          return (
            <li key={day.date} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
              <div className="w-24 shrink-0 sm:w-32">
                <p className="truncate text-sm font-medium text-white">
                  {formatDayLabel(day.date, index)}
                </p>
                <p className="text-xs text-white/55">{formatDayMonth(day.date)}</p>
              </div>

              <WeatherIcon
                code={day.weatherCode}
                className="size-6 shrink-0 text-white"
                strokeWidth={1.75}
              />

              <div className="hidden min-w-0 flex-1 sm:block">
                <p className="truncate text-sm text-white/80">{getWeatherLabel(day.weatherCode)}</p>
              </div>
              <span className="sr-only sm:hidden">{getWeatherLabel(day.weatherCode)}</span>

              <span
                className={`flex w-11 shrink-0 items-center gap-0.5 text-xs tabular-nums ${
                  rain !== null && rain >= 30 ? 'text-sky-200' : 'text-white/45'
                }`}
              >
                <Droplet className="size-3" aria-hidden="true" />
                <span className="sr-only">Risque de pluie</span>
                {rain === null ? '—' : `${Math.round(rain)}%`}
              </span>

              <div className="flex flex-1 items-center gap-2 sm:w-48 sm:flex-none">
                <span className="w-8 text-right text-sm text-white/65 tabular-nums">
                  <span className="sr-only">Minimum </span>
                  {formatTemperature(day.temperatureMin)}
                </span>
                <div className="relative h-1.5 flex-1 rounded-full bg-white/15">
                  <div
                    className="absolute inset-y-0 rounded-full bg-linear-to-r from-sky-300 via-amber-200 to-orange-400"
                    style={{ left: `${Math.min(left, 100 - width)}%`, width: `${width}%` }}
                  />
                </div>
                <span className="w-8 text-sm font-semibold text-white tabular-nums">
                  <span className="sr-only">Maximum </span>
                  {formatTemperature(day.temperatureMax)}
                </span>
              </div>
            </li>
          )
        })}
      </ul>
    </GlassCard>
  )
}
