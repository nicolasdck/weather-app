import type {
  AirQuality,
  AirQualityResponse,
  ForecastResponse,
  GeocodingResponse,
  GeocodingResult,
  OpenMeteoErrorResponse,
  PollenType,
  WeatherApiErrorCode,
  WeatherData,
  WeatherLocation,
} from '../types/weather'

const GEOCODING_URL = 'https://geocoding-api.open-meteo.com/v1/search'
const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast'
const AIR_QUALITY_URL = 'https://air-quality-api.open-meteo.com/v1/air-quality'

/** En-tête posé par le service worker sur les réponses servies depuis le cache hors ligne. */
const CACHED_AT_HEADER = 'x-meteo-cached-at'

const HOURS_SHOWN = 24

const CURRENT_VARIABLES = [
  'temperature_2m',
  'relative_humidity_2m',
  'apparent_temperature',
  'is_day',
  'precipitation',
  'weather_code',
  'pressure_msl',
  'wind_speed_10m',
  'wind_direction_10m',
  'wind_gusts_10m',
]

const HOURLY_VARIABLES = [
  'temperature_2m',
  'weather_code',
  'precipitation_probability',
  'is_day',
  'uv_index',
]

const DAILY_VARIABLES = [
  'weather_code',
  'temperature_2m_max',
  'temperature_2m_min',
  'sunrise',
  'sunset',
  'uv_index_max',
  'precipitation_probability_max',
  'precipitation_sum',
  'wind_speed_10m_max',
  'wind_gusts_10m_max',
  'wind_direction_10m_dominant',
]

const POLLEN_TYPES: PollenType[] = ['alder', 'birch', 'grass', 'mugwort', 'olive', 'ragweed']

const AIR_QUALITY_VARIABLES = [
  'european_aqi',
  'pm10',
  'pm2_5',
  'nitrogen_dioxide',
  'ozone',
  ...POLLEN_TYPES.map((type) => `${type}_pollen`),
]

export class WeatherApiError extends Error {
  readonly code: WeatherApiErrorCode
  readonly status: number | null

  constructor(code: WeatherApiErrorCode, message: string, status: number | null = null) {
    super(message)
    this.name = 'WeatherApiError'
    this.code = code
    this.status = status
  }
}

export function isAbortError(error: unknown): boolean {
  return (
    (error instanceof WeatherApiError && error.code === 'aborted') ||
    (error instanceof DOMException && error.name === 'AbortError')
  )
}

/** Convertit n'importe quelle erreur en message lisible par l'utilisateur. */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message
  return 'Une erreur inattendue est survenue.'
}

function isOpenMeteoError(body: unknown): body is OpenMeteoErrorResponse {
  return (
    typeof body === 'object' &&
    body !== null &&
    (body as { error?: unknown }).error === true &&
    typeof (body as { reason?: unknown }).reason === 'string'
  )
}

interface JsonResult<T> {
  data: T
  /** Horodatage (ms) de mise en cache si la réponse vient du cache hors ligne, sinon `null`. */
  cachedAt: number | null
}

async function fetchJson<T>(url: string, signal?: AbortSignal): Promise<JsonResult<T>> {
  let response: Response
  try {
    response = await fetch(url, { signal, headers: { Accept: 'application/json' } })
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new WeatherApiError('aborted', 'Requête annulée.')
    }
    throw new WeatherApiError(
      'network',
      'Impossible de joindre le service météo. Vérifiez votre connexion internet.',
    )
  }

  let body: unknown
  try {
    body = await response.json()
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new WeatherApiError('aborted', 'Requête annulée.')
    }
    throw new WeatherApiError(
      'invalid',
      'Le service météo a renvoyé une réponse illisible.',
      response.status,
    )
  }

  if (!response.ok || isOpenMeteoError(body)) {
    const reason = isOpenMeteoError(body) ? ` (${body.reason})` : ''
    throw new WeatherApiError(
      'http',
      `Le service météo a renvoyé une erreur${reason}.`,
      response.status,
    )
  }

  const cachedAt = Number(response.headers.get(CACHED_AT_HEADER))
  return { data: body as T, cachedAt: cachedAt > 0 ? cachedAt : null }
}

export function toWeatherLocation(result: GeocodingResult): WeatherLocation {
  return {
    name: result.name,
    latitude: result.latitude,
    longitude: result.longitude,
    admin1: result.admin1,
    country: result.country,
  }
}

/** Suggestions de villes pour l'autocomplétion (tableau vide si aucun résultat). */
export async function searchCities(
  query: string,
  signal?: AbortSignal,
  count = 6,
): Promise<GeocodingResult[]> {
  const name = query.trim()
  if (name.length < 2) return []

  const params = new URLSearchParams({
    name,
    count: String(count),
    language: 'fr',
    format: 'json',
  })
  const { data } = await fetchJson<GeocodingResponse>(`${GEOCODING_URL}?${params}`, signal)
  return data.results ?? []
}

/** Résout un nom de ville en lieu ; lève une erreur `not_found` si rien ne correspond. */
export async function geocodeCity(query: string, signal?: AbortSignal): Promise<WeatherLocation> {
  const results = await searchCities(query, signal, 1)
  if (results.length === 0) {
    throw new WeatherApiError('not_found', `Aucune ville trouvée pour « ${query.trim()} ».`)
  }
  return toWeatherLocation(results[0])
}

