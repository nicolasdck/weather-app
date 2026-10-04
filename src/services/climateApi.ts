import type { WeatherLocation } from '../types/weather'

const ARCHIVE_URL = 'https://archive-api.open-meteo.com/v1/archive'
const STORAGE_KEY = 'meteo:normals'

/** Nombre d'années d'historique moyennées. */
const YEARS = 10
/** Demi-largeur (jours) de la fenêtre autour de la date, pour lisser les aléas d'une année. */
const WINDOW_DAYS = 7
const DAY_MS = 24 * 60 * 60 * 1000

export interface TemperatureNormal {
  /** Moyenne des maximales (°C) autour de cette date sur les dernières années. */
  max: number
  min: number
}

interface CachedNormal extends TemperatureNormal {
  date: string
}

interface ArchiveResponse {
  daily?: {
    time: string[]
    temperature_2m_max: (number | null)[]
    temperature_2m_min: (number | null)[]
  }
}

function cacheKey(location: WeatherLocation): string {
  return `${location.latitude.toFixed(2)},${location.longitude.toFixed(2)}`
}

function readCache(): Record<string, CachedNormal> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') as Record<string, CachedNormal>
  } catch {
    return {}
  }
}

/** Normale déjà calculée pour ce lieu et cette date, si elle est en mémoire. */
export function readCachedNormal(
  location: WeatherLocation,
  isoDate: string,
): TemperatureNormal | null {
  const cached = readCache()[cacheKey(location)]
  return cached && cached.date === isoDate ? { max: cached.max, min: cached.min } : null
}

function saveNormal(location: WeatherLocation, isoDate: string, normal: TemperatureNormal): void {
  try {
    // On ne garde que les normales du jour : celles d'hier ne servent plus.
    const fresh = Object.fromEntries(
      Object.entries(readCache()).filter(([, value]) => value.date === isoDate),
    )
    fresh[cacheKey(location)] = { ...normal, date: isoDate }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh))
  } catch {
    // Stockage indisponible : la normale sera recalculée à la prochaine visite.
  }
}

function average(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

/**
 * Normale de saison pour une date : moyenne des températures observées autour de ce jour
 * de l'année sur les dernières années (archives Open-Meteo). `null` si l'historique manque.
 */
export async function fetchTemperatureNormal(
  location: WeatherLocation,
  isoDate: string,
  signal?: AbortSignal,
): Promise<TemperatureNormal | null> {
  const year = Number(isoDate.slice(0, 4))
  const month = Number(isoDate.slice(5, 7))
  const day = Number(isoDate.slice(8, 10))

  const params = new URLSearchParams({
    latitude: location.latitude.toFixed(4),
    longitude: location.longitude.toFixed(4),
    start_date: `${year - YEARS}-01-01`,
    end_date: `${year - 1}-12-31`,
    daily: 'temperature_2m_max,temperature_2m_min',
    timezone: 'auto',
  })
  const response = await fetch(`${ARCHIVE_URL}?${params}`, { signal })
  if (!response.ok) return null

  const daily = ((await response.json()) as ArchiveResponse).daily
  if (!daily) return null

  const maxima: number[] = []
  const minima: number[] = []
  daily.time.forEach((time, index) => {
    const sampleYear = Number(time.slice(0, 4))
    const sample = Date.parse(`${time}T00:00:00Z`)
    // Distance au même jour de l'année, en tenant compte du passage d'une année à l'autre.
    const distance = Math.min(
      ...[sampleYear - 1, sampleYear, sampleYear + 1].map((anchorYear) =>
        Math.abs(sample - Date.UTC(anchorYear, month - 1, day)),
      ),
    )
    if (distance > WINDOW_DAYS * DAY_MS) return

    const max = daily.temperature_2m_max[index]
    const min = daily.temperature_2m_min[index]
    if (typeof max === 'number') maxima.push(max)
    if (typeof min === 'number') minima.push(min)
  })
  if (maxima.length === 0 || minima.length === 0) return null

  const normal = { max: average(maxima), min: average(minima) }
  saveNormal(location, isoDate, normal)
  return normal
}
