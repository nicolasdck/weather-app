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
  precipitation_sum: (number | null)[]
  wind_speed_10m_max: (number | null)[]
  wind_gusts_10m_max: (number | null)[]
  wind_direction_10m_dominant: (number | null)[]
}

/** Précipitations par quart d'heure (interpolées hors Europe centrale). */
export interface ForecastMinutely15 {
  time: string[]
  precipitation: (number | null)[]
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
  minutely_15_units?: Record<string, string>
  minutely_15?: ForecastMinutely15
}

export type PollenType = 'alder' | 'birch' | 'grass' | 'mugwort' | 'olive' | 'ragweed'

export interface AirQualityCurrent {
  time: string
  interval: number
  european_aqi: number | null
  pm10: number | null
  pm2_5: number | null
  nitrogen_dioxide: number | null
  ozone: number | null
  /** Pollens en grains/m³ ; `null` hors d'Europe. */
  alder_pollen: number | null
  birch_pollen: number | null
  grass_pollen: number | null
  mugwort_pollen: number | null
  olive_pollen: number | null
  ragweed_pollen: number | null
}

export interface AirQualityResponse {
  latitude: number
  longitude: number
  generationtime_ms: number
  utc_offset_seconds: number
  timezone: string
  timezone_abbreviation: string
  elevation: number
  current_units: Record<keyof AirQualityCurrent, string>
  current: AirQualityCurrent
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
  precipitationSum: number | null
  windSpeedMax: number | null
  windGustsMax: number | null
  windDirection: number | null
}

export interface PrecipitationSlot {
  /** Début du quart d'heure, heure locale du lieu. */
  time: string
  /** Cumul sur le quart d'heure, en mm. */
  precipitation: number
}

export interface PollenLevel {
  type: PollenType
  /** Concentration en grains/m³. */
  value: number
}

export interface AirQuality {
  /** Indice européen de qualité de l'air (0 = excellent, 100+ = très mauvais). */
  europeanAqi: number | null
  pm25: number | null
  pm10: number | null
  nitrogenDioxide: number | null
  ozone: number | null
  /** `null` lorsque les pollens ne sont pas couverts (hors Europe). */
  pollens: PollenLevel[] | null
}

export interface WeatherData {
  location: WeatherLocation
  timezone: string
  timezoneAbbreviation: string
  /** Décalage du lieu par rapport à UTC, en secondes. */
  utcOffsetSeconds: number
  current: CurrentConditions
  /** Les 24 prochaines heures, à partir de l'heure en cours. */
  hourly: HourlyForecastItem[]
  /** Toutes les heures des 7 jours, pour le détail d'une journée. */
  hourlyAll: HourlyForecastItem[]
  daily: DailyForecastItem[]
  /** Les 2 prochaines heures, par quart d'heure. */
  nextPrecipitation: PrecipitationSlot[]
  /** `null` si la qualité de l'air n'a pas pu être récupérée. */
  airQuality: AirQuality | null
  /** Horodatage (ms) de la récupération des données auprès d'Open-Meteo. */
  fetchedAt: number
  /** Vrai si les données viennent du cache hors ligne et non du réseau. */
  isFromCache: boolean
}

export type WeatherStatus = 'loading' | 'success' | 'error'

/** État de chargement de la météo d'une ville enregistrée. */
export interface WeatherEntry {
  status: WeatherStatus
  /** Conservé pendant une actualisation, pour ne pas vider l'écran. */
  data: WeatherData | null
  error: string | null
}

export type WeatherApiErrorCode = 'network' | 'http' | 'not_found' | 'invalid' | 'aborted'
