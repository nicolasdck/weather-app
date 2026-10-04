import { useState } from 'react';
import { CloudRain, Umbrella } from 'lucide-react';
import type { PrecipitationSlot } from '../types/weather';
import {
	formatClock,
	formatMillimeters,
	minutesBetween,
} from '../utils/format';

/** Cumul (mm par quart d'heure) correspondant à une barre pleine ; au-delà, l'échelle suit le maximum. */
const FULL_SCALE_MM = 1;

interface RainOutlookProps {
	/** Précipitations par quart d'heure sur les 2 prochaines heures. */
	slots: PrecipitationSlot[];
	/** Heure locale actuelle du lieu. */
	currentTime: string;
	className?: string;
}

function describeOutlook(
	slots: PrecipitationSlot[],
	firstWet: number,
	currentTime: string,
): string {
	if (firstWet === 0) {
		const firstDry = slots.findIndex((slot) => slot.precipitation <= 0);
		return firstDry === -1
			? 'Pluie pendant au moins 2 heures'
			: `Pluie jusque vers ${formatClock(slots[firstDry].time)}`;
	}
	const start = slots[firstWet].time;
	const minutes = minutesBetween(currentTime, start);
	return minutes > 0
		? `Pluie vers ${formatClock(start)} (dans ${minutes} min)`
		: `Pluie vers ${formatClock(start)}`;
}

/** Pluie dans les 2 heures : une phrase, plus un mini-graphique par quart d'heure s'il doit pleuvoir. */
export function RainOutlook({
	slots,
	currentTime,
	className = '',
}: RainOutlookProps) {
	const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

	if (slots.length === 0) return null;

	const firstWet = slots.findIndex((slot) => slot.precipitation > 0);
	if (firstWet === -1) {
		return (
			<p
				className={`flex items-center gap-2 rounded-md border border-white/10 bg-white/10 px-3 py-2 text-sm text-white/80 ${className}`}
			>
				<Umbrella
					className="size-4 shrink-0 text-white/65"
					aria-hidden="true"
				/>
				Pas de pluie prévue dans les 2 prochaines heures
			</p>
		);
	}

	const peakIndex = slots.reduce(
		(best, slot, index) =>
			slot.precipitation > slots[best].precipitation ? index : best,
		0,
	);
	const scale = Math.max(FULL_SCALE_MM, slots[peakIndex].precipitation);
	const selected = selectedIndex !== null ? slots[selectedIndex] : undefined;
	const shown = selected ?? slots[peakIndex];
	const middle = slots[Math.floor(slots.length / 2)];

	return (
		<section
			className={`rounded-md border border-white/10 bg-white/10 p-3 ${className}`}
		>
			<h2 className="flex items-center gap-2 text-sm font-medium text-white">
				<CloudRain
					className="size-4 shrink-0 text-sky-200"
					aria-hidden="true"
				/>
				{describeOutlook(slots, firstWet, currentTime)}
			</h2>
			<p className="mt-0.5 text-xs text-white/65 tabular-nums">
				{selected ? '' : 'Maximum : '}
				{formatMillimeters(shown.precipitation)} en 15 min à{' '}
				{formatClock(shown.time)}
			</p>

			{/* Une colonne par quart d'heure ; la zone tactile couvre toute la hauteur. */}
			<div
				className="mt-3 flex h-12 items-end gap-0.5"
				onPointerLeave={() => setSelectedIndex(null)}
			>
				{slots.map((slot, index) => {
					const isSelected = index === selectedIndex;
					const label = `${formatClock(slot.time)} : ${formatMillimeters(slot.precipitation)}`;
					return (
						<div
							key={slot.time}
							role="img"
							aria-label={label}
							title={label}
							onPointerEnter={() => setSelectedIndex(index)}
							onPointerDown={() => setSelectedIndex(index)}
							className="flex h-full flex-1 items-end"
						>
							{slot.precipitation > 0 ? (
								<div
									className={`w-full rounded-t transition-colors ${
										isSelected ? 'bg-sky-100' : 'bg-sky-300'
									}`}
									style={{
										height: `${Math.max(8, (slot.precipitation / scale) * 100)}%`,
									}}
								/>
							) : (
								<div
									className={`h-0.5 w-full ${isSelected ? 'bg-white/60' : 'bg-white/25'}`}
								/>
							)}
						</div>
					);
				})}
			</div>
			<div
				aria-hidden="true"
				className="mt-1 flex justify-between text-[11px] text-white/55 tabular-nums"
			>
				<span>{formatClock(slots[0].time)}</span>
				<span>{formatClock(middle.time)}</span>
				<span>{formatClock(slots[slots.length - 1].time)}</span>
			</div>
		</section>
	);
}
