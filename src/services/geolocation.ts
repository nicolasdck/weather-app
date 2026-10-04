export interface Coordinates {
  latitude: number
  longitude: number
}

function describeGeolocationError(error: GeolocationPositionError): string {
  switch (error.code) {
    case error.PERMISSION_DENIED:
      return "L'accès à votre position a été refusé."
    case error.POSITION_UNAVAILABLE:
      return 'Votre position est actuellement indisponible.'
    case error.TIMEOUT:
      return 'La localisation a pris trop de temps.'
    default:
      return 'Impossible de déterminer votre position.'
  }
}

export function getCurrentCoordinates(): Promise<Coordinates> {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) {
      reject(new Error("La géolocalisation n'est pas prise en charge par ce navigateur."))
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) =>
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        }),
      (error) => reject(new Error(describeGeolocationError(error))),
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 10 * 60 * 1000 },
    )
  })
}
