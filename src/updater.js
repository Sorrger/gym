// Updates: at app start and whenever the app comes back to the foreground, check GitHub Pages for a new version.
// If there is one, show a full-screen "Aktualizacja" with a progress bar, then reload into the new version.
// Workout data is saved before reloading (store writes on every change), so nothing is lost.

let overlay = null, bar = null, label = null, showing = false

function show() {
  if (showing) return
  showing = true
  overlay = document.createElement('div')
  overlay.id = 'upd'
  overlay.innerHTML = `
    <div class="upd-box">
      <div class="upd-ring">
        <svg viewBox="0 0 100 100" aria-hidden="true"><circle class="bg" cx="50" cy="50" r="44"/><circle class="fg" cx="50" cy="50" r="44"/></svg>
        <span class="upd-pct">0%</span>
      </div>
      <b>Aktualizacja</b>
      <span class="upd-lbl">Pobieranie nowej wersji…</span>
    </div>`
  document.body.appendChild(overlay)
  bar = overlay.querySelector('.upd-ring .fg')
  label = overlay.querySelector('.upd-lbl')
  requestAnimationFrame(() => overlay.classList.add('on'))
}
function setProgress(p, text) {
  if (!showing) show()
  p = Math.max(3, Math.min(100, p))
  bar.style.strokeDashoffset = String(276.5 * (1 - p / 100)) // circumference of r=44
  overlay.querySelector('.upd-pct').textContent = Math.round(p) + '%'
  if (text) label.textContent = text
}
function hide() { if (!overlay) return; overlay.remove(); overlay = null; showing = false }

export function initUpdater() {
  if (!('serviceWorker' in navigator)) return
  let reloading = false
  const hadController = !!navigator.serviceWorker.controller // false on the very first install: nothing to update

  navigator.serviceWorker.addEventListener('message', e => {
    if (e.data?.type === 'progress' && hadController && showing) {
      setProgress(e.data.done / e.data.total * 90)
    }
  })
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (reloading || !hadController) return
    reloading = true
    setProgress(100, 'Gotowe, uruchamiam…')
    setTimeout(() => location.reload(), 250)
  })

  const activate = reg => {
    if (!reg.waiting) return
    setProgress(95, 'Instalowanie…')
    reg.waiting.postMessage({ type: 'SKIP_WAITING' })
  }
  const watchInstall = (reg, sw) => {
    if (!hadController) return
    setProgress(4)
    // no progress for a long time (signal lost mid-download): give up quietly, try again next time
    let last = Date.now()
    const onMsg = e => { if (e.data?.type === 'progress') last = Date.now() }
    navigator.serviceWorker.addEventListener('message', onMsg)
    const stall = setInterval(() => { if (!showing || Date.now() - last > 20000) { clearInterval(stall); navigator.serviceWorker.removeEventListener('message', onMsg); if (!reloading) hide() } }, 2000)
    sw.addEventListener('statechange', () => {
      if (sw.state === 'installed') activate(reg)
      if (sw.state === 'redundant') hide() // download failed (lost signal): keep using the current version
    })
  }

  navigator.serviceWorker.register('./sw.js', { scope: './' }).then(reg => {
    // a version downloaded earlier is waiting: switch now, at start, before the user does anything
    if (reg.waiting && hadController) activate(reg)
    else if (reg.installing) watchInstall(reg, reg.installing)
    reg.addEventListener('updatefound', () => watchInstall(reg, reg.installing))

    const check = () => { if (navigator.onLine && !showing) reg.update().catch(() => {}) }
    check()
    // iOS keeps the app in memory, so "opening it again" is usually just coming back to the foreground
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState !== 'visible') return
      if (reg.waiting && hadController) activate(reg)
      else check()
    })
  }).catch(() => {})
}
