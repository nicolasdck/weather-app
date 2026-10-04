import { useMemo } from 'react';
import { Camera, MoonStar } from 'lucide-react';
import type { WeatherData } from '../types/weather';
import {
	getGoldenHours,
	getMoonInfo,
	getMoonTimes,
	localIsoToInstant,
} from '../utils/astro';

const MOON_RADIUS = 10;

interface MoonPhaseIconProps {
	/** 0 = nouvelle lune, 0,5 = pleine lune. */
	phase: number;
	/** Dans l'hémisphère sud, la Lune apparaît retournée. */
	flipped: boolean;
}

/** Disque lunaire avec sa part éclairée. */
function MoonPhaseIcon({ phase, flipped }: MoonPhaseIconProps) {
	const isWaxing = phase < 0.5;
	// Ramène la phase décroissante à son symétrique croissant, puis retourne le dessin.
	const waxingPhase = isWaxing ? phase : 1 - phase;
	const terminatorRadius =
		MOON_RADIUS * Math.abs(Math.cos(2 * Math.PI * waxingPhase));
	const litPath = [
		`M 0 ${-MOON_RADIUS}`,
		`A ${MOON_RADIUS} ${MOON_RADIUS} 0 0 1 0 ${MOON_RADIUS}`,
		`A ${terminatorRadius} ${MOON_RADIUS} 0 0 ${waxingPhase < 0.25 ? 0 : 1} 0 ${-MOON_RADIUS}`,
	].join(' ');
	const mirrored = isWaxing === flipped;

	return (
		<svg
			viewBox="-12 -12 24 24"
			className="size-12 shrink-0"
			aria-hidden="true"
		>
			<circle r={MOON_RADIUS} className="fill-white/15" />
			<path
				d={litPath}
				className="fill-amber-100"
				transform={mirrored ? 'scale(-1 1)' : undefined}
			/>
			<circle
				r={MOON_RADIUS}
				className="fill-none stroke-white/25"
				strokeWidth={0.5}
			/>
		</svg>
	);
}

interface MoonPanelProps {
	data: WeatherData;
	className?: string;
}

/** Phase et horaires de la Lune, heures dorées — calculés sur l'appareil. */
export function MoonPanel({ data, className = '' }: MoonPanelProps) {
	const { latitude, longitude } = data.location;
	const { timezone, utcOffsetSeconds } = data;
	const currentTime = data.current.time;

	const { moon, moonTimes, golden } = useMemo(() => {
		const now = localIsoToInstant(currentTime, utcOffsetSeconds);
		const dayStart = localIsoToInstant(
			currentTime.slice(0, 10),
			utcOffsetSeconds,
		);
		return {
			moon: getMoonInfo(now),
			moonTimes: getMoonTimes(now, latitude, longitude),
			golden: getGoldenHours(dayStart, latitude, longitude),
		};
	}, [currentTime, utcOffsetSeconds, latitude, longitude]);

	const clock = useMemo(() => {
		const options: Intl.DateTimeFormatOptions = {
			hour: '2-digit',
			minute: '2-digit',
		};
		try {
			return new Intl.DateTimeFormat('fr-FR', {
				...options,
				timeZone: timezone,
			});
		} catch {
			return new Intl.DateTimeFormat('fr-FR', options);
		}
	}, [timezone]);

	const formatRange = (range: [number, number] | null) =>
		range ? `${clock.format(range[0])} – ${clock.format(range[1])}` : '—';

	return (
		<section
			className={`rounded-md border border-white/10 bg-white/10 p-4 ${className}`}
		>
			<h2 className="flex items-center gap-2 text-xs font-medium tracking-wide text-white/65 uppercase">
				<MoonStar className="size-4" aria-hidden="true" />
				Lune et lumière
			</h2>

			<div className="mt-3 flex items-center gap-3">
				<MoonPhaseIcon phase={moon.phase} flipped={latitude < 0} />
				<div className="min-w-0">
					<p className="text-base font-semibold text-white">{moon.name}</p>
					<p className="text-sm text-white/70 tabular-nums">
						Éclairée à {Math.round(moon.illumination * 100)} %
					</p>
				</div>
				<dl className="ml-auto grid shrink-0 grid-cols-[auto_auto] gap-x-3 text-sm tabular-nums">
					<dt className="text-white/60">Prochain lever</dt>
					<dd className="text-right text-white">
						{moonTimes.rise === null ? '—' : clock.format(moonTimes.rise)}
					</dd>
					<dt className="text-white/60">Prochain coucher</dt>
					<dd className="text-right text-white">
						{moonTimes.set === null ? '—' : clock.format(moonTimes.set)}
					</dd>
				</dl>
			</div>

			<div className="mt-3 flex items-start gap-2 border-t border-white/10 pt-3 text-sm">
				<Camera
					className="mt-0.5 size-4 shrink-0 text-amber-200"
					aria-hidden="true"
				/>
				<dl className="grid flex-1 grid-cols-2 gap-x-3 tabular-nums">
					<div>
						<dt className="text-xs text-white/60">Heure dorée du matin</dt>
						<dd className="text-white">{formatRange(golden.morning)}</dd>
					</div>
					<div>
						<dt className="text-xs text-white/60">Heure dorée du soir</dt>
						<dd className="text-white">{formatRange(golden.evening)}</dd>
					</div>
				</dl>
			</div>
		</section>
	);
}
