import { Droplet } from 'lucide-react';
import type { HourlyForecastItem } from '../types/weather';
import { formatHour, formatTemperature } from '../utils/format';
import { getWeatherLabel } from '../utils/wmoCodes';
import { WeatherIcon } from './WeatherIcon';

interface HourlyListProps {
	hours: HourlyForecastItem[];
	/** Met la première heure en avant et la libelle « Maint. ». */
	startsNow?: boolean;
	className?: string;
}

/** Bande d'heures à défilement horizontal. */
export function HourlyList({
	hours,
	startsNow = false,
	className = '',
}: HourlyListProps) {
	return (
		// `relative` : garde les libellés sr-only (absolus) dans la zone de défilement.
		<ul
			className={`scrollbar-none relative flex snap-x gap-2 overflow-x-auto overscroll-x-contain ${className}`}
		>
			{hours.map((hour, index) => {
				const rain = hour.precipitationProbability;
				const isNow = startsNow && index === 0;
				return (
					<li
						key={hour.time}
						title={getWeatherLabel(hour.weatherCode)}
						className={`flex w-16 shrink-0 snap-start flex-col items-center gap-2 rounded-md border px-2 py-3 ${
							isNow
								? 'border-white/25 bg-white/20'
								: 'border-white/10 bg-white/5'
						}`}
					>
						<span className="text-xs font-medium text-white/75">
							{isNow ? 'Maint.' : formatHour(hour.time)}
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
				);
			})}
		</ul>
	);
}
