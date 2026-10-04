import { ChevronLeft, ChevronRight, Navigation } from 'lucide-react'
import { getLocationKey } from '../hooks/useCities'
import type { WeatherLocation } from '../types/weather'

interface CityPagerProps {
  locations: WeatherLocation[]
  activeIndex: number
  onSelect: (index: number) => void
}

const arrowClass =
  'grid size-7 place-items-center rounded-full text-white/70 transition hover:bg-white/15 hover:text-white disabled:pointer-events-none disabled:opacity-30'

/** Indicateur de page : un point par ville, plus des flèches pour la souris et le clavier. */
export function CityPager({ locations, activeIndex, onSelect }: CityPagerProps) {
  if (locations.length < 2) return null

  return (
    <nav aria-label="Villes enregistrées" className="flex items-center justify-center gap-1">
      <button
        type="button"
        onClick={() => onSelect(activeIndex - 1)}
        disabled={activeIndex === 0}
        aria-label="Ville précédente"
        className={arrowClass}
      >
        <ChevronLeft className="size-4" aria-hidden="true" />
      </button>

      <ul className="flex items-center gap-0.5">
        {locations.map((location, index) => {
          const isActive = index === activeIndex
          return (
            <li key={getLocationKey(location)}>
              <button
                type="button"
                onClick={() => onSelect(index)}
                aria-label={location.name}
                aria-current={isActive ? 'true' : undefined}
                title={location.name}
                className="grid h-7 min-w-5 place-items-center px-1"
              >
                {location.isCurrentPosition ? (
                  <Navigation
                    className={`size-3 transition ${
                      isActive ? 'fill-white text-white' : 'text-white/45'
                    }`}
                    aria-hidden="true"
                  />
                ) : (
                  <span
                    className={`block h-1.5 rounded-full transition-all ${
                      isActive ? 'w-4 bg-white' : 'w-1.5 bg-white/40'
                    }`}
                  />
                )}
              </button>
            </li>
          )
        })}
      </ul>

      <button
        type="button"
        onClick={() => onSelect(activeIndex + 1)}
        disabled={activeIndex === locations.length - 1}
        aria-label="Ville suivante"
        className={arrowClass}
      >
        <ChevronRight className="size-4" aria-hidden="true" />
      </button>
    </nav>
  )
}
