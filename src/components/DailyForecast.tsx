import { useState } from 'react';
import type { ReactNode } from 'react';
import {
	CalendarDays,
	ChevronDown,
	CloudRain,
	Droplet,
	Navigation2,
	SunMedium,
	Sunrise,
	Wind,
} from 'lucide-react';
import { useUnits } from '../hooks/useUnits';
import type { DailyForecastItem, HourlyForecastItem } from '../types/weather';
import {
	formatClock,
	formatDayLabel,
	formatDayMonth,
	formatMillimeters,
	uvLabel,
	windDirectionLabel,
} from '../utils/format';
import { getWeatherLabel } from '../utils/wmoCodes';
import { GlassCard } from './GlassCard';
import { HourlyList } from './HourlyList';
import { WeatherIcon } from './WeatherIcon';

interface DailyForecastProps {
	days: DailyForecastItem[];
	/** Toutes les heures de la période, pour le détail d'une journée. */
	hours: HourlyForecastItem[];
}

interface DetailProps {
	icon: ReactNode;
	label: string;
	children: ReactNode;
}

function Detail({ icon, label, children }: DetailProps) {
	return (
		<div>
			<dt className="flex items-center gap-1.5 text-[11px] tracking-wide text-white/60 uppercase">
				{icon}
				{label}
			</dt>
			<dd className="mt-0.5 text-sm text-white tabular-nums">{children}</dd>
		</div>
	);
}

interface DayDetailsProps {
	day: DailyForecastItem;
	hours: HourlyForecastItem[];
}

function DayDetails({ day, hours }: DayDetailsProps) {
	const { formatWind, formatWindValue } = useUnits();
	const rain = day.precipitationProbabilityMax;

	return (
		<div className="mb-3 rounded-md border border-white/10 bg-white/5 p-3">
			<p className="text-sm font-medium text-white sm:hidden">
				{getWeatherLabel(day.weatherCode)}
			</p>
			<dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-3 sm:mt-0 sm:grid-cols-4">
				<Detail
					icon={<Sunrise className="size-3.5" aria-hidden="true" />}
					label="Soleil"
				>
					{formatClock(day.sunrise)} – {formatClock(day.sunset)}
				</Detail>
				<Detail
					icon={<Wind className="size-3.5" aria-hidden="true" />}
					label="Vent max."
				>
					{day.windSpeedMax === null ? (
						'—'
					) : (
						<span className="flex flex-wrap items-center gap-x-1.5">
							{formatWind(day.windSpeedMax)}
							{day.windDirection !== null && (
								<span className="flex items-center gap-1">
									<Navigation2
										className="size-3 shrink-0"
										style={{ transform: `rotate(${day.windDirection}deg)` }}
										aria-hidden="true"
									/>
									{windDirectionLabel(day.windDirection)}
								</span>
							)}
							{day.windGustsMax !== null && (
								<span className="text-white/65">
									rafales {formatWindValue(day.windGustsMax)}
								</span>
							)}
						</span>
					)}
				</Detail>
				<Detail
					icon={<SunMedium className="size-3.5" aria-hidden="true" />}
					label="UV max."
				>
					{day.uvIndexMax === null
						? '—'
						: `${day.uvIndexMax.toFixed(1).replace('.', ',')} · ${uvLabel(day.uvIndexMax)}`}
				</Detail>
				<Detail
					icon={<CloudRain className="size-3.5" aria-hidden="true" />}
					label="Précipitations"
				>
					{day.precipitationSum === null
						? '—'
						: formatMillimeters(day.precipitationSum)}
					{rain !== null && ` · ${Math.round(rain)} %`}
				</Detail>
			</dl>

			{hours.length > 0 && (
				<HourlyList hours={hours} className="-mx-3 mt-3 scroll-px-3 px-3" />
			)}
		</div>
	);
}

export function DailyForecast({ days, hours }: DailyForecastProps) {
	const { formatTemperature } = useUnits();
	const [expandedDate, setExpandedDate] = useState<string | null>(null);

	const weekMin = Math.min(...days.map((day) => day.temperatureMin));
	const weekMax = Math.max(...days.map((day) => day.temperatureMax));
	const span = Math.max(1, weekMax - weekMin);

	return (
		<GlassCard
			title="Prévisions sur 7 jours"
			icon={<CalendarDays className="size-4" aria-hidden="true" />}
		>
			<ul className="divide-y divide-white/10">
				{days.map((day, index) => {
					const rain = day.precipitationProbabilityMax;
					const left = ((day.temperatureMin - weekMin) / span) * 100;
					const width = Math.max(
						6,
						((day.temperatureMax - day.temperatureMin) / span) * 100,
					);
					const isExpanded = day.date === expandedDate;

					return (
						<li key={day.date}>
							<button
								type="button"
								onClick={() => setExpandedDate(isExpanded ? null : day.date)}
								aria-expanded={isExpanded}
								className="flex w-full items-center gap-3 py-3 text-left"
							>
								<span className="block w-24 shrink-0 sm:w-32">
									<span className="block truncate text-sm font-medium text-white">
										{formatDayLabel(day.date, index)}
									</span>
									<span className="block text-xs text-white/55">
										{formatDayMonth(day.date)}
									</span>
								</span>

								<WeatherIcon
									code={day.weatherCode}
									className="size-6 shrink-0 text-white"
									strokeWidth={1.75}
								/>

								<span className="hidden min-w-0 flex-1 truncate text-sm text-white/80 sm:block">
									{getWeatherLabel(day.weatherCode)}
								</span>
								<span className="sr-only sm:hidden">
									{getWeatherLabel(day.weatherCode)}
								</span>

								<span
									className={`flex w-11 shrink-0 items-center gap-0.5 text-xs tabular-nums ${
										rain !== null && rain >= 30
											? 'text-sky-200'
											: 'text-white/45'
									}`}
								>
									<Droplet className="size-3" aria-hidden="true" />
									<span className="sr-only">Risque de pluie</span>
									{rain === null ? '—' : `${Math.round(rain)}%`}
								</span>

								<span className="flex flex-1 items-center gap-2 sm:w-48 sm:flex-none">
									<span className="w-8 text-right text-sm text-white/65 tabular-nums">
										<span className="sr-only">Minimum </span>
										{formatTemperature(day.temperatureMin)}
									</span>
									<span className="relative block h-1.5 flex-1 rounded-md bg-white/15">
										<span
											className="absolute inset-y-0 rounded-md bg-linear-to-r from-sky-300 via-amber-200 to-orange-400"
											style={{
												left: `${Math.min(left, 100 - width)}%`,
												width: `${width}%`,
											}}
										/>
									</span>
									<span className="w-8 text-sm font-semibold text-white tabular-nums">
										<span className="sr-only">Maximum </span>
										{formatTemperature(day.temperatureMax)}
									</span>
								</span>

								<ChevronDown
									className={`size-4 shrink-0 text-white/50 transition-transform ${
										isExpanded ? 'rotate-180' : ''
									}`}
									aria-hidden="true"
								/>
							</button>

							{isExpanded && (
								<DayDetails
									day={day}
									hours={hours.filter((hour) => hour.time.startsWith(day.date))}
								/>
							)}
						</li>
					);
				})}
			</ul>
		</GlassCard>
	);
}
