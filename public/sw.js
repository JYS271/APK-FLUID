// ARK-FLUID PWA 서비스 워커 — 네트워크 우선 + 런타임 캐시(오프라인 대비)
const CACHE = 'arkfluid-v1'

self.addEventListener('install', () => self.skipWaiting())

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (e) => {
  const req = e.request
  if (req.method !== 'GET') return
  e.respondWith(
    fetch(req)
      .then((res) => {
        const clone = res.clone()
        caches.open(CACHE).then((c) => c.put(req, clone)).catch(() => {})
        return res
      })
      .catch(() => caches.match(req).then((r) => r || caches.match('./index.html')))
  )
})
