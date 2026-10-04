import type { ReactNode } from 'react';
import {
	Droplets,
	Gauge,
	MapPin,
	Moon,
	Navigation2,
	RefreshCw,
	Sun,
	Sunrise,
	Sunset,
	SunMedium,
	Trash2,
	Wind,
} from 'lucide-react';
import type { WeatherData } from '../types/weather';
import {
	formatClock,
	formatDuration,
	formatLocationSubtitle,
	formatTemperature,
	minutesOfDay,
	uvLabel,
	windDirectionLabel,
} from '../utils/format';
import { getWeatherLabel } from '../utils/wmoCodes';
import { GlassCard } from './GlassCard';
import { HourlyForecast } from './HourlyForecast';
import { WeatherIcon } from './WeatherIcon';

interface CurrentWeatherProps {
	data: WeatherData;
	isRefreshing?: boolean;
	onRefresh: () => void;
	onRemove: () => void;
}

const headerButtonClass =
	'grid size-8 place-items-center rounded-md border border-white/15 bg-white/10 text-white transition hover:bg-white/20 active:scale-95';

interface StatTileProps {
	icon: ReactNode;
	label: string;
	value: string;
	detail?: ReactNode;
}

function StatTile({ icon, label, value, detail }: StatTileProps) {
	return (
		<div className="rounded-md border border-white/10 bg-white/10 p-4">
			<div className="flex items-center gap-2 text-xs font-medium tracking-wide text-white/65 uppercase">
				{icon}
				{label}
			</div>
			<p className="mt-2 text-2xl font-semibold text-white tabular-nums">
				{value}
			</p>
			{detail && <div className="mt-1 text-sm text-white/70">{detail}</div>}
		</div>
	);
}

