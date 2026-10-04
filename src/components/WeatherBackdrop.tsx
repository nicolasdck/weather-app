import { useSyncExternalStore } from 'react';
import type { CSSProperties } from 'react';

interface Scene {
	/** Nombre de gouttes (0 = pas de pluie). */
	rain: number;
	snow: number;
	clouds: number;
	fog: boolean;
	storm: boolean;
	/** Ciel assez dégagé pour voir le soleil ou les étoiles. */
	clear: boolean;
}

function getScene(code: number): Scene {
	const scene: Scene = {
		rain: 0,
		snow: 0,
		clouds: 0,
		fog: false,
		storm: false,
		clear: false,
	};
	if (code <= 1) return { ...scene, clear: true };
	if (code === 2) return { ...scene, clear: true, clouds: 2 };
	if (code === 3) return { ...scene, clouds: 4 };
	if (code === 45 || code === 48) return { ...scene, fog: true, clouds: 2 };
	if (code >= 51 && code <= 57) return { ...scene, rain: 22, clouds: 3 };
	if (code === 65 || code === 67 || code === 82)
		return { ...scene, rain: 70, clouds: 4 };
	if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82))
		return { ...scene, rain: 42, clouds: 3 };
	if ((code >= 71 && code <= 77) || code === 85 || code === 86)
		return { ...scene, snow: 50, clouds: 3 };
	if (code >= 95) return { ...scene, rain: 70, clouds: 4, storm: true };
	return scene;
}

// Générateur déterministe : les particules gardent la même place d'un rendu à l'autre.
function createRandom(seed: number): () => number {
	let state = seed;
	return () => {
		state = (state * 1664525 + 1013904223) % 4294967296;
		return state / 4294967296;
	};
}

const random = createRandom(42);

const RAIN_DROPS = Array.from({ length: 70 }, () => ({
	left: random() * 110,
	height: 8 + random() * 8,
	opacity: 0.2 + random() * 0.35,
	duration: 0.55 + random() * 0.5,
	delay: -random() * 1.2,
}));

const SNOW_FLAKES = Array.from({ length: 50 }, () => ({
	left: random() * 100,
	size: 2 + random() * 4,
	opacity: 0.4 + random() * 0.5,
	duration: 7 + random() * 7,
	delay: -random() * 14,
}));

const STARS = Array.from({ length: 70 }, () => ({
	left: random() * 100,
	top: random() * 70,
	size: 1 + random() * 1.5,
	duration: 2 + random() * 4,
	delay: -random() * 6,
}));

const CLOUDS = [
	{ top: 4, width: 70, duration: 95, delay: -20, opacity: 0.22 },
	{ top: 22, width: 55, duration: 130, delay: -80, opacity: 0.16 },
	{ top: 44, width: 80, duration: 110, delay: -50, opacity: 0.14 },
	{ top: 12, width: 45, duration: 150, delay: -120, opacity: 0.18 },
];

function subscribeToMotionPreference(listener: () => void): () => void {
	const query = window.matchMedia('(prefers-reduced-motion: reduce)');
	query.addEventListener('change', listener);
	return () => query.removeEventListener('change', listener);
}

function prefersReducedMotion(): boolean {
	return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function animation(
	name: string,
	duration: number,
	delay: number,
	timing = 'linear',
): CSSProperties {
	return { animation: `${name} ${duration}s ${timing} ${delay}s infinite` };
}

interface WeatherBackdropProps {
	/** Code WMO de la ville affichée ; `null` tant qu'aucune donnée n'est chargée. */
	weatherCode: number | null;
	isNight: boolean;
}

/** Fond animé selon la météo : pluie, neige, nuages, étoiles, soleil, éclairs. */
export function WeatherBackdrop({
	weatherCode,
	isNight,
}: WeatherBackdropProps) {
	const reducedMotion = useSyncExternalStore(
		subscribeToMotionPreference,
		prefersReducedMotion,
	);
	if (weatherCode === null) return null;

	const scene = getScene(weatherCode);
	const animated = !reducedMotion;

	return (
		<div
			aria-hidden="true"
			className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
		>
			{scene.clear && !isNight && (
				<div
					className="absolute -top-[20vmin] -right-[20vmin] size-[80vmin] rounded-full bg-[radial-gradient(circle,rgb(254_240_138/0.55)_0%,rgb(253_224_71/0.18)_35%,transparent_70%)]"
					style={
						animated
							? animation('backdrop-glow', 9, 0, 'ease-in-out')
							: undefined
					}
				/>
			)}

			{scene.clear &&
				isNight &&
				STARS.map((star, index) => (
					<span
						key={index}
						className="absolute rounded-full bg-white"
						style={{
							left: `${star.left}%`,
							top: `${star.top}%`,
							width: star.size,
							height: star.size,
							opacity: 0.7,
							...(animated
								? animation(
										'backdrop-twinkle',
										star.duration,
										star.delay,
										'ease-in-out',
									)
								: {}),
						}}
					/>
				))}

			{animated &&
				CLOUDS.slice(0, scene.clouds).map((cloud, index) => (
					<span
						key={index}
						className="absolute left-0 h-[22vh] rounded-full bg-white blur-3xl"
						style={{
							top: `${cloud.top}%`,
							width: `${cloud.width}vw`,
							opacity: isNight ? cloud.opacity * 0.6 : cloud.opacity,
							...animation('backdrop-drift', cloud.duration, cloud.delay),
						}}
					/>
				))}

			{scene.fog && (
				<div className="absolute inset-0 bg-linear-to-b from-white/5 via-white/20 to-white/10" />
			)}

			{animated &&
				RAIN_DROPS.slice(0, scene.rain).map((drop, index) => (
					<span
						key={index}
						className="absolute top-0 w-px bg-linear-to-b from-transparent to-white"
						style={{
							left: `${drop.left}%`,
							height: `${drop.height}vh`,
							opacity: drop.opacity,
							...animation('backdrop-rain', drop.duration, drop.delay),
						}}
					/>
				))}

			{animated &&
				SNOW_FLAKES.slice(0, scene.snow).map((flake, index) => (
					<span
						key={index}
						className="absolute top-0 rounded-full bg-white"
						style={{
							left: `${flake.left}%`,
							width: flake.size,
							height: flake.size,
							opacity: flake.opacity,
							...animation('backdrop-snow', flake.duration, flake.delay),
						}}
					/>
				))}

			{animated && scene.storm && (
				<div
					className="absolute inset-0 bg-white opacity-0"
					style={animation('backdrop-flash', 9, 0)}
				/>
			)}
		</div>
	);
}
