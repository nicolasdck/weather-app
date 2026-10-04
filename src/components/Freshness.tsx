import { WifiOff } from 'lucide-react';
import { useNow } from '../hooks/useNow';

interface FreshnessProps {
	fetchedAt: number;
	isFromCache: boolean;
	className?: string;
}

function describeAge(ageMs: number): string {
	const minutes = Math.floor(Math.max(0, ageMs) / 60_000);
	if (minutes < 1) return "à l'instant";
	if (minutes < 60) return `il y a ${minutes} min`;
	const hours = Math.floor(minutes / 60);
	if (hours < 24) return `il y a ${hours} h`;
	return `il y a ${Math.floor(hours / 24)} j`;
}

/** « Mis à jour il y a… », avec un signalement quand les données viennent du cache hors ligne. */
export function Freshness({
	fetchedAt,
	isFromCache,
	className = '',
}: FreshnessProps) {
	const now = useNow();
	const age = describeAge(now - fetchedAt);

	if (isFromCache) {
		return (
			<p
				className={`flex items-center gap-1.5 text-xs text-amber-100 ${className}`}
			>
				<WifiOff className="size-3.5 shrink-0" aria-hidden="true" />
				Hors ligne · mis à jour {age}
			</p>
		);
	}

	return (
		<p className={`text-xs text-white/60 ${className}`}>Mis à jour {age}</p>
	);
}
