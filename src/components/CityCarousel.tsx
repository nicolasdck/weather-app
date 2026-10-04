import { Children, useEffect, useRef } from 'react'
import type { ReactNode } from 'react'

interface CityCarouselProps {
  activeIndex: number
  onActiveIndexChange: (index: number) => void
  /** Une page par ville, chacune en `w-full shrink-0 snap-center`. */
  children: ReactNode
}

/** Défilement horizontal natif aimanté : un balayage change de ville. */
export function CityCarousel({ activeIndex, onActiveIndexChange, children }: CityCarouselProps) {
  const scrollerRef = useRef<HTMLDivElement>(null)
  const isFirstSync = useRef(true)
  // Page visée par un défilement lancé par le code (points, ajout de ville).
  const programmaticTarget = useRef<number | null>(null)
  const pageCount = Children.count(children)

  // Aligne le défilement sur la ville active quand elle change autrement que par balayage.
  useEffect(() => {
    const scroller = scrollerRef.current
    if (!scroller || scroller.clientWidth === 0) return

    const behavior: ScrollBehavior = isFirstSync.current ? 'instant' : 'smooth'
    isFirstSync.current = false

    if (Math.round(scroller.scrollLeft / scroller.clientWidth) !== activeIndex) {
      programmaticTarget.current = activeIndex
      scroller.scrollTo({ left: activeIndex * scroller.clientWidth, behavior })
    }
  }, [activeIndex, pageCount])

  const handleScroll = () => {
    const scroller = scrollerRef.current
    if (!scroller || scroller.clientWidth === 0) return

    // Pendant un défilement programmé, les pages traversées ne deviennent pas actives.
    const target = programmaticTarget.current
    if (target !== null) {
      if (Math.abs(scroller.scrollLeft - target * scroller.clientWidth) < 2) {
        programmaticTarget.current = null
      }
      return
    }

    const index = Math.round(scroller.scrollLeft / scroller.clientWidth)
    if (index !== activeIndex) onActiveIndexChange(index)
  }

  // Si l'utilisateur reprend la main, son geste redevient la référence.
  const releaseProgrammaticScroll = () => {
    programmaticTarget.current = null
  }

  return (
    // `relative` : garde les libellés sr-only (absolus) dans la zone de défilement.
    <div
      ref={scrollerRef}
      onScroll={handleScroll}
      onPointerDown={releaseProgrammaticScroll}
      onTouchStart={releaseProgrammaticScroll}
      onWheel={releaseProgrammaticScroll}
      className="scrollbar-none relative flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain"
    >
      {children}
    </div>
  )
}
