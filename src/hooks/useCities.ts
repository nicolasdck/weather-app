import { useCallback, useEffect, useRef, useState } from 'react'
import { getCurrentCoordinates } from '../services/geolocation'
import { fetchWeather, geocodeCity, getErrorMessage, isAbortError } from '../services/weatherApi'
import type { WeatherEntry, WeatherLocation } from '../types/weather'

const STORAGE_KEY = 'meteo:cities'
const LEGACY_STORAGE_KEY = 'meteo:last-location'
const POSITION_KEY = 'position'

interface CitiesState {
  locations: WeatherLocation[]
  activeIndex: number
}

/** Identifiant stable d'un lieu ; la position actuelle n'occupe qu'un seul emplacement. */
export function getLocationKey(location: WeatherLocation): string {
  if (location.isCurrentPosition) return POSITION_KEY
  return `${location.latitude.toFixed(3)},${location.longitude.toFixed(3)}`
}

function isLocation(value: unknown): value is WeatherLocation {
  if (typeof value !== 'object' || value === null) return false
  const candidate = value as Partial<WeatherLocation>
  return (
    typeof candidate.name === 'string' &&
    typeof candidate.latitude === 'number' &&
    typeof candidate.longitude === 'number'
  )
}

function readStoredCities(): CitiesState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<CitiesState>
      const locations = Array.isArray(parsed.locations) ? parsed.locations.filter(isLocation) : []
      const activeIndex = typeof parsed.activeIndex === 'number' ? parsed.activeIndex : 0
      return {
        locations,
        activeIndex: Math.max(0, Math.min(activeIndex, locations.length - 1)),
      }
    }

    // Ancien format : une seule ville mémorisée.
    const legacy = localStorage.getItem(LEGACY_STORAGE_KEY)
    if (legacy) {
      const location: unknown = JSON.parse(legacy)
      if (isLocation(location)) return { locations: [location], activeIndex: 0 }
    }
  } catch {
    // Stockage illisible ou indisponible : on repart d'une liste vide.
  }
  return { locations: [], activeIndex: 0 }
}

export interface UseCitiesResult {
  locations: WeatherLocation[]
  activeIndex: number
  /** Météo par ville, indexée par `getLocationKey` ; absente tant que rien n'a été chargé. */
  entries: Record<string, WeatherEntry>
  /** Message à afficher (géolocalisation refusée, ville introuvable…). */
  notice: string | null
  /** Géolocalisation ou géocodage en cours. */
  isBusy: boolean
  setActiveIndex: (index: number) => void
  /** Ajoute une ville et l'affiche ; si elle existe déjà, se contente de l'afficher. */
  addLocation: (location: WeatherLocation) => void
  removeLocation: (index: number) => void
  /** Géocode un nom de ville puis l'ajoute. */
  searchByName: (name: string) => void
  /** Ajoute (ou met à jour) la position actuelle, placée en premier. */
  locate: () => void
  refresh: (index: number) => void
  dismissNotice: () => void
}

