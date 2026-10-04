import { useId, useState } from 'react';
import type { PointerEvent } from 'react';
import { useUnits } from '../hooks/useUnits';
import type { HourlyForecastItem } from '../types/weather';
import { formatHour } from '../utils/format';

/** Marges haute et basse (en % de la hauteur) laissées aux étiquettes de la courbe. */
const CURVE_PADDING = 22;
/** Une étiquette d'heure toutes les N colonnes. */
const HOUR_LABEL_STEP = 6;

interface TemperatureChartProps {
	hours: HourlyForecastItem[];
	className?: string;
}

/**
 * Courbe de température sur 24 h, avec le risque de pluie en barres dessous (même axe
 * horaire, deux panneaux distincts). Le doigt ou la souris fait glisser un curseur.
 */
export function TemperatureChart({
	hours,
	className = '',
}: TemperatureChartProps) {
	const { formatTemperature } = useUnits();
	const [activeIndex, setActiveIndex] = useState<number | null>(null);
	const gradientId = useId();

	const count = hours.length;
	if (count < 2) return null;

	const temperatures = hours.map((hour) => hour.temperature);
	const min = Math.min(...temperatures);
	const max = Math.max(...temperatures);
	const span = Math.max(1, max - min);
	const minIndex = temperatures.indexOf(min);
	const maxIndex = temperatures.indexOf(max);

	// Chaque heure occupe une colonne ; le point de la courbe est au centre de sa colonne.
	const x = (index: number) => ((index + 0.5) / count) * 100;
	const y = (temperature: number) =>
		CURVE_PADDING +
		(1 - (temperature - min) / span) * (100 - 2 * CURVE_PADDING);

	const line = hours
		.map(
			(hour, index) =>
				`${index === 0 ? 'M' : 'L'}${x(index).toFixed(2)} ${y(hour.temperature).toFixed(2)}`,
		)
		.join(' ');
	const area = `${line} L${x(count - 1).toFixed(2)} 100 L${x(0).toFixed(2)} 100 Z`;

	const hourLabel = (index: number) =>
		index === 0 ? 'Maintenant' : formatHour(hours[index].time);

	const handlePointer = (event: PointerEvent<HTMLDivElement>) => {
		const bounds = event.currentTarget.getBoundingClientRect();
		const ratio = (event.clientX - bounds.left) / bounds.width;
		setActiveIndex(Math.min(count - 1, Math.max(0, Math.floor(ratio * count))));
	};
	const clearActive = () => setActiveIndex(null);

	const active = activeIndex !== null ? hours[activeIndex] : undefined;
	const summary = `Maximum ${formatTemperature(max)} à ${hourLabel(maxIndex)}, minimum ${formatTemperature(min)} à ${hourLabel(minIndex)}`;

	return (
		<div className={className}>
			<p className="text-xs text-white/75 tabular-nums" aria-live="off">
				{active && activeIndex !== null ? (
					<>
						<span className="font-semibold text-white">
							{hourLabel(activeIndex)}
						</span>
						{' · '}
						{formatTemperature(active.temperature)}
						{active.precipitationProbability !== null &&
							` · pluie ${Math.round(active.precipitationProbability)} %`}
					</>
				) : (
					<>
						Max {formatTemperature(max)} à {hourLabel(maxIndex)} · Min{' '}
						{formatTemperature(min)} à {hourLabel(minIndex)}
					</>
				)}
			</p>

			{/* `pan-y` : un glissement horizontal déplace le curseur au lieu de changer de ville. */}
			<div
				role="img"
				aria-label={`Température sur 24 heures. ${summary}.`}
				className="mt-2 cursor-crosshair touch-pan-y select-none"
				onPointerDown={handlePointer}
				onPointerMove={handlePointer}
				onPointerLeave={clearActive}
				onPointerCancel={clearActive}
			>
				<div className="relative h-24">
					<svg
						viewBox="0 0 100 100"
						preserveAspectRatio="none"
						className="absolute inset-0 size-full"
						aria-hidden="true"
					>
						<defs>
							<linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
								<stop offset="0" stopColor="white" stopOpacity="0.28" />
								<stop offset="1" stopColor="white" stopOpacity="0" />
							</linearGradient>
						</defs>
						<path d={area} fill={`url(#${gradientId})`} />
						<path
							d={line}
							fill="none"
							stroke="white"
							strokeWidth={2}
							strokeLinejoin="round"
							strokeLinecap="round"
							vectorEffect="non-scaling-stroke"
						/>
					</svg>

					{/* Seuls les extrêmes sont étiquetés ; le curseur donne les autres valeurs. */}
					<span
						className="absolute -translate-x-1/2 -translate-y-[160%] text-xs font-semibold text-white tabular-nums"
						style={{ left: `${x(maxIndex)}%`, top: `${y(max)}%` }}
					>
						{formatTemperature(max)}
					</span>
					{minIndex !== maxIndex && (
						<span
							className="absolute -translate-x-1/2 translate-y-[40%] text-xs font-medium text-white/75 tabular-nums"
							style={{ left: `${x(minIndex)}%`, top: `${y(min)}%` }}
						>
							{formatTemperature(min)}
						</span>
					)}

					{active && activeIndex !== null && (
						<>
							<span
								className="absolute inset-y-0 w-px -translate-x-1/2 bg-white/40"
								style={{ left: `${x(activeIndex)}%` }}
							/>
							<span
								className="absolute size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white ring-2 ring-sky-600"
								style={{
									left: `${x(activeIndex)}%`,
									top: `${y(active.temperature)}%`,
								}}
							/>
						</>
					)}
				</div>

				<div className="flex h-6 items-end border-b border-white/15">
					{hours.map((hour, index) => {
						const rain = hour.precipitationProbability ?? 0;
						return (
							<div
								key={hour.time}
								className="flex h-full flex-1 items-end justify-center"
							>
								{rain > 0 && (
									<div
										className={`w-2/3 rounded-t-sm ${
											index === activeIndex ? 'bg-sky-100' : 'bg-sky-300'
										}`}
										style={{ height: `${Math.max(8, rain)}%` }}
									/>
								)}
							</div>
						);
					})}
				</div>
			</div>

			<div
				aria-hidden="true"
				className="mt-1 flex text-[11px] text-white/55 tabular-nums"
			>
				{hours.map((hour, index) => (
					<span key={hour.time} className="flex flex-1 justify-center">
						{index % HOUR_LABEL_STEP === 0 && (
							<span className="whitespace-nowrap">
								{index === 0 ? 'Maint.' : formatHour(hour.time)}
							</span>
						)}
					</span>
				))}
			</div>
			<p className="mt-1 flex items-center gap-1.5 text-[11px] text-white/55">
				<span className="inline-block h-2 w-1.5 rounded-t-sm bg-sky-300" />
				Risque de pluie
			</p>
		</div>
	);
}
