import { Clock } from 'lucide-react';
import type { HourlyForecastItem } from '../types/weather';
import { HourlyList } from './HourlyList';
import { TemperatureChart } from './TemperatureChart';

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
			<TemperatureChart hours={hours} className="mb-3 px-1" />
			<HourlyList hours={hours} startsNow className="-mx-4 scroll-px-4 px-4" />
		</section>
	);
}
