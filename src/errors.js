// Local error log (no external service): the last 20 app errors are kept on the phone (localStorage `errs`)
// and listed in Settings ("Błędy apki"), so a bug can be copied and reported. Nothing is sent anywhere.
const KEY = 'errs'
export const readErrors = () => { try { return JSON.parse(localStorage.getItem(KEY) || '[]') } catch { return [] } }
export const clearErrors = () => { try { localStorage.removeItem(KEY) } catch {} }
export function log(msg) {
  msg = String(msg || '').slice(0, 300)
  if (!msg || /ionPageElement|ResizeObserver loop/.test(msg)) return // known harmless Ionic/browser noise
  const l = readErrors()
  l.unshift({ t: Date.now(), msg, at: location.hash })
  try { localStorage.setItem(KEY, JSON.stringify(l.slice(0, 20))) } catch {}
}
export function initErrors() {
  window.addEventListener('error', e => log(e.message || e.error))
  window.addEventListener('unhandledrejection', e => log(e.reason?.message || e.reason))
}
export const VERSION = typeof __BUILD__ !== 'undefined' ? __BUILD__ : 'dev'
