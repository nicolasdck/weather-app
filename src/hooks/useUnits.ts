import { useMemo, useSyncExternalStore } from 'react'
import {
  DEFAULT_UNITS,
  formatTemperature,
  formatTemperatureDelta,
  formatWind,
  formatWindValue,
  isTemperatureUnit,
  isWindUnit,
  type Units,
} from '../utils/units'

const STORAGE_KEY = 'meteo:units'

function readStoredUnits(): Units {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') as Partial<Units>
    return {
      temperature: isTemperatureUnit(parsed.temperature)
        ? parsed.temperature
        : DEFAULT_UNITS.temperature,
      wind: isWindUnit(parsed.wind) ? parsed.wind : DEFAULT_UNITS.wind,
    }
  } catch {
    return DEFAULT_UNITS
  }
}

// Petit magasin partagé : tous les composants abonnés se mettent à jour ensemble,
// sans avoir à faire descendre les réglages par les props.
let currentUnits = readStoredUnits()
const listeners = new Set<() => void>()

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function getSnapshot(): Units {
  return currentUnits
}

export function setUnits(patch: Partial<Units>): void {
  currentUnits = { ...currentUnits, ...patch }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(currentUnits))
  } catch {
    // Stockage indisponible : le réglage vaut pour la session en cours.
  }
  listeners.forEach((listener) => listener())
}

export interface UseUnitsResult {
  units: Units
  /** Température en °C → `23°` dans l'unité choisie. */
  formatTemperature: (celsius: number) => string
  /** Écart de température en °C → `4°` dans l'unité choisie. */
  formatTemperatureDelta: (celsius: number) => string
  /** Vitesse en km/h → `12 km/h` dans l'unité choisie. */
  formatWind: (kmh: number) => string
  /** Vitesse en km/h → valeur seule dans l'unité choisie. */
  formatWindValue: (kmh: number) => string
}

export function useUnits(): UseUnitsResult {
  const units = useSyncExternalStore(subscribe, getSnapshot)

  return useMemo(
    () => ({
      units,
      formatTemperature: (celsius) => formatTemperature(celsius, units.temperature),
      formatTemperatureDelta: (celsius) => formatTemperatureDelta(celsius, units.temperature),
      formatWind: (kmh) => formatWind(kmh, units.wind),
      formatWindValue: (kmh) => formatWindValue(kmh, units.wind),
    }),
    [units],
  )
}
