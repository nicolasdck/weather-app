import {
  CloudDrizzle,
  CloudFog,
  CloudHail,
  CloudLightning,
  CloudMoon,
  CloudMoonRain,
  CloudRain,
  CloudRainWind,
  CloudSnow,
  CloudSun,
  CloudSunRain,
  Cloudy,
  HelpCircle,
  Moon,
  Snowflake,
  Sun,
  type LucideIcon,
} from 'lucide-react'

export interface WmoCodeInfo {
  /** Libellé français de la condition. */
  label: string
  /** Icône affichée de jour. */
  dayIcon: LucideIcon
  /** Icône affichée de nuit. */
  nightIcon: LucideIcon
}

function same(label: string, icon: LucideIcon): WmoCodeInfo {
  return { label, dayIcon: icon, nightIcon: icon }
}

/** Codes météo WMO renvoyés par Open-Meteo (https://open-meteo.com/en/docs). */
export const WMO_CODES: Record<number, WmoCodeInfo> = {
  0: { label: 'Ciel dégagé', dayIcon: Sun, nightIcon: Moon },
  1: { label: 'Plutôt dégagé', dayIcon: CloudSun, nightIcon: CloudMoon },
  2: { label: 'Partiellement nuageux', dayIcon: CloudSun, nightIcon: CloudMoon },
  3: same('Couvert', Cloudy),
  45: same('Brouillard', CloudFog),
  48: same('Brouillard givrant', CloudFog),
  51: same('Bruine légère', CloudDrizzle),
  53: same('Bruine modérée', CloudDrizzle),
  55: same('Bruine dense', CloudDrizzle),
  56: same('Bruine verglaçante légère', CloudHail),
  57: same('Bruine verglaçante dense', CloudHail),
  61: same('Pluie faible', CloudRain),
  63: same('Pluie modérée', CloudRain),
  65: same('Pluie forte', CloudRainWind),
  66: same('Pluie verglaçante légère', CloudHail),
  67: same('Pluie verglaçante forte', CloudHail),
  71: same('Neige faible', CloudSnow),
  73: same('Neige modérée', CloudSnow),
  75: same('Neige forte', CloudSnow),
  77: same('Neige en grains', Snowflake),
  80: { label: 'Averses légères', dayIcon: CloudSunRain, nightIcon: CloudMoonRain },
  81: { label: 'Averses modérées', dayIcon: CloudSunRain, nightIcon: CloudMoonRain },
  82: same('Averses violentes', CloudRainWind),
  85: same('Averses de neige légères', CloudSnow),
  86: same('Averses de neige fortes', CloudSnow),
  95: same('Orage', CloudLightning),
  96: same('Orage avec grêle légère', CloudLightning),
  99: same('Orage avec forte grêle', CloudLightning),
}

const UNKNOWN_CODE: WmoCodeInfo = same('Conditions inconnues', HelpCircle)

export function getWmoInfo(code: number): WmoCodeInfo {
  return WMO_CODES[code] ?? UNKNOWN_CODE
}

export function getWeatherLabel(code: number): string {
  return getWmoInfo(code).label
}

export function getWeatherIcon(code: number, isDay = true): LucideIcon {
  const info = getWmoInfo(code)
  return isDay ? info.dayIcon : info.nightIcon
}
