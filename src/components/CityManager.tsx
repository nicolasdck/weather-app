import { useEffect } from 'react';
import {
	ArrowDown,
	ArrowUp,
	MapPin,
	Navigation,
	Trash2,
	X,
} from 'lucide-react';
import { getLocationKey } from '../hooks/useCities';
import type { WeatherEntry, WeatherLocation } from '../types/weather';
import { formatLocationSubtitle, formatTemperature } from '../utils/format';

interface CityManagerProps {
	locations: WeatherLocation[];
	entries: Record<string, WeatherEntry>;
	activeIndex: number;
	onSelect: (index: number) => void;
	onMove: (from: number, to: number) => void;
	onRemove: (index: number) => void;
	onClose: () => void;
}

const iconButtonClass =
	'grid size-9 shrink-0 place-items-center rounded-md text-white/75 transition hover:bg-white/15 hover:text-white disabled:pointer-events-none disabled:opacity-25';

/** Fenêtre de gestion des villes : ordre, suppression, accès direct. */
export function CityManager({
	locations,
	entries,
	activeIndex,
	onSelect,
	onMove,
	onRemove,
	onClose,
}: CityManagerProps) {
	useEffect(() => {
		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.key === 'Escape') onClose();
		};
		document.addEventListener('keydown', handleKeyDown);
		return () => document.removeEventListener('keydown', handleKeyDown);
	}, [onClose]);

	return (
		<div
			className="fixed inset-0 z-40 flex items-end justify-center bg-black/50 backdrop-blur-sm sm:items-center sm:p-4"
			onClick={onClose}
		>
			<div
				role="dialog"
				aria-modal="true"
				aria-labelledby="city-manager-title"
				onClick={(event) => event.stopPropagation()}
				className="flex max-h-[85dvh] w-full max-w-md flex-col rounded-t-xl border border-white/15 bg-slate-900/95 pb-[env(safe-area-inset-bottom)] text-white shadow-2xl sm:rounded-xl"
			>
				<div className="flex items-center justify-between gap-2 p-3 pl-4">
					<div>
						<h2 id="city-manager-title" className="text-base font-semibold">
							Mes villes
						</h2>
						<p className="text-xs text-white/60">
							La première ville s'affiche à l'ouverture de l'application.
						</p>
					</div>
					<button
						type="button"
						onClick={onClose}
						aria-label="Fermer"
						className={iconButtonClass}
					>
						<X className="size-4" aria-hidden="true" />
					</button>
				</div>

				<ul className="divide-y divide-white/10 overflow-y-auto border-t border-white/10">
					{locations.map((location, index) => {
						const key = getLocationKey(location);
						const data = entries[key]?.data;
						const subtitle = formatLocationSubtitle(location);
						const Icon = location.isCurrentPosition ? Navigation : MapPin;

						return (
							<li
								key={key}
								className={`flex items-center gap-1 py-1.5 pr-2 pl-1 ${
									index === activeIndex ? 'bg-white/10' : ''
								}`}
							>
								<button
									type="button"
									onClick={() => {
										onSelect(index);
										onClose();
									}}
									aria-current={index === activeIndex ? 'true' : undefined}
									className="flex min-w-0 flex-1 items-center gap-3 rounded-md px-3 py-1.5 text-left transition hover:bg-white/10"
								>
									<Icon
										className="size-4 shrink-0 text-white/60"
										aria-hidden="true"
									/>
									<span className="min-w-0 flex-1">
										<span className="block truncate text-sm font-medium">
											{location.name}
										</span>
										{subtitle && (
											<span className="block truncate text-xs text-white/60">
												{subtitle}
											</span>
										)}
									</span>
									{data && (
										<span className="shrink-0 text-sm font-semibold tabular-nums">
											{formatTemperature(data.current.temperature)}
										</span>
									)}
								</button>

								<button
									type="button"
									onClick={() => onMove(index, index - 1)}
									disabled={index === 0}
									aria-label={`Monter ${location.name}`}
									className={iconButtonClass}
								>
									<ArrowUp className="size-4" aria-hidden="true" />
								</button>
								<button
									type="button"
									onClick={() => onMove(index, index + 1)}
									disabled={index === locations.length - 1}
									aria-label={`Descendre ${location.name}`}
									className={iconButtonClass}
								>
									<ArrowDown className="size-4" aria-hidden="true" />
								</button>
								<button
									type="button"
									onClick={() => onRemove(index)}
									aria-label={`Retirer ${location.name}`}
									className={iconButtonClass}
								>
									<Trash2 className="size-4" aria-hidden="true" />
								</button>
							</li>
						);
					})}
				</ul>
			</div>
		</div>
	);
}
