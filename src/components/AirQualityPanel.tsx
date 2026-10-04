import { Flower2, Leaf } from 'lucide-react';
import type { AirQuality, PollenType } from '../types/weather';

interface AqiLevel {
	/** Borne supérieure (exclue) de l'indice européen pour ce niveau. */
	max: number;
	label: string;
	/** Couleur officielle de l'indice européen de qualité de l'air. */
	color: string;
}

const AQI_LEVELS: AqiLevel[] = [
	{ max: 20, label: 'Bon', color: '#50f0e6' },
	{ max: 40, label: 'Correct', color: '#50ccaa' },
	{ max: 60, label: 'Modéré', color: '#f0e641' },
	{ max: 80, label: 'Mauvais', color: '#ff5050' },
	{ max: 100, label: 'Très mauvais', color: '#960032' },
	{ max: Infinity, label: 'Extrêmement mauvais', color: '#7d2181' },
];

const POLLEN_NAMES: Record<PollenType, string> = {
	alder: 'Aulne',
	birch: 'Bouleau',
	grass: 'Graminées',
	mugwort: 'Armoise',
	olive: 'Olivier',
	ragweed: 'Ambroisie',
};

/** En dessous, la concentration (grains/m³) est considérée comme négligeable. */
const POLLEN_NOTABLE = 1;

// Seuils indicatifs, communs à toutes les espèces.
function pollenLabel(value: number): string {
	if (value < 10) return 'faible';
	if (value < 50) return 'modéré';
	if (value < 200) return 'élevé';
	return 'très élevé';
}

function describePollens(pollens: NonNullable<AirQuality['pollens']>): string {
	const notable = pollens
		.filter((pollen) => pollen.value >= POLLEN_NOTABLE)
		.sort((a, b) => b.value - a.value);
	if (notable.length === 0) return 'Aucun pollen notable';
	return notable
		.map(
			(pollen) => `${POLLEN_NAMES[pollen.type]} (${pollenLabel(pollen.value)})`,
		)
		.join(', ');
}

interface AirQualityPanelProps {
	airQuality: AirQuality | null;
	className?: string;
}

export function AirQualityPanel({
	airQuality,
	className = '',
}: AirQualityPanelProps) {
	if (!airQuality || airQuality.europeanAqi === null) return null;

	const aqi = Math.round(airQuality.europeanAqi);
	const levelIndex = AQI_LEVELS.findIndex((level) => aqi < level.max);
	const level = AQI_LEVELS[levelIndex];

	const pollutants = [
		{ label: 'PM2.5', value: airQuality.pm25 },
		{ label: 'PM10', value: airQuality.pm10 },
		{ label: 'NO₂', value: airQuality.nitrogenDioxide },
		{ label: 'O₃', value: airQuality.ozone },
	];

	return (
		<section
			className={`rounded-md border border-white/10 bg-white/10 p-4 ${className}`}
		>
			<h2 className="flex items-center gap-2 text-xs font-medium tracking-wide text-white/65 uppercase">
				<Leaf className="size-4" aria-hidden="true" />
				Qualité de l'air
			</h2>

			<p className="mt-2 flex items-baseline gap-2">
				<span className="text-2xl font-semibold text-white tabular-nums">
					{aqi}
				</span>
				<span className="text-sm text-white/80">
					{level.label} · indice européen
				</span>
			</p>

			{/* Échelle de l'indice : le niveau actuel est le seul segment en pleine couleur. */}
			<div aria-hidden="true" className="mt-2 flex gap-0.5">
				{AQI_LEVELS.map((item, index) => (
					<span
						key={item.label}
						className={`h-1.5 flex-1 rounded-sm ${index === levelIndex ? '' : 'opacity-30'}`}
						style={{ backgroundColor: item.color }}
					/>
				))}
			</div>

			<dl className="mt-3 grid grid-cols-4 gap-2 text-center">
				{pollutants.map((pollutant) => (
					<div key={pollutant.label}>
						<dt className="text-[11px] text-white/60">{pollutant.label}</dt>
						<dd className="text-sm font-medium text-white tabular-nums">
							{pollutant.value === null ? '—' : Math.round(pollutant.value)}
						</dd>
					</div>
				))}
			</dl>
			<p className="mt-1 text-center text-[11px] text-white/45">en µg/m³</p>

			{airQuality.pollens && (
				<p className="mt-3 flex items-start gap-2 border-t border-white/10 pt-3 text-sm text-white/80">
					<Flower2
						className="mt-0.5 size-4 shrink-0 text-white/65"
						aria-hidden="true"
					/>
					<span>
						<span className="text-white/60">Pollens : </span>
						{describePollens(airQuality.pollens)}
					</span>
				</p>
			)}
		</section>
	);
}