export function useCities(): UseCitiesResult {
  const [cities, setCities] = useState<CitiesState>(readStoredCities)
  const [entries, setEntries] = useState<Record<string, WeatherEntry>>({})
  const [notice, setNotice] = useState<string | null>(null)
  // Sans ville enregistrée, on démarre par une géolocalisation.
  const [isBusy, setIsBusy] = useState(() => cities.locations.length === 0)

  // Requêtes météo en cours, par clé de lieu.
  const controllers = useRef(new Map<string, AbortController>())

  const cancelLoad = useCallback((key: string) => {
    controllers.current.get(key)?.abort()
    controllers.current.delete(key)
  }, [])

  const load = useCallback((location: WeatherLocation) => {
    const key = getLocationKey(location)
    controllers.current.get(key)?.abort()
    const controller = new AbortController()
    controllers.current.set(key, controller)

    fetchWeather(location, controller.signal)
      .then((data) => {
        if (controllers.current.get(key) !== controller) return
        controllers.current.delete(key)
        setEntries((previous) => ({ ...previous, [key]: { status: 'success', data, error: null } }))
      })
      .catch((error: unknown) => {
        // Requête remplacée ou annulée : son résultat ne compte plus.
        if (controllers.current.get(key) !== controller) return
        controllers.current.delete(key)
        if (isAbortError(error)) return
        setEntries((previous) => ({
          ...previous,
          [key]: {
            status: 'error',
            data: previous[key]?.data ?? null,
            error: getErrorMessage(error),
          },
        }))
      })
  }, [])

  const markLoading = useCallback((key: string) => {
    setEntries((previous) => ({
      ...previous,
      [key]: { status: 'loading', data: previous[key]?.data ?? null, error: null },
    }))
  }, [])

  const { locations, activeIndex } = cities

  // Charge la ville affichée et ses voisines, pour que le balayage soit immédiat.
  useEffect(() => {
    for (let index = activeIndex - 1; index <= activeIndex + 1; index += 1) {
      const location = locations[index]
      if (!location) continue
      const key = getLocationKey(location)
      if (!entries[key] && !controllers.current.has(key)) load(location)
    }
  }, [locations, activeIndex, entries, load])

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cities))
    } catch {
      // Stockage indisponible (navigation privée, quota) : on continue sans mémoriser.
    }
  }, [cities])

  const runLocate = useCallback(() => {
    getCurrentCoordinates()
      .then((coordinates) => {
        const position: WeatherLocation = {
          name: 'Ma position',
          ...coordinates,
          isCurrentPosition: true,
        }
        markLoading(POSITION_KEY)
        load(position)
        setCities((previous) => ({
          locations: [position, ...previous.locations.filter((item) => !item.isCurrentPosition)],
          activeIndex: 0,
        }))
        setNotice(null)
      })
      .catch((error: unknown) => setNotice(getErrorMessage(error)))
      .finally(() => setIsBusy(false))
  }, [load, markLoading])

  useEffect(() => {
    const pending = controllers.current
    if (readStoredCities().locations.length === 0) runLocate()

    return () => {
      pending.forEach((controller) => controller.abort())
      pending.clear()
    }
  }, [runLocate])

  const locate = useCallback(() => {
    setIsBusy(true)
    setNotice(null)
    runLocate()
  }, [runLocate])

  const setActiveIndex = useCallback((index: number) => {
    setCities((previous) =>
      index === previous.activeIndex || index < 0 || index >= previous.locations.length
        ? previous
        : { ...previous, activeIndex: index },
    )
  }, [])

  const addLocation = useCallback((location: WeatherLocation) => {
    setNotice(null)
    setCities((previous) => {
      const key = getLocationKey(location)
      const existing = previous.locations.findIndex((item) => getLocationKey(item) === key)
      if (existing >= 0) return { ...previous, activeIndex: existing }
      return {
        locations: [...previous.locations, location],
        activeIndex: previous.locations.length,
      }
    })
  }, [])

  const removeLocation = useCallback(
    (index: number) => {
      const location = locations[index]
      if (!location) return
      const key = getLocationKey(location)
      cancelLoad(key)
      setEntries((previous) => {
        const next = { ...previous }
        delete next[key]
        return next
      })
      setCities((previous) => {
        const remaining = previous.locations.filter((_, itemIndex) => itemIndex !== index)
        const shifted = previous.activeIndex > index ? previous.activeIndex - 1 : previous.activeIndex
        return {
          locations: remaining,
          activeIndex: Math.max(0, Math.min(shifted, remaining.length - 1)),
        }
      })
    },
    [locations, cancelLoad],
  )

  const searchByName = useCallback(
    (name: string) => {
      const query = name.trim()
      if (!query) return
      setIsBusy(true)
      setNotice(null)
      geocodeCity(query)
        .then(addLocation)
        .catch((error: unknown) => setNotice(getErrorMessage(error)))
        .finally(() => setIsBusy(false))
    },
    [addLocation],
  )

  const refresh = useCallback(
    (index: number) => {
      const location = locations[index]
      if (!location) return
      if (location.isCurrentPosition) {
        locate()
        return
      }
      markLoading(getLocationKey(location))
      load(location)
    },
    [locations, locate, load, markLoading],
  )

  const dismissNotice = useCallback(() => setNotice(null), [])

  return {
    locations,
    activeIndex,
    entries,
    notice,
    isBusy,
    setActiveIndex,
    addLocation,
    removeLocation,
    searchByName,
    locate,
    refresh,
    dismissNotice,
  }
}
