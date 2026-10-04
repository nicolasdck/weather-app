import { useEffect } from 'react';
import { X } from 'lucide-react';
import { setUnits, useUnits } from '../hooks/useUnits';
import { TEMPERATURE_UNITS, WIND_UNITS } from '../utils/units';

interface SegmentedProps<T extends string> {
	label: string;
	options: { value: T; label: string }[];
	value: T;
	onChange: (value: T) => void;
}

function Segmented<T extends string>({
	label,
	options,
	value,
	onChange,
}: SegmentedProps<T>) {
	return (
		<div>
			<p className="text-sm text-white/70">{label}</p>
			<div
				role="group"
				aria-label={label}
				className="mt-1.5 flex gap-1 rounded-md border border-white/15 bg-white/5 p-1"
			>
				{options.map((option) => {
					const isSelected = option.value === value;
					return (
						<button
							key={option.value}
							type="button"
							onClick={() => onChange(option.value)}
							aria-pressed={isSelected}
							className={`flex-1 rounded px-2 py-1.5 text-sm font-medium transition ${
								isSelected
									? 'bg-white text-slate-900'
									: 'text-white/80 hover:bg-white/10'
							}`}
						>
							{option.label}
						</button>
					);
				})}
			</div>
		</div>
	);
}

interface SettingsModalProps {
	onClose: () => void;
}

export function SettingsModal({ onClose }: SettingsModalProps) {
	const { units } = useUnits();

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
				aria-labelledby="settings-title"
				onClick={(event) => event.stopPropagation()}
				className="w-full max-w-md rounded-t-xl border border-white/15 bg-slate-900/95 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] text-white shadow-2xl sm:rounded-xl"
			>
				<div className="flex items-center justify-between gap-2">
					<h2 id="settings-title" className="text-base font-semibold">
						Réglages
					</h2>
					<button
						type="button"
						onClick={onClose}
						aria-label="Fermer"
						className="grid size-9 shrink-0 place-items-center rounded-md text-white/75 transition hover:bg-white/15 hover:text-white"
					>
						<X className="size-4" aria-hidden="true" />
					</button>
				</div>

				<div className="mt-3 space-y-4">
					<Segmented
						label="Température"
						options={TEMPERATURE_UNITS}
						value={units.temperature}
						onChange={(temperature) => setUnits({ temperature })}
					/>
					<Segmented
						label="Vitesse du vent"
						options={WIND_UNITS}
						value={units.wind}
						onChange={(wind) => setUnits({ wind })}
					/>
				</div>
			</div>
		</div>
	);
}
