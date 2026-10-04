import type { WeatherLocation } from '../types/weather'

// Open-Meteo renvoie des heures locales au lieu (ISO sans décalage) : on les lit
// directement dans la chaîne pour ne pas les réinterpréter dans le fuseau du navigateur.

const WIND_DIRECTIONS = ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO']

const weekdayFormatter = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', timeZone: 'UTC' })
const dayMonthFormatter = new Intl.DateTimeFormat('fr-FR', {
  day: 'numeric',
  month: 'short',
  timeZone: 'UTC',
})

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1)
}

/** `2026-10-04T14:00` → `14 h` */
export function formatHour(isoLocal: string): string {
  return `${isoLocal.slice(11, 13)} h`
}

/** `2026-10-04T07:42` → `07:42` */
export function formatClock(isoLocal: string): string {
  return isoLocal.slice(11, 16)
}

/** Minutes écoulées depuis minuit pour une heure locale ISO. */
export function minutesOfDay(isoLocal: string): number {
  return Number(isoLocal.slice(11, 13)) * 60 + Number(isoLocal.slice(14, 16))
}

export function formatDuration(totalMinutes: number): string {
  const minutes = Math.max(0, Math.round(totalMinutes))
  return `${Math.floor(minutes / 60)} h ${String(minutes % 60).padStart(2, '0')}`
}

export function formatDayLabel(isoDate: string, index: number): string {
  if (index === 0) return "Aujourd'hui"
  if (index === 1) return 'Demain'
  return capitalize(weekdayFormatter.format(new Date(`${isoDate.slice(0, 10)}T00:00:00Z`)))
}

export function formatDayMonth(isoDate: string): string {
  return dayMonthFormatter.format(new Date(`${isoDate.slice(0, 10)}T00:00:00Z`))
}

export function windDirectionLabel(degrees: number): string {
  const index = Math.round((((degrees % 360) + 360) % 360) / 45) % 8
  return WIND_DIRECTIONS[index]
}

export function uvLabel(uv: number): string {
  if (uv < 3) return 'Faible'
  if (uv < 6) return 'Modéré'
  if (uv < 8) return 'Élevé'
  if (uv < 11) return 'Très élevé'
  return 'Extrême'
}

export function formatCoordinates(latitude: number, longitude: number): string {
  const lat = `${Math.abs(latitude).toFixed(2)}° ${latitude >= 0 ? 'N' : 'S'}`
  const lon = `${Math.abs(longitude).toFixed(2)}° ${longitude >= 0 ? 'E' : 'O'}`
  return `${lat}, ${lon}`
}

/** Région et pays d'un lieu, ou ses coordonnées s'il vient de la géolocalisation. */
export function formatLocationSubtitle(location: WeatherLocation): string {
  if (location.isCurrentPosition) {
    return formatCoordinates(location.latitude, location.longitude)
  }
  return [location.admin1, location.country]
    .filter((part): part is string => Boolean(part) && part !== location.name)
    .join(', ')
}

export function formatMillimeters(value: number): string {
  return `${value.toLocaleString('fr-FR', { maximumFractionDigits: 1 })} mm`
}

/** Écart en minutes entre deux heures locales ISO du même lieu. */
export function minutesBetween(fromIsoLocal: string, toIsoLocal: string): number {
  return Math.round((Date.parse(`${toIsoLocal}:00Z`) - Date.parse(`${fromIsoLocal}:00Z`)) / 60_000)
}
