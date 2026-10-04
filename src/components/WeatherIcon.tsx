import { createElement } from 'react'
import type { LucideProps } from 'lucide-react'
import { getWeatherIcon } from '../utils/wmoCodes'

interface WeatherIconProps extends LucideProps {
  code: number
  isDay?: boolean
}

/** Icône Lucide correspondant à un code météo WMO. */
export function WeatherIcon({ code, isDay = true, ...props }: WeatherIconProps) {
  return createElement(getWeatherIcon(code, isDay), { 'aria-hidden': true, ...props })
}
