// Service worker: keeps the whole app on the phone (offline) and reports download progress of updates.
import { precacheAndRoute, cleanupOutdatedCaches, createHandlerBoundToURL, addPlugins } from 'workbox-precaching'
import { NavigationRoute, registerRoute } from 'workbox-routing'
import { cacheNames } from 'workbox-core'

const manifest = self.__WB_MANIFEST
let done = 0, total = manifest.length
const post = async msg => (await self.clients.matchAll({ includeUncontrolled: true })).forEach(c => c.postMessage(msg))

// only changed files are downloaded: count those first, so the bar goes 0 -> 100 % evenly
self.addEventListener('install', e => e.waitUntil((async () => {
  try {
    const have = new Set((await (await caches.open(cacheNames.precache)).keys()).map(r => r.url))
    const key = m => { const u = new URL(m.url, self.registration.scope); if (m.revision) u.searchParams.set('__WB_REVISION__', m.revision); return u.href }
    total = Math.max(1, manifest.filter(m => !have.has(key(m))).length)
  } catch {}
})()))

// called for every file stored during install, so the page can show a progress bar
addPlugins([{ cacheDidUpdate: async () => { done++; post({ type: 'progress', done: Math.min(done, total), total }) } }])

precacheAndRoute(manifest)
cleanupOutdatedCaches()
registerRoute(new NavigationRoute(createHandlerBoundToURL('index.html')))

// no automatic skipWaiting: a new version must not replace files under a running page.
// The page asks for it at a safe moment (app start / coming back to the app).
self.addEventListener('message', e => { if (e.data?.type === 'SKIP_WAITING') self.skipWaiting() })
// one-time migration: the version installed before this updater existed never sends SKIP_WAITING,
// so the first update into this system activates by itself. A marker cache tells later versions apart.
const MARK = 'gym-updater-v1'
self.addEventListener('install', e => e.waitUntil(caches.has(MARK).then(has => { if (!has) self.skipWaiting() })))
self.addEventListener('activate', e => e.waitUntil(caches.open(MARK).then(() => self.clients.claim())))
