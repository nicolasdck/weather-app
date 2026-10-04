// Remplacé par un identifiant unique à chaque build (voir vite.config.ts).
const VERSION = '__BUILD_ID__'
const SHELL_CACHE = `meteo-shell-${VERSION}`
const ASSET_CACHE = `meteo-assets-${VERSION}`
const API_CACHE = `meteo-api-${VERSION}`
const CURRENT_CACHES = [SHELL_CACHE, ASSET_CACHE, API_CACHE]

const SHELL_URLS = [
  '/',
  '/manifest.webmanifest',
  '/favicon.png',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
]

const API_HOST = 'api.open-meteo.com'
const MAX_API_ENTRIES = 20

// Pas de skipWaiting ici : la nouvelle version attend que l'utilisateur clique sur « Recharger ».
self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(SHELL_CACHE).then((cache) => cache.addAll(SHELL_URLS)))
})

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((key) => !CURRENT_CACHES.includes(key)).map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  )
})

async function trimCache(cacheName, maxEntries) {
  const cache = await caches.open(cacheName)
  const keys = await cache.keys()
  await Promise.all(keys.slice(0, Math.max(0, keys.length - maxEntries)).map((key) => cache.delete(key)))
}

// Page : réseau d'abord, coquille en cache si hors ligne.
async function handleNavigation(request) {
  try {
    const response = await fetch(request)
    if (response.ok) {
      const cache = await caches.open(SHELL_CACHE)
      await cache.put('/', response.clone())
    }
    return response
  } catch {
    const cached = await caches.match('/')
    return cached ?? Response.error()
  }
}

// Prévisions : réseau d'abord, dernière réponse connue si hors ligne.
async function handleApi(request) {
  const cache = await caches.open(API_CACHE)
  try {
    const response = await fetch(request)
    if (response.ok) {
      await cache.put(request, response.clone())
      trimCache(API_CACHE, MAX_API_ENTRIES)
    }
    return response
  } catch (error) {
    const cached = await cache.match(request)
    if (cached) return cached
    throw error
  }
}

// Fichiers statiques : cache d'abord, rafraîchi en arrière-plan.
async function handleAsset(request) {
  const cached = await caches.match(request)
  const network = fetch(request)
    .then(async (response) => {
      if (response.ok) {
        const cache = await caches.open(ASSET_CACHE)
        await cache.put(request, response.clone())
      }
      return response
    })
    .catch(() => undefined)

  return cached ?? (await network) ?? Response.error()
}

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)

  if (request.mode === 'navigate') {
    event.respondWith(handleNavigation(request))
  } else if (url.hostname === API_HOST) {
    event.respondWith(handleApi(request))
  } else if (url.origin === self.location.origin) {
    event.respondWith(handleAsset(request))
  }
})
