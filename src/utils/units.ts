// Les données sont toujours stockées en °C et km/h ; la conversion n'a lieu qu'à l'affichage.

export type TemperatureUnit = 'celsius' | 'fahrenheit'
export type WindUnit = 'kmh' | 'ms' | 'kn' | 'mph'

export interface Units {
  temperature: TemperatureUnit
  wind: WindUnit
}

export const DEFAULT_UNITS: Units = { temperature: 'celsius', wind: 'kmh' }

export const TEMPERATURE_UNITS: { value: TemperatureUnit; label: string }[] = [
  { value: 'celsius', label: '°C' },
  { value: 'fahrenheit', label: '°F' },
]

export const WIND_UNITS: { value: WindUnit; label: string }[] = [
  { value: 'kmh', label: 'km/h' },
  { value: 'ms', label: 'm/s' },
  { value: 'kn', label: 'nœuds' },
  { value: 'mph', label: 'mph' },
]

const WIND_FACTORS: Record<WindUnit, number> = {
  kmh: 1,
  ms: 1 / 3.6,
  kn: 1 / 1.852,
  mph: 1 / 1.609344,
}

const WIND_SUFFIXES: Record<WindUnit, string> = {
  kmh: 'km/h',
  ms: 'm/s',
  kn: 'nd',
  mph: 'mph',
}

export function isTemperatureUnit(value: unknown): value is TemperatureUnit {
  return TEMPERATURE_UNITS.some((unit) => unit.value === value)
}

export function isWindUnit(value: unknown): value is WindUnit {
  return WIND_UNITS.some((unit) => unit.value === value)
}

export function convertTemperature(celsius: number, unit: TemperatureUnit): number {
  return unit === 'fahrenheit' ? celsius * 1.8 + 32 : celsius
}

/** Convertit un écart de température (sans le décalage de 32 °F). */
export function convertTemperatureDelta(celsius: number, unit: TemperatureUnit): number {
  return unit === 'fahrenheit' ? celsius * 1.8 : celsius
}

/** `23°` — arrondi à l'entier. */
export function formatTemperature(celsius: number, unit: TemperatureUnit): string {
  return `${Math.round(convertTemperature(celsius, unit))}°`
}

export function formatTemperatureDelta(celsius: number, unit: TemperatureUnit): string {
  return `${Math.round(convertTemperatureDelta(celsius, unit))}°`
}

/** Valeur seule, sans unité (une décimale en m/s, où les valeurs sont petites). */
export function formatWindValue(kmh: number, unit: WindUnit): string {
  const value = kmh * WIND_FACTORS[unit]
  return unit === 'ms'
    ? value.toLocaleString('fr-FR', { maximumFractionDigits: 1 })
    : String(Math.round(value))
}

/** `12 km/h` */
export function formatWind(kmh: number, unit: WindUnit): string {
  return `${formatWindValue(kmh, unit)} ${WIND_SUFFIXES[unit]}`
}
