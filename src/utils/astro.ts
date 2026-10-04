import * as SunCalc from 'suncalc'

const DAY_MS = 24 * 60 * 60 * 1000
const STEP_MS = 10 * 60 * 1000
/** Durée de recherche du prochain lever ou coucher de Lune (un peu plus d'un jour lunaire). */
const MOON_SEARCH_MS = 26 * 60 * 60 * 1000
/** Hauteur apparente (en degrés, comme suncalc 2) du centre de la Lune à son lever ou coucher. */
const MOON_HORIZON = 0.133

const PHASE_NAMES = [
  'Nouvelle lune',
  'Premier croissant',
  'Premier quartier',
  'Gibbeuse croissante',
  'Pleine lune',
  'Gibbeuse décroissante',
  'Dernier quartier',
  'Dernier croissant',
]

export interface MoonInfo {
  /** 0 = nouvelle lune, 0,5 = pleine lune, 1 = nouvelle lune suivante. */
  phase: number
  /** Part éclairée du disque, de 0 à 1. */
  illumination: number
  name: string
}

export interface MoonTimes {
  /** Instants (ms) du prochain lever et du prochain coucher, s'ils ont lieu dans les 26 h. */
  rise: number | null
  set: number | null
}

export interface GoldenHours {
  /** [début, fin] en ms ; `null` si le soleil ne se lève ou ne se couche pas (régions polaires). */
  morning: [number, number] | null
  evening: [number, number] | null
}

/**
 * Convertit une heure locale ISO d'Open-Meteo (`2026-10-04T14:15`) en instant absolu,
 * à partir du décalage UTC du lieu.
 */
export function localIsoToInstant(isoLocal: string, utcOffsetSeconds: number): number {
  const withTime = isoLocal.length > 10 ? `${isoLocal}:00Z` : `${isoLocal}T00:00:00Z`
  return Date.parse(withTime) - utcOffsetSeconds * 1000
}

export function getMoonInfo(instant: number): MoonInfo {
  const { phase, fraction } = SunCalc.getMoonIllumination(new Date(instant))
  // Huit phases de même durée, centrées sur les phases principales.
  const index = Math.round(phase * 8) % 8
  return { phase, illumination: fraction, name: PHASE_NAMES[index] }
}

/** Prochain lever et prochain coucher de la Lune à partir de l'instant `from`. */
export function getMoonTimes(from: number, latitude: number, longitude: number): MoonTimes {
  const altitudeAt = (instant: number) =>
    SunCalc.getMoonPosition(new Date(instant), latitude, longitude).altitude - MOON_HORIZON

  let rise: number | null = null
  let set: number | null = null
  let previous = altitudeAt(from)

  for (let instant = from + STEP_MS; instant <= from + MOON_SEARCH_MS; instant += STEP_MS) {
    const altitude = altitudeAt(instant)
    if (previous < 0 !== altitude < 0) {
      // Interpolation linéaire entre les deux relevés qui encadrent l'horizon.
      const crossing = instant - STEP_MS + (STEP_MS * previous) / (previous - altitude)
      if (previous < 0 && rise === null) rise = crossing
      if (previous >= 0 && set === null) set = crossing
    }
    previous = altitude
  }
  return { rise, set }
}

/** Heures dorées (soleil bas sur l'horizon) de la journée locale commençant à `dayStart`. */
export function getGoldenHours(dayStart: number, latitude: number, longitude: number): GoldenHours {
  const times = SunCalc.getTimes(new Date(dayStart + DAY_MS / 2), latitude, longitude)
  const range = (start: Date | null, end: Date | null): [number, number] | null => {
    const from = start?.getTime() ?? NaN
    const to = end?.getTime() ?? NaN
    return Number.isNaN(from) || Number.isNaN(to) ? null : [from, to]
  }
  return {
    morning: range(times.sunrise, times.goldenHourEnd),
    evening: range(times.goldenHour, times.sunset),
  }
}
