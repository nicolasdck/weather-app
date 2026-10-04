import { Clock, Droplet } from 'lucide-react'
import type { HourlyForecastItem } from '../types/weather'
import { formatHour, formatTemperature } from '../utils/format'
import { getWeatherLabel } from '../utils/wmoCodes'
import { GlassCard } from './GlassCard'
import { WeatherIcon } from './WeatherIcon'

interface HourlyForecastProps {
  hours: HourlyForecastItem[]
}

export function HourlyForecast({ hours }: HourlyForecastProps) {
  return (
    <GlassCard
      title="Prochaines 24 heures"
      icon={<Clock className="size-4" aria-hidden="true" />}
    >
      {/* `relative` : garde les libellés sr-only (absolus) dans la zone de défilement. */}
      <ul className="scrollbar-none relative -mx-5 flex snap-x gap-2 overflow-x-auto overscroll-x-contain scroll-px-5 px-5 pb-1">
        {hours.map((hour, index) => {
          const rain = hour.precipitationProbability
          return (
            <li
              key={hour.time}
              title={getWeatherLabel(hour.weatherCode)}
              className={`flex w-16 shrink-0 snap-start flex-col items-center gap-2 rounded-2xl border px-2 py-3 ${
                index === 0 ? 'border-white/25 bg-white/20' : 'border-white/10 bg-white/5'
              }`}
            >
              <span className="text-xs font-medium text-white/75">
                {index === 0 ? 'Maint.' : formatHour(hour.time)}
              </span>
              <WeatherIcon
                code={hour.weatherCode}
                isDay={hour.isDay}
                className="size-6 text-white"
                strokeWidth={1.75}
              />
              <span className="sr-only">{getWeatherLabel(hour.weatherCode)}</span>
              <span className="text-base font-semibold text-white tabular-nums">
                {formatTemperature(hour.temperature)}
              </span>
              <span
                className={`flex items-center gap-0.5 text-[11px] tabular-nums ${
                  rain !== null && rain >= 30 ? 'text-sky-200' : 'text-white/45'
                }`}
              >
                <Droplet className="size-3" aria-hidden="true" />
                <span className="sr-only">Risque de pluie</span>
                {rain === null ? '—' : `${Math.round(rain)}%`}
              </span>
            </li>
          )
        })}
      </ul>
    </GlassCard>
  )
}