export function CurrentWeather({
	data,
	isRefreshing = false,
	onRefresh,
	onRemove,
}: CurrentWeatherProps) {
	const { current, location, daily } = data;
	const today = daily[0];
	const subtitle = formatLocationSubtitle(location);

	const sunriseMinutes = today ? minutesOfDay(today.sunrise) : 0;
	const sunsetMinutes = today ? minutesOfDay(today.sunset) : 0;
	const daylightMinutes = sunsetMinutes - sunriseMinutes;
	const sunProgress =
		daylightMinutes > 0
			? Math.min(
					1,
					Math.max(
						0,
						(minutesOfDay(current.time) - sunriseMinutes) / daylightMinutes,
					),
				)
			: 0;

	return (
		<GlassCard className="p-3">
			<h1 className="flex items-start gap-2 text-2xl font-semibold text-white">
				<MapPin
					className="mt-1.5 size-5 shrink-0 text-white/70"
					aria-hidden="true"
				/>
				<span className="min-w-0 wrap-break-word">{location.name}</span>
			</h1>
			{subtitle && (
				<p className="mt-0.5 text-sm wrap-break-word text-white/70">
					{subtitle}
				</p>
			)}

			<div className="mt-3 flex items-center justify-between gap-2">
				<span className="flex items-center gap-1.5 rounded-md border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-medium text-white">
					{current.isDay ? (
						<Sun className="size-3.5 text-amber-300" aria-hidden="true" />
					) : (
						<Moon className="size-3.5 text-indigo-200" aria-hidden="true" />
					)}
					{current.isDay ? 'Jour' : 'Nuit'} · {formatClock(current.time)}
				</span>

				<div className="flex shrink-0 items-center gap-2">
					<button
						type="button"
						onClick={onRefresh}
						disabled={isRefreshing}
						aria-label="Actualiser"
						title="Actualiser"
						className={headerButtonClass}
					>
						<RefreshCw
							className={`size-3.5 ${isRefreshing ? 'animate-spin' : ''}`}
							aria-hidden="true"
						/>
					</button>
					<button
						type="button"
						onClick={onRemove}
						aria-label={`Retirer ${location.name}`}
						title="Retirer cette ville"
						className={headerButtonClass}
					>
						<Trash2 className="size-3.5" aria-hidden="true" />
					</button>
				</div>
			</div>

			<div className="mt-3 flex items-center justify-between gap-4">
				<div>
					<p className="text-7xl leading-none font-light tracking-tighter text-white tabular-nums sm:text-8xl">
						{formatTemperature(current.temperature)}
					</p>
					<p className="mt-3 text-lg font-medium text-white">
						{getWeatherLabel(current.weatherCode)}
					</p>
					<p className="text-sm text-white/75">
						Ressenti {formatTemperature(current.apparentTemperature)}
						{today && (
							<>
								{' · '}
								Max {formatTemperature(today.temperatureMax)} / Min{' '}
								{formatTemperature(today.temperatureMin)}
							</>
						)}
					</p>
				</div>
				<WeatherIcon
					code={current.weatherCode}
					isDay={current.isDay}
					className="size-24 shrink-0 text-white drop-shadow-lg sm:size-32"
					strokeWidth={1.25}
				/>
			</div>

			<HourlyForecast hours={data.hourly} className="mt-6" />

			<div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
				<StatTile
					icon={<Droplets className="size-4" aria-hidden="true" />}
					label="Humidité"
					value={`${Math.round(current.humidity)} %`}
					detail={
						current.precipitation > 0
							? `${current.precipitation.toLocaleString('fr-FR')} mm de précipitations`
							: 'Pas de précipitations'
					}
				/>
				<StatTile
					icon={<Wind className="size-4" aria-hidden="true" />}
					label="Vent"
					value={`${Math.round(current.windSpeed)} km/h`}
					detail={
						<span className="flex items-center gap-1.5">
							{/* La flèche pointe vers la provenance du vent, comme le libellé (N = vers le haut). */}
							<Navigation2
								className="size-3.5 shrink-0"
								style={{
									transform: `rotate(${current.windDirection}deg)`,
								}}
								aria-hidden="true"
							/>
							{windDirectionLabel(current.windDirection)} · rafales{' '}
							{Math.round(current.windGusts)} km/h
						</span>
					}
				/>
				<StatTile
					icon={<Gauge className="size-4" aria-hidden="true" />}
					label="Pression"
					value={`${Math.round(current.pressure)} hPa`}
					detail="Niveau de la mer"
				/>
				<StatTile
					icon={<SunMedium className="size-4" aria-hidden="true" />}
					label="Indice UV"
					value={
						current.uvIndex === null
							? '—'
							: current.uvIndex.toFixed(1).replace('.', ',')
					}
					detail={
						current.uvIndex === null
							? 'Non disponible'
							: uvLabel(current.uvIndex)
					}
				/>
			</div>

			{today && (
				<div className="mt-3 rounded-md border border-white/10 bg-white/10 p-4">
					<div className="flex items-center justify-between text-sm text-white">
						<span className="flex items-center gap-2">
							<Sunrise className="size-4 text-amber-300" aria-hidden="true" />
							<span className="sr-only">Lever du soleil</span>
							{formatClock(today.sunrise)}
						</span>
						<span className="text-xs text-white/65">
							{formatDuration(daylightMinutes)} de jour
						</span>
						<span className="flex items-center gap-2">
							{formatClock(today.sunset)}
							<span className="sr-only">Coucher du soleil</span>
							<Sunset className="size-4 text-orange-300" aria-hidden="true" />
						</span>
					</div>
					<div className="relative mt-3 h-1.5 rounded-md bg-white/15">
						<div
							className="h-full rounded-md bg-linear-to-r from-amber-300 to-orange-400"
							style={{ width: `${sunProgress * 100}%` }}
						/>
						{current.isDay && (
							<span
								className="absolute top-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-md bg-amber-200 shadow-[0_0_12px_rgba(252,211,77,0.9)]"
								style={{ left: `${sunProgress * 100}%` }}
							/>
						)}
					</div>
				</div>
			)}
		</GlassCard>
	);
}
