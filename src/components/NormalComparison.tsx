import { useEffect, useState } from 'react';
import { Minus, TrendingDown, TrendingUp } from 'lucide-react';
import { useUnits } from '../hooks/useUnits';
import {
	fetchTemperatureNormal,
	readCachedNormal,
} from '../services/climateApi';
import type { WeatherLocation } from '../types/weather';

interface NormalComparisonProps {
	location: WeatherLocation;
	/** Date locale du jour (`2026-10-04`). */
	date: string;
	/** Maximale prévue aujourd'hui, en °C. */
	todayMax: number;
	className?: string;
}

/**
 * « 4° au-dessus de la normale de saison ». À monter avec une `key` qui change avec le
 * lieu et la date : l'état initial vient du cache de ce couple-là.
 */
export function NormalComparison({
	location,
	date,
	todayMax,
	className = '',
}: NormalComparisonProps) {
	const { formatTemperature, formatTemperatureDelta } = useUnits();
	const [normal, setNormal] = useState(() => readCachedNormal(location, date));
	const { latitude, longitude } = location;

	useEffect(() => {
		if (normal) return;
		const controller = new AbortController();
		fetchTemperatureNormal(
			{ name: '', latitude, longitude },
			date,
			controller.signal,
		)
			.then(setNormal)
			// Simple complément d'information : en cas d'échec, la ligne n'apparaît pas.
			.catch(() => undefined);
		return () => controller.abort();
	}, [normal, latitude, longitude, date]);

	if (!normal) return null;

	const difference = todayMax - normal.max;
	const isClose = Math.abs(difference) < 1;
	const Icon = isClose ? Minus : difference > 0 ? TrendingUp : TrendingDown;

	return (
		<p className={`flex items-center gap-2 text-sm text-white/80 ${className}`}>
			<Icon className="size-4 shrink-0 text-white/65" aria-hidden="true" />
			<span>
				{isClose
					? 'Proche de la normale de saison'
					: `${formatTemperatureDelta(Math.abs(difference))} ${
							difference > 0 ? 'au-dessus' : 'en dessous'
						} de la normale de saison`}{' '}
				<span className="text-white/55">
					(max. habituelle {formatTemperature(normal.max)})
				</span>
			</span>
		</p>
	);
}
