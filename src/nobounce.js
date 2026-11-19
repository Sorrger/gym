// iOS lets you drag (rubber-band) screens that have nothing to scroll, and full-screen overlays
// (dialog, timer, summary, update screen) drag the page behind them. Block a touch drag unless it
// starts inside something that can really scroll in that direction (lists, picker wheels, long pages).
// "Really" = more than 8 px of overflow: Ionic pages are often 1–3 px taller than the screen.
function canScroll(el, dx, dy) {
  if (!(el instanceof Element)) return false
  const cs = getComputedStyle(el)
  if (Math.abs(dy) >= Math.abs(dx)) return /(auto|scroll)/.test(cs.overflowY) && el.scrollHeight > el.clientHeight + 8
  return /(auto|scroll)/.test(cs.overflowX) && el.scrollWidth > el.clientWidth + 8
}
let sx = 0, sy = 0
document.addEventListener('touchstart', e => { sx = e.touches[0].clientX; sy = e.touches[0].clientY }, { passive: true })
document.addEventListener('touchmove', e => {
  if (e.touches.length > 1) return
  const dx = e.touches[0].clientX - sx, dy = e.touches[0].clientY - sy
  for (const el of e.composedPath()) {
    if (el === document.body) break
    if (el instanceof Element && el.matches('input, textarea, [data-free-touch]')) return
    if (canScroll(el, dx, dy)) return
  }
  if (e.cancelable) e.preventDefault()
}, { passive: false })
