import { useCallback, useEffect, useRef, useState } from 'react'
import { getCurrentCoordinates } from '../services/geolocation'
import { fetchWeather, geocodeCity, getErrorMessage, isAbortError } from '../services/weatherApi'
import type { WeatherEntry, WeatherLocation } from '../types/weather'

const STORAGE_KEY = 'meteo:cities'
const LEGACY_STORAGE_KEY = 'meteo:last-location'
const POSITION_KEY = 'position'
/** Au-delà de ce délai, la météo affichée est rechargée automatiquement. */
const STALE_AFTER_MS = 15 * 60 * 1000
const STALE_CHECK_INTERVAL_MS = 60 * 1000

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
      // L'application s'ouvre toujours sur la première ville de la liste.
      return { locations, activeIndex: 0 }
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
  /** Déplace une ville dans la liste ; la première est celle affichée à l'ouverture. */
  moveLocation: (from: number, to: number) => void
  /** Géocode un nom de ville puis l'ajoute. */
  searchByName: (name: string) => void
  /** Ajoute la position actuelle en tête de liste, ou la met à jour là où elle se trouve. */
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
  // Date de la dernière tentative de chargement, par clé de lieu.
  const lastAttempts = useRef(new Map<string, number>())

  const cancelLoad = useCallback((key: string) => {
    controllers.current.get(key)?.abort()
    controllers.current.delete(key)
  }, [])

  const load = useCallback((location: WeatherLocation) => {
    const key = getLocationKey(location)
    controllers.current.get(key)?.abort()
    const controller = new AbortController()
    controllers.current.set(key, controller)
    lastAttempts.current.set(key, Date.now())

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

  // Dernier état connu, lisible depuis les écouteurs sans les réabonner à chaque rendu.
  const latest = useRef({ locations, activeIndex, entries })
  useEffect(() => {
    latest.current = { locations, activeIndex, entries }
  })

  // Actualisation automatique : au retour au premier plan, au retour du réseau, puis
  // régulièrement tant que l'application reste affichée.
  useEffect(() => {
    const refreshStale = (networkIsBack: boolean) => {
      if (document.visibilityState !== 'visible' || !navigator.onLine) return
      const state = latest.current

      for (let index = state.activeIndex - 1; index <= state.activeIndex + 1; index += 1) {
        const location = state.locations[index]
        if (!location) continue
        const key = getLocationKey(location)
        const entry = state.entries[key]
        if (!entry || entry.status === 'loading' || controllers.current.has(key)) continue

        const isStale = Date.now() - (lastAttempts.current.get(key) ?? 0) > STALE_AFTER_MS
        const needsNetwork = !entry.data || entry.data.isFromCache
        if (isStale || (networkIsBack && needsNetwork)) {
          markLoading(key)
          load(location)
        }
      }
    }

    const handleVisibilityChange = () => refreshStale(false)
    const handleOnline = () => refreshStale(true)
    const timer = window.setInterval(() => refreshStale(false), STALE_CHECK_INTERVAL_MS)

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('online', handleOnline)
    return () => {
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('online', handleOnline)
    }
  }, [load, markLoading])

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
        setCities((previous) => {
          const existing = previous.locations.findIndex((item) => item.isCurrentPosition)
          if (existing === -1) return { locations: [position, ...previous.locations], activeIndex: 0 }
          return {
            locations: previous.locations.map((item, index) => (index === existing ? position : item)),
            activeIndex: existing,
          }
        })
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
      lastAttempts.current.delete(key)
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

  const moveLocation = useCallback((from: number, to: number) => {
    setCities((previous) => {
      const count = previous.locations.length
      if (from === to || from < 0 || to < 0 || from >= count || to >= count) return previous

      const reordered = [...previous.locations]
      const [moved] = reordered.splice(from, 1)
      reordered.splice(to, 0, moved)

      // La ville affichée reste la même, même si sa place change.
      const activeKey = getLocationKey(previous.locations[previous.activeIndex])
      return {
        locations: reordered,
        activeIndex: reordered.findIndex((item) => getLocationKey(item) === activeKey),
      }
    })
  }, [])

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
    moveLocation,
    searchByName,
    locate,
    refresh,
    dismissNotice,
  }
}
