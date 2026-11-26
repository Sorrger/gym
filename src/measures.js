// Body measurements (circumferences, cm). One entry per day: date -> { v: { part: cm }, t } (t = when changed;
// a deleted day keeps { del: true, t } so the delete syncs). IndexedDB key `measures`, gist file gym-measures.json.
import { reactive, computed } from 'vue'
import { get, set } from './db'
import { canSync, readFile, writeFile, onConnected } from './sync'

const FILE = 'gym-measures.json'
// `up` = which way is progress for most people (waist/belly down, muscles up); null = neutral
export const PARTS = [
  { id: 'chest', name: 'Klatka', how: 'Pod pachami, przez sutki, na wydechu', up: true },
  { id: 'shoulders', name: 'Barki', how: 'Najszerzej, przez naramienne', up: true },
  { id: 'arm', name: 'Ramię', how: 'Napięty biceps, najgrubsze miejsce', up: true },
  { id: 'forearm', name: 'Przedramię', how: 'Najgrubsze miejsce, dłoń w pięść', up: true },
  { id: 'waist', name: 'Talia', how: 'Najwęższe miejsce nad pępkiem, na wydechu', up: false },
  { id: 'belly', name: 'Brzuch', how: 'Na wysokości pępka, na wydechu', up: false },
  { id: 'hips', name: 'Biodra', how: 'Najszerzej, przez pośladki', up: null },
  { id: 'thigh', name: 'Udo', how: 'Tuż pod pośladkiem, noga rozluźniona', up: true },
  { id: 'calf', name: 'Łydka', how: 'Najgrubsze miejsce, stojąc', up: true },
  { id: 'neck', name: 'Szyja', how: 'Pod krtanią', up: null }
]
export const PART = Object.fromEntries(PARTS.map(p => [p.id, p]))

export const mstate = reactive({ entries: {}, loaded: false, error: '' })

const ok = cm => typeof cm === 'number' && cm >= 10 && cm <= 250
const clean = v => Object.fromEntries(Object.entries(v || {}).filter(([k, cm]) => PART[k] && ok(cm)).map(([k, cm]) => [k, Math.round(cm * 10) / 10]))

// every logged day, oldest first: { date, v }
export const measures = computed(() => Object.entries(mstate.entries)
  .filter(([, e]) => e && !e.del && e.v && Object.keys(e.v).length).map(([date, e]) => ({ date, v: e.v }))
  .sort((a, b) => a.date.localeCompare(b.date)))

// per part: first, previous and last value (with dates) + all points for a sparkline
export const byPart = computed(() => {
  const out = {}
  for (const m of measures.value) for (const [k, cm] of Object.entries(m.v)) (out[k] ||= []).push({ date: m.date, cm })
  return Object.fromEntries(Object.entries(out).map(([k, pts]) => [k, {
    pts, first: pts[0], last: pts.at(-1), prev: pts.length > 1 ? pts.at(-2) : null, change: pts.at(-1).cm - pts[0].cm
  }]))
})

const save = () => set('measures', JSON.parse(JSON.stringify(mstate.entries))).catch(e => (mstate.error = e.message))
let pushT = 0
function schedulePush() { clearTimeout(pushT); pushT = setTimeout(push, 3000) }

// saves the whole day (parts left out are removed from that day); nothing left = the day is deleted
export function setMeasures(date, v) {
  const c = clean(v)
  mstate.entries[date] = Object.keys(c).length ? { v: c, t: Date.now() } : { del: true, t: Date.now() }
  save(); schedulePush()
}
export function delMeasures(date) { mstate.entries[date] = { del: true, t: Date.now() }; save(); schedulePush() }

function merge(remote) {
  let changed = 0
  for (const [date, e] of Object.entries(remote || {})) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !e || (!e.del && !e.v)) continue
    const l = mstate.entries[date]
    if (!l || (e.t || 0) > (l.t || 0)) { mstate.entries[date] = e.del ? { del: true, t: e.t } : { v: clean(e.v), t: e.t }; changed++ }
  }
  if (changed) save()
  return changed
}
export const measuresData = () => JSON.parse(JSON.stringify(mstate.entries))
// from a backup file (Kopia → Wczytaj z pliku)
export function importMeasures(remote) { const n = merge(remote); if (n) schedulePush(); return n }
export async function push() {
  if (!canSync()) return
  try {
    const remote = await readFile(FILE)
    merge(remote)
    await writeFile(FILE, mstate.entries)
    mstate.error = ''
  } catch (e) { mstate.error = e.message }
}
export async function pull() {
  if (!canSync()) return
  try {
    const remote = await readFile(FILE)
    merge(remote)
    if (Object.entries(mstate.entries).some(([d, e]) => !remote?.[d] || (e.t || 0) > (remote[d].t || 0))) await writeFile(FILE, mstate.entries)
  } catch (e) { mstate.error = e.message }
}

export async function initMeasures() {
  try { Object.assign(mstate.entries, (await get('measures')) || {}) } catch (e) { mstate.error = e.message }
  mstate.loaded = true
  onConnected(pull)
  setTimeout(pull, 3500)
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') setTimeout(pull, 3000) })
}

// "102,5" / "102.5" → 102.5; empty → null; nonsense → NaN
export function parseCm(s) {
  const t = String(s ?? '').trim().replace(',', '.')
  if (!t) return null
  const n = +t
  return ok(n) ? Math.round(n * 10) / 10 : NaN
}
