import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import * as L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Loader2, Pause, Play, X } from 'lucide-react';
import {
	RADAR_MAX_NATIVE_ZOOM,
	fetchRadarFrames,
	type RadarFrame,
} from '../services/radarApi';
import { getErrorMessage, isAbortError } from '../services/weatherApi';
import type { WeatherLocation } from '../types/weather';

// Fond de carte : CARTO sombre si une clé est fournie (VITE_CARTO_KEY, gratuite sur
// carto.com/basemaps/apikey), sinon OpenStreetMap, sans clé, assombri en CSS.
const CARTO_KEY: string | undefined = import.meta.env.VITE_CARTO_KEY;
const BASEMAP = CARTO_KEY
	? {
			url: `https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png?key=${encodeURIComponent(CARTO_KEY)}`,
			subdomains: 'abcd',
			className: '',
			attribution:
				'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
		}
	: {
			url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
			subdomains: '',
			className: 'radar-basemap-dark',
			attribution:
				'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
		};
const RADAR_ATTRIBUTION =
	'Radar : <a href="https://www.rainviewer.com">RainViewer</a>';

const INITIAL_ZOOM = 7;
const MIN_ZOOM = 3;
const MAX_ZOOM = 10;
const RADAR_OPACITY = 0.7;
const FRAME_DURATION_MS = 600;

interface RadarModalProps {
	location: WeatherLocation;
	/** Fuseau du lieu, pour afficher l'heure des images dans son heure locale. */
	timezone: string;
	onClose: () => void;
}

