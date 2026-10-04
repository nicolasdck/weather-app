import { useCallback, useEffect, useRef, useState } from 'react'
import { getCurrentCoordinates } from '../services/geolocation'
import { fetchWeather, geocodeCity, getErrorMessage, isAbortError } from '../services/weatherApi'
import type { WeatherLocation, WeatherState } from '../types/weather'

const STORAGE_KEY = 'meteo:last-location'

function readSavedLocation(): WeatherLocation | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<WeatherLocation>
    if (
      typeof parsed.name === 'string' &&
      typeof parsed.latitude === 'number' &&
      typeof parsed.longitude === 'number'
    ) {
      return parsed as WeatherLocation
    }
    return null
  } catch {
    return null
  }
}

function saveLocation(location: WeatherLocation): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(location))
  } catch {
    // Stockage indisponible (navigation privée, quota) : on continue sans mémoriser.
  }
}

export interface UseWeatherResult {
  state: WeatherState
  /** Charge la météo d'un lieu déjà géocodé (suggestion choisie). */
  selectLocation: (location: WeatherLocation) => void
  /** Géocode un nom de ville puis charge sa météo. */
  searchByName: (name: string) => void
  /** Charge la météo de la position actuelle du navigateur. */
  locate: () => void
  /** Recharge le lieu courant, ou relance la géolocalisation s'il n'y en a pas. */
  refresh: () => void
}

export function useWeather(): UseWeatherResult {
  const [state, setState] = useState<WeatherState>(() => ({
    status: 'loading',
    location: readSavedLocation(),
    data: null,
    error: null,
    notice: null,
  }))

  // Chaque nouvelle demande invalide les précédentes encore en cours.
  const requestId = useRef(0)
  const abortController = useRef<AbortController | null>(null)

  const beginRequest = useCallback(() => {
    abortController.current?.abort()
    const controller = new AbortController()
    abortController.current = controller
    requestId.current += 1
    return { id: requestId.current, signal: controller.signal }
  }, [])

  const loadWeather = useCallback(
    async (location: WeatherLocation) => {
      const { id, signal } = beginRequest()
      try {
        const data = await fetchWeather(location, signal)
        if (id !== requestId.current) return
        // La position actuelle n'est pas mémorisée : elle est redemandée à chaque visite.
        if (!location.isCurrentPosition) saveLocation(location)
        setState({ status: 'success', location, data, error: null, notice: null })
      } catch (error) {
        if (id !== requestId.current || isAbortError(error)) return
        setState((previous) => ({
          ...previous,
          status: 'error',
          location,
          error: getErrorMessage(error),
          notice: null,
        }))
      }
    },
    [beginRequest],
  )

  const loadCurrentPosition = useCallback(
    async (silent: boolean) => {
      const { id } = beginRequest()
      let location: WeatherLocation
      try {
        const coordinates = await getCurrentCoordinates()
        location = { name: 'Ma position', ...coordinates, isCurrentPosition: true }
      } catch (error) {
        if (id !== requestId.current) return
        const message = getErrorMessage(error)
        setState((previous) =>
          silent
            ? { status: 'idle', location: null, data: null, error: null, notice: message }
            : { ...previous, status: 'error', error: message, notice: null },
        )
        return
      }
      if (id !== requestId.current) return
      await loadWeather(location)
    },
    [beginRequest, loadWeather],
  )

  const setLoading = useCallback(() => {
    setState((previous) => ({ ...previous, status: 'loading', error: null, notice: null }))
  }, [])

  const selectLocation = useCallback(
    (location: WeatherLocation) => {
      setLoading()
      void loadWeather(location)
    },
    [loadWeather, setLoading],
  )

  const searchByName = useCallback(
    (name: string) => {
      const query = name.trim()
      if (!query) return
      setLoading()
      const { id, signal } = beginRequest()
      geocodeCity(query, signal)
        .then((location) => {
          if (id === requestId.current) return loadWeather(location)
        })
        .catch((error: unknown) => {
          if (id !== requestId.current || isAbortError(error)) return
          setState((previous) => ({
            ...previous,
            status: 'error',
            error: getErrorMessage(error),
            notice: null,
          }))
        })
    },
    [beginRequest, loadWeather, setLoading],
  )

  const locate = useCallback(() => {
    setLoading()
    void loadCurrentPosition(false)
  }, [loadCurrentPosition, setLoading])

  const currentLocation = state.location
  const refresh = useCallback(() => {
    if (!currentLocation || currentLocation.isCurrentPosition) locate()
    else selectLocation(currentLocation)
  }, [currentLocation, locate, selectLocation])

  // Premier accès : dernière ville consultée si elle existe, sinon géolocalisation.
  useEffect(() => {
    const saved = readSavedLocation()
    if (saved) void loadWeather(saved)
    else void loadCurrentPosition(true)

    return () => {
      requestId.current += 1
      abortController.current?.abort()
    }
  }, [loadWeather, loadCurrentPosition])

  return { state, selectLocation, searchByName, locate, refresh }
}
