// ARK-FLUID PWA 서비스 워커 — 네트워크 우선 + 런타임 캐시(오프라인 대비)
// HTML(내비게이션)은 항상 no-store로 최신본을 받아, 배포 직후 옛 캐시가 깨진 화면을 보여주는 문제를 방지.
const CACHE = 'arkfluid-v2'

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
  const isNav = req.mode === 'navigate' || req.destination === 'document'
  // 문서 요청은 캐시 무시(항상 최신 HTML), 그 외는 일반 네트워크 우선
  const fetchReq = isNav ? new Request(req.url, { cache: 'no-store' }) : req
  e.respondWith(
    fetch(fetchReq)
      .then((res) => {
        const clone = res.clone()
        caches.open(CACHE).then((c) => c.put(req, clone)).catch(() => {})
        return res
      })
      .catch(() => caches.match(req).then((r) => r || caches.match('./index.html')))
  )
})
