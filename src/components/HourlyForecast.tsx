import { Clock, Droplet } from 'lucide-react';
import type { HourlyForecastItem } from '../types/weather';
import { formatHour, formatTemperature } from '../utils/format';
import { getWeatherLabel } from '../utils/wmoCodes';
import { WeatherIcon } from './WeatherIcon';

interface HourlyForecastProps {
	hours: HourlyForecastItem[];
	className?: string;
}

/** Panneau des prochaines 24 heures, affiché dans la carte de la météo actuelle. */
export function HourlyForecast({ hours, className = '' }: HourlyForecastProps) {
	return (
		<section
			className={`rounded-md border border-white/10 bg-white/10 p-2 overflow-x-hidden ${className}`}
		>
			<h2 className="mb-3 flex items-center gap-2 text-xs font-medium tracking-wide text-white/65 uppercase">
				<Clock className="size-4" aria-hidden="true" />
				Prochaines 24 heures
			</h2>
			{/* `relative` : garde les libellés sr-only (absolus) dans la zone de défilement. */}
			<ul className="scrollbar-none relative -mx-4 flex snap-x gap-2 overflow-x-auto overscroll-x-contain scroll-px-4 px-4">
				{hours.map((hour, index) => {
					const rain = hour.precipitationProbability;
					return (
						<li
							key={hour.time}
							title={getWeatherLabel(hour.weatherCode)}
							className={`flex w-16 shrink-0 snap-start flex-col items-center gap-2 rounded-md border px-2 py-3 ${
								index === 0
									? 'border-white/25 bg-white/20'
									: 'border-white/10 bg-white/5'
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
							<span className="sr-only">
								{getWeatherLabel(hour.weatherCode)}
							</span>
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
					);
				})}
			</ul>
		</section>
	);
}