function prefersReducedMotion(): boolean {
	return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** Carte radar plein écran : animation des précipitations observées autour d'une ville. */
export default function RadarModal({
	location,
	timezone,
	onClose,
}: RadarModalProps) {
	const containerRef = useRef<HTMLDivElement>(null);
	const mapRef = useRef<L.Map | null>(null);
	const layersRef = useRef<L.TileLayer[]>([]);

	const [frames, setFrames] = useState<RadarFrame[] | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [frameIndex, setFrameIndex] = useState(0);
	const [isPlaying, setIsPlaying] = useState(() => !prefersReducedMotion());

	const { latitude, longitude } = location;

	// Carte de fond, centrée sur la ville.
	useEffect(() => {
		const container = containerRef.current;
		if (!container) return;

		const map = new L.Map(container, {
			center: [latitude, longitude],
			zoom: INITIAL_ZOOM,
			minZoom: MIN_ZOOM,
			maxZoom: MAX_ZOOM,
			zoomControl: false,
		});
		new L.TileLayer(BASEMAP.url, {
			attribution: BASEMAP.attribution,
			subdomains: BASEMAP.subdomains,
			className: BASEMAP.className,
			maxZoom: MAX_ZOOM,
		}).addTo(map);
		new L.CircleMarker([latitude, longitude], {
			radius: 6,
			color: '#ffffff',
			weight: 2,
			fillColor: '#38bdf8',
			fillOpacity: 1,
			interactive: false,
		}).addTo(map);
		map.attributionControl.setPrefix(false);
		mapRef.current = map;

		return () => {
			map.remove();
			mapRef.current = null;
		};
	}, [latitude, longitude]);

	useEffect(() => {
		const controller = new AbortController();
		fetchRadarFrames(controller.signal)
			.then((result) => {
				setFrames(result);
				// On démarre sur l'image la plus récente.
				setFrameIndex(result.length - 1);
			})
			.catch((fetchError: unknown) => {
				if (!isAbortError(fetchError)) setError(getErrorMessage(fetchError));
			});
		return () => controller.abort();
	}, []);

	// Une couche par image, toutes chargées d'avance pour une animation sans à-coups.
	useEffect(() => {
		const map = mapRef.current;
		if (!map || !frames) return;

		const layers = frames.map((frame) =>
			new L.TileLayer(frame.tileUrl, {
				attribution: RADAR_ATTRIBUTION,
				opacity: 0,
				maxNativeZoom: RADAR_MAX_NATIVE_ZOOM,
				maxZoom: MAX_ZOOM,
			}).addTo(map),
		);
		layersRef.current = layers;

		return () => {
			layers.forEach((layer) => layer.remove());
			layersRef.current = [];
		};
	}, [frames]);

	useEffect(() => {
		layersRef.current.forEach((layer, index) =>
			layer.setOpacity(index === frameIndex ? RADAR_OPACITY : 0),
		);
	}, [frames, frameIndex]);

	const frameCount = frames?.length ?? 0;
	useEffect(() => {
		if (!isPlaying || frameCount < 2) return;
		const timer = window.setInterval(
			() => setFrameIndex((index) => (index + 1) % frameCount),
			FRAME_DURATION_MS,
		);
		return () => window.clearInterval(timer);
	}, [isPlaying, frameCount]);

	useEffect(() => {
		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.key === 'Escape') onClose();
		};
		const previousOverflow = document.body.style.overflow;
		document.body.style.overflow = 'hidden';
		document.addEventListener('keydown', handleKeyDown);
		return () => {
			document.body.style.overflow = previousOverflow;
			document.removeEventListener('keydown', handleKeyDown);
		};
	}, [onClose]);

	const frame = frames?.[frameIndex];
	const frameTime = frame
		? new Intl.DateTimeFormat('fr-FR', {
				hour: '2-digit',
				minute: '2-digit',
				timeZone: timezone,
			}).format(frame.time)
		: null;

	// Rendu dans <body> : les cartes en verre (backdrop-filter) piègent sinon le `fixed`.
	return createPortal(
		<div
			role="dialog"
			aria-modal="true"
			aria-label={`Radar des précipitations, ${location.name}`}
			className="fixed inset-0 z-40 flex flex-col bg-slate-950 text-white"
		>
			<div className="flex items-center justify-between gap-2 px-4 pt-[max(0.5rem,env(safe-area-inset-top))] pb-2">
				<div className="min-w-0">
					<h2 className="truncate text-base font-semibold">
						Radar des précipitations
					</h2>
					<p className="truncate text-xs text-white/60">{location.name}</p>
				</div>
				<button
					type="button"
					onClick={onClose}
					aria-label="Fermer le radar"
					className="grid size-9 shrink-0 place-items-center rounded-md text-white/75 transition hover:bg-white/15 hover:text-white"
				>
					<X className="size-5" aria-hidden="true" />
				</button>
			</div>

			{/* `z-0` : confine les z-index internes de Leaflet sous les commandes. */}
			<div className="relative z-0 flex-1">
				<div ref={containerRef} className="absolute inset-0 bg-slate-900" />
			</div>

			<div className="px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
				{error ? (
					<p role="alert" className="text-sm text-amber-100">
						{error}
					</p>
				) : !frames || !frame ? (
					<p className="flex items-center gap-2 text-sm text-white/70">
						<Loader2 className="size-4 animate-spin" aria-hidden="true" />
						Chargement des images radar…
					</p>
				) : (
					<div className="flex items-center gap-3">
						<button
							type="button"
							onClick={() => setIsPlaying((playing) => !playing)}
							aria-label={isPlaying ? 'Mettre en pause' : "Lancer l'animation"}
							className="grid size-10 shrink-0 place-items-center rounded-md border border-white/20 bg-white/15 transition hover:bg-white/25 active:scale-95"
						>
							{isPlaying ? (
								<Pause className="size-4" aria-hidden="true" />
							) : (
								<Play className="size-4" aria-hidden="true" />
							)}
						</button>
						<input
							type="range"
							min={0}
							max={frames.length - 1}
							step={1}
							value={frameIndex}
							onChange={(event) => {
								setIsPlaying(false);
								setFrameIndex(Number(event.target.value));
							}}
							aria-label="Image radar"
							aria-valuetext={frameTime ?? undefined}
							className="min-w-0 flex-1 accent-sky-400"
						/>
						<p className="w-24 shrink-0 text-right text-sm tabular-nums">
							<span className="block font-semibold">{frameTime}</span>
							<span className="block text-xs text-white/60">
								{frame.isForecast ? 'Prévision' : 'Observation'}
							</span>
						</p>
					</div>
				)}
			</div>
		</div>,
		document.body,
	);
}
