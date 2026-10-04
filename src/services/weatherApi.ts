import type {
  ForecastResponse,
  GeocodingResponse,
  GeocodingResult,
  OpenMeteoErrorResponse,
  WeatherApiErrorCode,
  WeatherData,
  WeatherLocation,
} from '../types/weather'

const GEOCODING_URL = 'https://geocoding-api.open-meteo.com/v1/search'
const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast'

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

async function fetchJson<T>(url: string, signal?: AbortSignal): Promise<T> {
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

  return body as T
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
  const data = await fetchJson<GeocodingResponse>(`${GEOCODING_URL}?${params}`, signal)
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

function normalizeForecast(location: WeatherLocation, response: ForecastResponse): WeatherData {
  const { current, hourly, daily } = response

  return {
    location,
    timezone: response.timezone,
    timezoneAbbreviation: response.timezone_abbreviation,
    fetchedAt: Date.now(),
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
      // La première heure renvoyée correspond à l'heure en cours.
      uvIndex: hourly.uv_index?.[0] ?? daily.uv_index_max?.[0] ?? null,
    },
    hourly: hourly.time.map((time, index) => ({
      time,
      temperature: hourly.temperature_2m[index],
      weatherCode: hourly.weather_code[index],
      isDay: hourly.is_day[index] === 1,
      precipitationProbability: hourly.precipitation_probability?.[index] ?? null,
    })),
    daily: daily.time.map((date, index) => ({
      date,
      weatherCode: daily.weather_code[index],
      temperatureMax: daily.temperature_2m_max[index],
      temperatureMin: daily.temperature_2m_min[index],
      sunrise: daily.sunrise[index],
      sunset: daily.sunset[index],
      uvIndexMax: daily.uv_index_max?.[index] ?? null,
      precipitationProbabilityMax: daily.precipitation_probability_max?.[index] ?? null,
    })),
  }
}

/** Météo actuelle + prévisions 24 h et 7 jours pour un lieu donné. */
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
    timezone: 'auto',
    forecast_days: '7',
    forecast_hours: '24',
    wind_speed_unit: 'kmh',
  })

  const response = await fetchJson<ForecastResponse>(`${FORECAST_URL}?${params}`, signal)
  if (!isForecastResponse(response)) {
    throw new WeatherApiError('invalid', 'Les données météo reçues sont incomplètes.')
  }
  return normalizeForecast(location, response)
}
