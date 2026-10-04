import { useCallback, useEffect, useState } from 'react';
import { Settings, X } from 'lucide-react';
import { CityCarousel } from './components/CityCarousel';
import { CityManager } from './components/CityManager';
import { CityPage } from './components/CityPage';
import { CityPager } from './components/CityPager';
import { PwaBanners } from './components/PwaBanners';
import { SearchBar } from './components/SearchBar';
import { SettingsModal } from './components/SettingsModal';
import { EmptyState } from './components/StatusMessages';
import { WeatherBackdrop } from './components/WeatherBackdrop';
import { WeatherSkeleton } from './components/WeatherSkeleton';
import { getLocationKey, useCities } from './hooks/useCities';
import { usePwaInstall } from './hooks/usePwaInstall';
import { useServiceWorkerUpdate } from './hooks/useServiceWorkerUpdate';

const DAY_THEME_COLOR = '#0ea5e9';
const NIGHT_THEME_COLOR = '#0f172a';

/** Avant les premières données, on se fie à l'heure de l'appareil. */
function isDeviceNight(): boolean {
	const hour = new Date().getHours();
	return hour < 7 || hour >= 20;
}

function App() {
	const {
		locations,
		activeIndex,
		entries,
		notice,
		isBusy,
		setActiveIndex,
		addLocation,
		removeLocation,
		moveLocation,
		searchByName,
		locate,
		refresh,
		dismissNotice,
	} = useCities();
	const {
		mode: installMode,
		install,
		dismiss: dismissInstall,
	} = usePwaInstall();
	const { updateAvailable, isUpdating, applyUpdate } = useServiceWorkerUpdate();
	const [isManagingCities, setIsManagingCities] = useState(false);
	const closeCityManager = useCallback(() => setIsManagingCities(false), []);
	const [isSettingsOpen, setIsSettingsOpen] = useState(false);
	const closeSettings = useCallback(() => setIsSettingsOpen(false), []);

	// Le thème suit la ville affichée.
	const activeLocation = locations[activeIndex];
	const activeData = activeLocation
		? entries[getLocationKey(activeLocation)]?.data
		: null;
	const isNight = activeData ? !activeData.current.isDay : isDeviceNight();
	const hasCities = locations.length > 0;

	useEffect(() => {
		document
			.querySelector('meta[name="theme-color"]')
			?.setAttribute('content', isNight ? NIGHT_THEME_COLOR : DAY_THEME_COLOR);
	}, [isNight]);

	return (
		<div className="relative min-h-dvh overflow-x-clip text-white">
			{/* Deux fonds superposés pour un fondu entre les thèmes jour et nuit. */}
			<div
				aria-hidden="true"
				className="fixed inset-0 -z-10 bg-linear-to-b from-sky-500 via-sky-600 to-indigo-700"
			/>
			<div
				aria-hidden="true"
				className={`fixed inset-0 -z-10 bg-linear-to-b from-slate-900 via-indigo-950 to-slate-950 transition-opacity duration-1000 ${
					isNight ? 'opacity-100' : 'opacity-0'
				}`}
			/>
			<WeatherBackdrop
				weatherCode={activeData ? activeData.current.weatherCode : null}
				isNight={isNight}
			/>

			<div className="flex min-h-dvh flex-col gap-1.5 py-2">
				<header className="mx-auto w-full max-w-2xl space-y-2 px-2">
					<div className="flex items-start gap-2">
						<div className="min-w-0 flex-1">
							<SearchBar
								onSelect={addLocation}
								onSubmitQuery={searchByName}
								onLocate={locate}
								isBusy={isBusy}
							/>
						</div>
						<button
							type="button"
							onClick={() => setIsSettingsOpen(true)}
							aria-label="Réglages"
							title="Réglages"
							className="grid size-12 shrink-0 place-items-center rounded-md border border-white/20 bg-white/15 text-white shadow-lg shadow-black/10 backdrop-blur-xl transition hover:bg-white/25 active:scale-95"
						>
							<Settings className="size-5" aria-hidden="true" />
						</button>
					</div>

					{notice && hasCities && (
						<div
							role="alert"
							className="flex items-center gap-2 rounded-md border border-white/15 bg-slate-900/60 py-1.5 pr-1.5 pl-4 text-sm text-amber-100 backdrop-blur-xl"
						>
							<p className="min-w-0 flex-1">{notice}</p>
							<button
								type="button"
								onClick={dismissNotice}
								aria-label="Fermer"
								className="grid size-8 shrink-0 place-items-center rounded-md text-white/70 transition hover:bg-white/15 hover:text-white"
							>
								<X className="size-4" aria-hidden="true" />
							</button>
						</div>
					)}

					<CityPager
						locations={locations}
						activeIndex={activeIndex}
						onSelect={setActiveIndex}
						onManage={() => setIsManagingCities(true)}
					/>
				</header>

				<main className="flex-1">
					{hasCities ? (
						<CityCarousel
							activeIndex={activeIndex}
							onActiveIndexChange={setActiveIndex}
						>
							{locations.map((location, index) => {
								const key = getLocationKey(location);
								return (
									<CityPage
										key={key}
										location={location}
										entry={entries[key]}
										onRefresh={() => refresh(index)}
										onRemove={() => removeLocation(index)}
									/>
								);
							})}
						</CityCarousel>
					) : (
						<div className="mx-auto max-w-2xl px-4">
							{isBusy ? (
								<WeatherSkeleton />
							) : (
								<EmptyState notice={notice} onLocate={locate} />
							)}
						</div>
					)}
				</main>

				<footer className="px-4 text-center text-xs text-white/50">
					Données météo fournies par{' '}
					<a
						href="https://open-meteo.com"
						target="_blank"
						rel="noreferrer"
						className="underline underline-offset-2 hover:text-white/80"
					>
						Open-Meteo
					</a>
				</footer>
			</div>

			{isManagingCities && hasCities && (
				<CityManager
					locations={locations}
					entries={entries}
					activeIndex={activeIndex}
					onSelect={setActiveIndex}
					onMove={moveLocation}
					onRemove={removeLocation}
					onClose={closeCityManager}
				/>
			)}

			{isSettingsOpen && <SettingsModal onClose={closeSettings} />}

			<PwaBanners
				installMode={installMode}
				onInstall={install}
				onDismissInstall={dismissInstall}
				updateAvailable={updateAvailable}
				isUpdating={isUpdating}
				onUpdate={applyUpdate}
			/>
		</div>
	);
}

export default App;
