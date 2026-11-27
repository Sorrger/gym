// Body weight log. One entry per day: date -> { kg, t } (t = when changed; deleted days keep { del: true, t } so deletes sync).
// Stored on the phone (IndexedDB key `weights`) and, when the GitHub backup is connected, in the same secret gist (file gym-weights.json).
import { reactive, computed } from 'vue'
import { get, set } from './db'
import { canSync, readFile, writeFile, onConnected } from './sync'
import { iso } from './store'
import { toU, fromU, isLb } from './units'

const FILE = 'gym-weights.json'
export const wstate = reactive({ entries: {}, loaded: false, syncing: false, error: '' })

export const weights = computed(() => Object.entries(wstate.entries)
  .filter(([, e]) => e && !e.del && +e.kg > 0).map(([date, e]) => ({ date, kg: +e.kg })).sort((a, b) => a.date.localeCompare(b.date)))
// the same list in the shown unit (`kg` then holds lb when the user picked lb) – screens use this one
export const weightsU = computed(() => weights.value.map(p => ({ date: p.date, kg: toU(p.kg) })))

const save = () => set('weights', JSON.parse(JSON.stringify(wstate.entries))).catch(e => (wstate.error = e.message))
let pushT = 0
function schedulePush() { clearTimeout(pushT); pushT = setTimeout(push, 3000) }

export function setWeight(date, kg) { wstate.entries[date] = { kg: Math.round(kg * 100) / 100, t: Date.now() }; save(); schedulePush() }
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
    const v = +m[4].replace(',', '.'), lo = isLb() ? 66 : 30, hi = isLb() ? 660 : 300 // typed in the shown unit
    if (v >= lo && v <= hi && !isNaN(d.getTime())) out.push({ date: iso(d), kg: fromU(v) })
  }
  return out
}

function merge(remote) {
  let changed = 0
  for (const [date, e] of Object.entries(remote || {})) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !e || (!e.del && !(e.kg > 0))) continue
    const l = wstate.entries[date]
    if (!l || (e.t || 0) > (l.t || 0)) { wstate.entries[date] = e; changed++ }
  }
  if (changed) save()
  return changed
}
// from a backup file (Kopia → Wczytaj z pliku)
export function importWeights(remote) { const n = merge(remote); if (n) schedulePush(); return n }
export async function push() {
  if (!canSync()) return
  try {
    wstate.syncing = true
    const remote = await readFile(FILE)
    merge(remote)
    await writeFile(FILE, wstate.entries)
    wstate.error = ''
  } catch (e) { wstate.error = e.message } finally { wstate.syncing = false }
}
export async function pull() {
  if (!canSync()) return
  try {
    const remote = await readFile(FILE)
    merge(remote)
    // anything newer here than in the gist goes up
    if (Object.entries(wstate.entries).some(([d, e]) => !remote?.[d] || (e.t || 0) > (remote[d].t || 0))) await writeFile(FILE, wstate.entries)
  } catch (e) { wstate.error = e.message }
}

export async function initWeights() {
  try { Object.assign(wstate.entries, (await get('weights')) || {}) } catch (e) { wstate.error = e.message }
  wstate.loaded = true
  onConnected(pull)
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
// Pace over the last `days` days from AVERAGES of weigh-ins: the average of the last half of the window against the
// average of the first half, divided by the days between them (each half needs 2 weigh-ins). Without that, a line
// through the points (Theil–Sen: median of pair slopes, robust to one odd weigh-in). level = the weight that line
// gives for the last day; lo/hi = pace ± its standard error (about 2 in 3 chance the real pace is inside).
// Needs 4 weigh-ins spread over at least a week.
export function pace(list, days = 28) {
  if (!list.length) return null
  const last = day(list[list.length - 1].date)
  const pts = list.filter(p => day(p.date) >= last - days * 864e5).map(p => ({ x: (day(p.date) - last) / 864e5, y: p.kg }))
  if (pts.length < 4 || -pts[0].x < 7) return null
  const mean = (a, k) => a.reduce((q, p) => q + p[k], 0) / a.length
  const cut = pts[0].x / 2, A = pts.filter(p => p.x < cut), B = pts.filter(p => p.x >= cut)
  let b, a, how
  if (A.length >= 2 && B.length >= 2 && mean(B, 'x') - mean(A, 'x') >= 5) {
    b = (mean(B, 'y') - mean(A, 'y')) / (mean(B, 'x') - mean(A, 'x')); a = mean(B, 'y') - b * mean(B, 'x'); how = 'avg'
  } else {
    const sl = []
    for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) if (pts[j].x - pts[i].x >= 1) sl.push((pts[j].y - pts[i].y) / (pts[j].x - pts[i].x))
    const med = v => { const s2 = [...v].sort((u, w) => u - w), m = s2.length >> 1; return s2.length % 2 ? s2[m] : (s2[m - 1] + s2[m]) / 2 }
    b = med(sl); a = med(pts.map(p => p.y - b * p.x)); how = 'line'
  }
  const mx = mean(pts, 'x'), sxx = pts.reduce((q, p) => q + (p.x - mx) ** 2, 0)
  const se = Math.sqrt(pts.reduce((q, p) => q + (p.y - (a + b * p.x)) ** 2, 0) / Math.max(1, pts.length - 2) / sxx)
  return { kg: b * 7, lo: (b - se) * 7, hi: (b + se) * 7, level: a, n: pts.length, span: Math.round(-pts[0].x), from: pts[0].x, pct: (b * 7) / a * 100, how }
}
// pace for today: null when the last weigh-in is over `fresh` days old (an old pace would pass for the current one);
// `level` moves along the line to today, `level0` = at the last weigh-in, `ago` = days since it
export function paceToday(list, now = Date.now(), fresh = 14) {
  const p = pace(list)
  if (!p) return null
  const ago = Math.max(0, Math.round((day(iso(new Date(now))) - day(list[list.length - 1].date)) / 864e5))
  return ago > fresh ? null : { ...p, ago, level0: p.level, level: p.level + p.kg / 7 * ago }
}
// days since the last weigh-in (null without any)
export const daysSince = (list, now = Date.now()) => (list.length ? Math.round((day(iso(new Date(now))) - day(list[list.length - 1].date)) / 864e5) : null)
// kg per week (see pace) – null until there is enough data
export function trend(list, days = 28) { return pace(list, days)?.kg ?? null }
// ~7700 kcal per kg of body fat: what a weekly change means per day (a rough estimate, water moves the scale too)
export const kcalPerDay = kgWeek => Math.round(kgWeek * 7700 / 7 / 10) * 10
