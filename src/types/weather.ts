/* -------------------------------------------------------------------------- */
/*  Réponses brutes de l'API Open-Meteo                                        */
/* -------------------------------------------------------------------------- */

export interface GeocodingResult {
  id: number
  name: string
  latitude: number
  longitude: number
  elevation?: number
  feature_code?: string
  country_code?: string
  country?: string
  country_id?: number
  admin1?: string
  admin2?: string
  admin3?: string
  admin4?: string
  admin1_id?: number
  admin2_id?: number
  admin3_id?: number
  admin4_id?: number
  timezone?: string
  population?: number
  postcodes?: string[]
}

export interface GeocodingResponse {
  results?: GeocodingResult[]
  generationtime_ms: number
}

export interface OpenMeteoErrorResponse {
  error: true
  reason: string
}

export interface ForecastCurrentUnits {
  time: string
  interval: string
  temperature_2m: string
  relative_humidity_2m: string
  apparent_temperature: string
  is_day: string
  precipitation: string
  weather_code: string
  pressure_msl: string
  wind_speed_10m: string
  wind_direction_10m: string
  wind_gusts_10m: string
}

export interface ForecastCurrent {
  /** Heure locale du lieu, format ISO sans décalage (ex. `2026-10-04T14:15`). */
  time: string
  interval: number
  temperature_2m: number
  relative_humidity_2m: number
  apparent_temperature: number
  /** 1 = jour, 0 = nuit. */
  is_day: 0 | 1
  precipitation: number
  weather_code: number
  pressure_msl: number
  wind_speed_10m: number
  wind_direction_10m: number
  wind_gusts_10m: number
}

export interface ForecastHourlyUnits {
  time: string
  temperature_2m: string
  weather_code: string
  precipitation_probability: string
  is_day: string
  uv_index: string
}

export interface ForecastHourly {
  time: string[]
  temperature_2m: number[]
  weather_code: number[]
  precipitation_probability: (number | null)[]
  is_day: (0 | 1)[]
  uv_index: (number | null)[]
}

export interface ForecastDailyUnits {
  time: string
  weather_code: string
  temperature_2m_max: string
  temperature_2m_min: string
  sunrise: string
  sunset: string
  uv_index_max: string
  precipitation_probability_max: string
}

export interface ForecastDaily {
  time: string[]
  weather_code: number[]
  temperature_2m_max: number[]
  temperature_2m_min: number[]
  sunrise: string[]
  sunset: string[]
  uv_index_max: (number | null)[]
  precipitation_probability_max: (number | null)[]
}

export interface ForecastResponse {
  latitude: number
  longitude: number
  generationtime_ms: number
  utc_offset_seconds: number
  timezone: string
  timezone_abbreviation: string
  elevation: number
  current_units: ForecastCurrentUnits
  current: ForecastCurrent
  hourly_units: ForecastHourlyUnits
  hourly: ForecastHourly
  daily_units: ForecastDailyUnits
  daily: ForecastDaily
}

/* -------------------------------------------------------------------------- */
/*  Structures internes de l'application                                       */
/* -------------------------------------------------------------------------- */

export interface WeatherLocation {
  name: string
  latitude: number
  longitude: number
  admin1?: string
  country?: string
  /** Vrai lorsque le lieu provient de la géolocalisation du navigateur. */
  isCurrentPosition?: boolean
}

export interface CurrentConditions {
  time: string
  temperature: number
  apparentTemperature: number
  humidity: number
  weatherCode: number
  isDay: boolean
  precipitation: number
  pressure: number
  windSpeed: number
  windDirection: number
  windGusts: number
  uvIndex: number | null
}

export interface HourlyForecastItem {
  time: string
  temperature: number
  weatherCode: number
  isDay: boolean
  precipitationProbability: number | null
}

export interface DailyForecastItem {
  date: string
  weatherCode: number
  temperatureMax: number
  temperatureMin: number
  sunrise: string
  sunset: string
  uvIndexMax: number | null
  precipitationProbabilityMax: number | null
}

export interface WeatherData {
  location: WeatherLocation
  timezone: string
  timezoneAbbreviation: string
  current: CurrentConditions
  hourly: HourlyForecastItem[]
  daily: DailyForecastItem[]
  /** Horodatage (ms) de la récupération des données. */
  fetchedAt: number
}

export type WeatherStatus = 'idle' | 'loading' | 'success' | 'error'

export interface WeatherState {
  status: WeatherStatus
  location: WeatherLocation | null
  data: WeatherData | null
  error: string | null
  /** Message d'information affiché dans l'état vide (ex. géolocalisation refusée). */
  notice: string | null
}

export type WeatherApiErrorCode = 'network' | 'http' | 'not_found' | 'invalid' | 'aborted'
