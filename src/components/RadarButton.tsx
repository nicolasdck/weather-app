import { Suspense, lazy, useCallback, useState } from 'react';
import { ChevronRight, Radar } from 'lucide-react';
import type { WeatherLocation } from '../types/weather';

// La carte (Leaflet) n'est téléchargée qu'à la première ouverture du radar.
const RadarModal = lazy(() => import('./RadarModal'));

interface RadarButtonProps {
	location: WeatherLocation;
	timezone: string;
	className?: string;
}

export function RadarButton({
	location,
	timezone,
	className = '',
}: RadarButtonProps) {
	const [isOpen, setIsOpen] = useState(false);
	const close = useCallback(() => setIsOpen(false), []);

	return (
		<>
			<button
				type="button"
				onClick={() => setIsOpen(true)}
				className={`flex w-full items-center gap-2 rounded-md border border-white/10 bg-white/10 px-3 py-2 text-left text-sm text-white transition hover:bg-white/15 ${className}`}
			>
				<Radar className="size-4 shrink-0 text-white/65" aria-hidden="true" />
				<span className="flex-1">Radar des précipitations</span>
				<ChevronRight
					className="size-4 shrink-0 text-white/50"
					aria-hidden="true"
				/>
			</button>

			{isOpen && (
				<Suspense fallback={null}>
					<RadarModal location={location} timezone={timezone} onClose={close} />
				</Suspense>
			)}
		</>
	);
}
