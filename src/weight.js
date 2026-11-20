// Body weight log. One entry per day: date -> { kg, t } (t = when changed; deleted days keep { del: true, t } so deletes sync).
// Stored on the phone (IndexedDB key `weights`) and, when the GitHub backup is connected, in the same secret gist (file gym-weights.json).
import { reactive, computed, watch } from 'vue'
import { get, set } from 'idb-keyval'
import { cloud, readGistFile, writeGistFile } from './cloud'
import { iso } from './store'

const FILE = 'gym-weights.json'
export const wstate = reactive({ entries: {}, loaded: false, syncing: false, error: '' })

export const weights = computed(() => Object.entries(wstate.entries)
  .filter(([, e]) => e && !e.del && e.kg > 0).map(([date, e]) => ({ date, kg: e.kg })).sort((a, b) => a.date.localeCompare(b.date)))

const save = () => set('weights', JSON.parse(JSON.stringify(wstate.entries))).catch(e => (wstate.error = e.message))
let pushT = 0
function schedulePush() { clearTimeout(pushT); pushT = setTimeout(push, 3000) }

export function setWeight(date, kg) { wstate.entries[date] = { kg: Math.round(kg * 10) / 10, t: Date.now() }; save(); schedulePush() }
export function delWeight(date) { wstate.entries[date] = { del: true, t: Date.now() }; save(); schedulePush() }

// "29.10 108; 31.10 108,0; 2.11 105.8" or one per line; year = this year (or last year if the date would be in the future)
export function parseList(text) {
  const out = []
  const now = new Date()
  for (const m of String(text).matchAll(/(\d{1,2})[.\-/](\d{1,2})(?:[.\-/](\d{2,4}))?\s*[:=\-–]?\s*(\d{2,3}(?:[.,]\d+)?)/g)) {
    let y = m[3] ? +m[3] : now.getFullYear()
    if (y < 100) y += 2000
    let d = new Date(y, +m[2] - 1, +m[1])
    if (!m[3] && d > now) d = new Date(y - 1, +m[2] - 1, +m[1])
    const kg = +m[4].replace(',', '.')
    if (kg >= 30 && kg <= 300 && !isNaN(d)) out.push({ date: iso(d), kg })
  }
  return out
}

function merge(remote) {
  let changed = false
  for (const [date, e] of Object.entries(remote || {})) {
    const l = wstate.entries[date]
    if (!l || (e?.t || 0) > (l.t || 0)) { wstate.entries[date] = e; changed = true }
  }
  if (changed) save()
  return changed
}
export async function push() {
  if (!cloud.token || !cloud.gistId || !navigator.onLine) return
  try {
    wstate.syncing = true
    const remote = await readGistFile(FILE)
    merge(remote)
    await writeGistFile(FILE, wstate.entries)
    wstate.error = ''
  } catch (e) { wstate.error = e.message } finally { wstate.syncing = false }
}
export async function pull() {
  if (!cloud.token || !cloud.gistId || !navigator.onLine) return
  try {
    const remote = await readGistFile(FILE)
    merge(remote)
    // anything newer here than in the gist goes up
    if (Object.entries(wstate.entries).some(([d, e]) => !remote?.[d] || (e.t || 0) > (remote[d].t || 0))) await writeGistFile(FILE, wstate.entries)
  } catch (e) { wstate.error = e.message }
}

export async function initWeights() {
  try { Object.assign(wstate.entries, (await get('weights')) || {}) } catch (e) { wstate.error = e.message }
  wstate.loaded = true
  watch(() => cloud.gistId, id => { if (id) pull() })
  setTimeout(pull, 3000)
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') setTimeout(pull, 2500) })
}

// ---- numbers for the screen ----
const day = s => new Date(s + 'T12:00').getTime()
// 7-day moving average for each logged day (average of entries in the 7 days up to that day)
export function smooth(list) {
  return list.map((p, i) => {
    const from = day(p.date) - 6 * 864e5
    const win = list.slice(0, i + 1).filter(q => day(q.date) >= from)
    return { ...p, avg: win.reduce((a, q) => a + q.kg, 0) / win.length }
  })
}
// trend in kg per week: least squares over the entries of the last `days` days
export function trend(list, days = 21) {
  const last = list.length ? day(list[list.length - 1].date) : 0
  const pts = list.filter(p => day(p.date) >= last - days * 864e5)
  if (pts.length < 3) return null
  const xs = pts.map(p => (day(p.date) - last) / 864e5), ys = pts.map(p => p.kg)
  const mx = xs.reduce((a, b) => a + b, 0) / xs.length, my = ys.reduce((a, b) => a + b, 0) / ys.length
  const den = xs.reduce((a, x) => a + (x - mx) ** 2, 0)
  if (!den) return null
  const slope = xs.reduce((a, x, i) => a + (x - mx) * (ys[i] - my), 0) / den
  return slope * 7
}
