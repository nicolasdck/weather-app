import { WeatherApiError } from './weatherApi'

const RAINVIEWER_URL = 'https://api.rainviewer.com/public/weather-maps.json'

/** Zoom maximal servi par RainViewer ; au-delà, la carte agrandit ces tuiles. */
export const RADAR_MAX_NATIVE_ZOOM = 7

interface RainViewerFrame {
  /** Horodatage Unix (secondes). */
  time: number
  path: string
}

interface RainViewerResponse {
  version: string
  generated: number
  host: string
  radar?: {
    past?: RainViewerFrame[]
    nowcast?: RainViewerFrame[]
  }
}

export interface RadarFrame {
  /** Horodatage (ms) de l'image radar. */
  time: number
  /** Gabarit d'URL de tuiles `{z}/{x}/{y}` pour une carte. */
  tileUrl: string
  /** Vrai pour une image de prévision plutôt qu'une observation. */
  isForecast: boolean
}

/** Images radar des dernières heures (RainViewer), de la plus ancienne à la plus récente. */
export async function fetchRadarFrames(signal?: AbortSignal): Promise<RadarFrame[]> {
  let response: Response
  try {
    response = await fetch(RAINVIEWER_URL, { signal })
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new WeatherApiError('aborted', 'Requête annulée.')
    }
    throw new WeatherApiError(
      'network',
      'Impossible de joindre le service radar. Vérifiez votre connexion internet.',
    )
  }
  if (!response.ok) {
    throw new WeatherApiError('http', 'Le service radar a renvoyé une erreur.', response.status)
  }

  const data = (await response.json()) as RainViewerResponse
  // 256 px, palette 2 (« Universal Blue »), lissage activé, neige distinguée.
  const toFrame = (frame: RainViewerFrame, isForecast: boolean): RadarFrame => ({
    time: frame.time * 1000,
    tileUrl: `${data.host}${frame.path}/256/{z}/{x}/{y}/2/1_1.png`,
    isForecast,
  })

  const frames = [
    ...(data.radar?.past ?? []).map((frame) => toFrame(frame, false)),
    ...(data.radar?.nowcast ?? []).map((frame) => toFrame(frame, true)),
  ]
  if (frames.length === 0) {
    throw new WeatherApiError('invalid', "Aucune image radar n'est disponible pour le moment.")
  }
  return frames
}