function isForecastResponse(body: ForecastResponse): boolean {
  return (
    typeof body.current === 'object' &&
    body.current !== null &&
    Array.isArray(body.hourly?.time) &&
    Array.isArray(body.daily?.time)
  )
}

function normalizeAirQuality(response: AirQualityResponse): AirQuality | null {
  const current = response.current
  if (typeof current !== 'object' || current === null) return null

  const pollens = POLLEN_TYPES.flatMap((type) => {
    const value = current[`${type}_pollen`]
    return typeof value === 'number' ? [{ type, value }] : []
  })

  return {
    europeanAqi: current.european_aqi ?? null,
    pm25: current.pm2_5 ?? null,
    pm10: current.pm10 ?? null,
    nitrogenDioxide: current.nitrogen_dioxide ?? null,
    ozone: current.ozone ?? null,
    pollens: pollens.length > 0 ? pollens : null,
  }
}

async function fetchAirQuality(
  location: WeatherLocation,
  signal?: AbortSignal,
): Promise<AirQuality | null> {
  const params = new URLSearchParams({
    latitude: location.latitude.toFixed(4),
    longitude: location.longitude.toFixed(4),
    current: AIR_QUALITY_VARIABLES.join(','),
    timezone: 'auto',
  })
  const { data } = await fetchJson<AirQualityResponse>(`${AIR_QUALITY_URL}?${params}`, signal)
  return normalizeAirQuality(data)
}

function normalizeForecast(
  location: WeatherLocation,
  response: ForecastResponse,
  airQuality: AirQuality | null,
  cachedAt: number | null,
): WeatherData {
  const { current, hourly, daily } = response
  const minutely = response.minutely_15

  const hourlyAll = hourly.time.map((time, index) => ({
    time,
    temperature: hourly.temperature_2m[index],
    weatherCode: hourly.weather_code[index],
    isDay: hourly.is_day[index] === 1,
    precipitationProbability: hourly.precipitation_probability?.[index] ?? null,
  }))

  // Les heures renvoyées commencent à minuit : on repère l'heure en cours (les heures
  // locales ISO se comparent comme des chaînes).
  const currentHour = current.time.slice(0, 13)
  const firstFound = hourly.time.findIndex((time) => time.slice(0, 13) >= currentHour)
  const first = firstFound === -1 ? hourly.time.length : firstFound

  return {
    location,
    timezone: response.timezone,
    timezoneAbbreviation: response.timezone_abbreviation,
    fetchedAt: cachedAt ?? Date.now(),
    isFromCache: cachedAt !== null,
    current: {
      time: current.time,
      temperature: current.temperature_2m,
      apparentTemperature: current.apparent_temperature,
      humidity: current.relative_humidity_2m,
      weatherCode: current.weather_code,
      isDay: current.is_day === 1,
      precipitation: current.precipitation,
      pressure: current.pressure_msl,
      windSpeed: current.wind_speed_10m,
      windDirection: current.wind_direction_10m,
      windGusts: current.wind_gusts_10m,
      uvIndex: hourly.uv_index?.[first] ?? daily.uv_index_max?.[0] ?? null,
    },
    hourly: hourlyAll.slice(first, first + HOURS_SHOWN),
    hourlyAll,
    daily: daily.time.map((date, index) => ({
      date,
      weatherCode: daily.weather_code[index],
      temperatureMax: daily.temperature_2m_max[index],
      temperatureMin: daily.temperature_2m_min[index],
      sunrise: daily.sunrise[index],
      sunset: daily.sunset[index],
      uvIndexMax: daily.uv_index_max?.[index] ?? null,
      precipitationProbabilityMax: daily.precipitation_probability_max?.[index] ?? null,
      precipitationSum: daily.precipitation_sum?.[index] ?? null,
      windSpeedMax: daily.wind_speed_10m_max?.[index] ?? null,
      windGustsMax: daily.wind_gusts_10m_max?.[index] ?? null,
      windDirection: daily.wind_direction_10m_dominant?.[index] ?? null,
    })),
    nextPrecipitation: (minutely?.time ?? []).map((time, index) => ({
      time,
      precipitation: minutely?.precipitation[index] ?? 0,
    })),
    airQuality,
  }
}

/** Météo actuelle, prévisions sur 7 jours, pluie dans les 2 heures et qualité de l'air. */
export async function fetchWeather(
  location: WeatherLocation,
  signal?: AbortSignal,
): Promise<WeatherData> {
  const params = new URLSearchParams({
    latitude: location.latitude.toFixed(4),
    longitude: location.longitude.toFixed(4),
    current: CURRENT_VARIABLES.join(','),
    hourly: HOURLY_VARIABLES.join(','),
    daily: DAILY_VARIABLES.join(','),
    minutely_15: 'precipitation',
    forecast_minutely_15: '8',
    timezone: 'auto',
    forecast_days: '7',
    wind_speed_unit: 'kmh',
  })

  const [forecast, airQuality] = await Promise.all([
    fetchJson<ForecastResponse>(`${FORECAST_URL}?${params}`, signal),
    // La qualité de l'air est un complément : son échec ne doit pas masquer la météo.
    fetchAirQuality(location, signal).catch((error: unknown) => {
      if (isAbortError(error)) throw error
      return null
    }),
  ])

  if (!isForecastResponse(forecast.data)) {
    throw new WeatherApiError('invalid', 'Les données météo reçues sont incomplètes.')
  }
  return normalizeForecast(location, forecast.data, airQuality, forecast.cachedAt)
}
