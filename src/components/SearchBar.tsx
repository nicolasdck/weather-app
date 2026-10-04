import { useEffect, useId, useRef, useState } from 'react';
import type { FormEvent, KeyboardEvent } from 'react';
import { Loader2, LocateFixed, MapPin, Search, X } from 'lucide-react';
import {
	isAbortError,
	searchCities,
	toWeatherLocation,
} from '../services/weatherApi';
import type { GeocodingResult, WeatherLocation } from '../types/weather';

const MIN_QUERY_LENGTH = 2;
const DEBOUNCE_MS = 300;

type SuggestionStatus = 'idle' | 'loading' | 'done' | 'error';

interface SearchBarProps {
	onSelect: (location: WeatherLocation) => void;
	/** Appelé quand l'utilisateur valide un texte sans choisir de suggestion. */
	onSubmitQuery: (query: string) => void;
	onLocate: () => void;
	/** Géolocalisation ou recherche par nom en cours. */
	isBusy?: boolean;
}

function describeResult(result: GeocodingResult): string {
	return [result.admin1, result.country]
		.filter((part): part is string => Boolean(part) && part !== result.name)
		.join(', ');
}

export function SearchBar({
	onSelect,
	onSubmitQuery,
	onLocate,
	isBusy = false,
}: SearchBarProps) {
	const [query, setQuery] = useState('');
	const [results, setResults] = useState<GeocodingResult[]>([]);
	const [status, setStatus] = useState<SuggestionStatus>('idle');
	const [isOpen, setIsOpen] = useState(false);
	const [activeIndex, setActiveIndex] = useState(-1);

	const containerRef = useRef<HTMLDivElement>(null);
	const inputRef = useRef<HTMLInputElement>(null);
	const listboxId = useId();

	const trimmedQuery = query.trim();
	const canSearch = trimmedQuery.length >= MIN_QUERY_LENGTH;
	const showPanel = isOpen && canSearch;

	// Suggestions en direct, avec délai anti-rebond et annulation des requêtes obsolètes.
	useEffect(() => {
		const name = query.trim();
		if (name.length < MIN_QUERY_LENGTH) return;

		const controller = new AbortController();
		const timer = window.setTimeout(() => {
			searchCities(name, controller.signal)
				.then((cities) => {
					setResults(cities);
					setStatus('done');
					setActiveIndex(-1);
				})
				.catch((error: unknown) => {
					if (isAbortError(error)) return;
					setResults([]);
					setStatus('error');
				});
		}, DEBOUNCE_MS);

		return () => {
			window.clearTimeout(timer);
			controller.abort();
		};
	}, [query]);

	useEffect(() => {
		const handlePointerDown = (event: PointerEvent) => {
			if (!containerRef.current?.contains(event.target as Node))
				setIsOpen(false);
		};
		document.addEventListener('pointerdown', handlePointerDown);
		return () => document.removeEventListener('pointerdown', handlePointerDown);
	}, []);

	const reset = () => {
		setQuery('');
		setResults([]);
		setStatus('idle');
		setActiveIndex(-1);
		setIsOpen(false);
	};

	const handleChange = (value: string) => {
		setQuery(value);
		setIsOpen(true);
		setActiveIndex(-1);
		if (value.trim().length >= MIN_QUERY_LENGTH) {
			setStatus('loading');
		} else {
			setResults([]);
			setStatus('idle');
		}
	};

	const choose = (result: GeocodingResult) => {
		onSelect(toWeatherLocation(result));
		reset();
		inputRef.current?.blur();
	};

	const handleSubmit = (event: FormEvent) => {
		event.preventDefault();
		if (!canSearch) return;

		const highlighted = results[activeIndex];
		if (highlighted) {
			choose(highlighted);
		} else if (status === 'done' && results.length > 0) {
			choose(results[0]);
		} else {
			// Suggestions pas encore chargées ou vides : le géocodage tranche (et signale l'erreur).
			onSubmitQuery(trimmedQuery);
			reset();
			inputRef.current?.blur();
		}
	};

	const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
		if (event.key === 'Escape') {
			setIsOpen(false);
			return;
		}
		if (!showPanel || results.length === 0) return;

		if (event.key === 'ArrowDown') {
			event.preventDefault();
			setActiveIndex((index) => (index + 1) % results.length);
		} else if (event.key === 'ArrowUp') {
			event.preventDefault();
			setActiveIndex((index) => (index <= 0 ? results.length - 1 : index - 1));
		}
	};

	const handleLocate = () => {
		reset();
		onLocate();
	};

	return (
		<div ref={containerRef} className="relative z-20">
			<div className="flex items-center gap-2">
				<form
					role="search"
					onSubmit={handleSubmit}
					className="flex h-12 flex-1 items-center gap-2 rounded-md border border-white/20 bg-white/15 px-4 shadow-lg shadow-black/10 backdrop-blur-xl transition focus-within:border-white/50 focus-within:bg-white/20"
				>
					<Search
						className="size-5 shrink-0 text-white/70"
						aria-hidden="true"
					/>
					<input
						ref={inputRef}
						type="text"
						inputMode="search"
						enterKeyHint="search"
						autoComplete="off"
						autoCorrect="off"
						spellCheck={false}
						value={query}
						onChange={(event) => handleChange(event.target.value)}
						onFocus={() => setIsOpen(true)}
						onKeyDown={handleKeyDown}
						placeholder="Ajouter une ville…"
						aria-label="Rechercher une ville à ajouter"
						role="combobox"
						aria-expanded={showPanel}
						aria-controls={listboxId}
						aria-autocomplete="list"
						aria-activedescendant={
							showPanel && activeIndex >= 0
								? `${listboxId}-option-${activeIndex}`
								: undefined
						}
						className="h-full min-w-0 flex-1 bg-transparent text-base text-white outline-none placeholder:text-white/60"
					/>
					{status === 'loading' && canSearch && (
						<Loader2
							className="size-5 shrink-0 animate-spin text-white/70"
							aria-hidden="true"
						/>
					)}
					{query && (
						<button
							type="button"
							onClick={() => {
								reset();
								inputRef.current?.focus();
							}}
							aria-label="Effacer la recherche"
							className="-mr-1 grid size-8 shrink-0 place-items-center rounded-md text-white/70 transition hover:bg-white/15 hover:text-white"
						>
							<X className="size-4" aria-hidden="true" />
						</button>
					)}
				</form>

				<button
					type="button"
					onClick={handleLocate}
					disabled={isBusy}
					aria-label="Utiliser ma position"
					title="Utiliser ma position"
					className="grid size-12 shrink-0 place-items-center rounded-md border border-white/20 bg-white/15 text-white shadow-lg shadow-black/10 backdrop-blur-xl transition hover:bg-white/25 active:scale-95"
				>
					{isBusy ? (
						<Loader2 className="size-5 animate-spin" aria-hidden="true" />
					) : (
						<LocateFixed className="size-5" aria-hidden="true" />
					)}
				</button>
			</div>

			{showPanel && (
				<div className="absolute inset-x-0 top-full mt-2 overflow-hidden rounded-md border border-white/20 bg-slate-900/80 shadow-2xl shadow-black/30 backdrop-blur-2xl">
					<ul id={listboxId} role="listbox" aria-label="Suggestions de villes">
						{results.map((result, index) => {
							const details = describeResult(result);
							const isActive = index === activeIndex;
							return (
								<li
									key={result.id}
									id={`${listboxId}-option-${index}`}
									role="option"
									aria-selected={isActive}
									onPointerEnter={() => setActiveIndex(index)}
									onClick={() => choose(result)}
									className={`flex cursor-pointer items-center gap-3 px-4 py-3 transition ${
										isActive ? 'bg-white/15' : ''
									}`}
								>
									<MapPin
										className="size-4 shrink-0 text-white/60"
										aria-hidden="true"
									/>
									<span className="min-w-0">
										<span className="block truncate font-medium text-white">
											{result.name}
										</span>
										{details && (
											<span className="block truncate text-sm text-white/60">
												{details}
											</span>
										)}
									</span>
								</li>
							);
						})}
					</ul>

					{status === 'loading' && results.length === 0 && (
						<p className="px-4 py-3 text-sm text-white/70">
							Recherche en cours…
						</p>
					)}
					{status === 'done' && results.length === 0 && (
						<p role="status" className="px-4 py-3 text-sm text-white/70">
							Aucune ville trouvée pour « {trimmedQuery} ».
						</p>
					)}
					{status === 'error' && (
						<p role="alert" className="px-4 py-3 text-sm text-rose-200">
							Les suggestions sont indisponibles. Appuyez sur Entrée pour lancer
							la recherche.
						</p>
					)}
				</div>
			)}
		</div>
	);
}
