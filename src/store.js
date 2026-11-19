import { reactive, watch } from 'vue'
import { get, set } from 'idb-keyval'
import { PLAN, entriesOf } from './plan'

export const iso = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')
export const fmtDate = s => { const [y, m, d] = s.split('-'); return `${d}.${m}.${y}` }
export const fmtShort = s => { const [, m, d] = s.split('-'); return `${d}.${m}` }
export const fmtKg = w => (w == null ? '–' : String(+(+w).toFixed(2)).replace('.', ','))
export function ago(date) {
  const days = Math.round((new Date(iso(new Date()) + 'T12:00:00') - new Date(date + 'T12:00:00')) / 864e5)
  if (days <= 0) return 'dzisiaj'
  if (days === 1) return 'wczoraj'
  return days + ' dni temu'
}

// sessions: id -> { id, date, day, ex: { name: [{ w, d }] }, started, finished, updated }
export const state = reactive({ sessions: {}, ready: false, flash: '', loadError: false })
export const ui = reactive({ progressDay: 0 })

export async function load() {
  // if storage can't be read, do NOT continue with an empty list: the first save would wipe the real data
  for (let k = 0; k < 3; k++) {
    try { const s = await get('sessions'); if (s) state.sessions = s; state.loadError = false; break }
    catch (e) { console.warn(e); state.loadError = true; await new Promise(r => setTimeout(r, 300)) }
  }
  // older versions keyed sessions by "date_day" and had no id/started/finished
  Object.entries(state.sessions).forEach(([k, s]) => {
    if (k.includes('~draft')) { delete state.sessions[k]; return }
    s.id = k
    if (!s.started) s.started = new Date(s.date + 'T12:00:00').getTime()
    if (s.finished == null) s.finished = s.date < iso(new Date())
  })
  closeStale()
  state.ready = true
  if (navigator.storage?.persist) navigator.storage.persist().catch(() => {})
}

let t = null
function saveNow() { clearTimeout(t); t = null; if (state.loadError) return Promise.resolve(); return set('sessions', JSON.parse(JSON.stringify(state.sessions))).catch(console.warn) }
watch(() => state.sessions, () => { if (state.ready) { clearTimeout(t); t = setTimeout(saveNow, 250) } }, { deep: true })
// iOS may kill the app when it goes to background: write immediately
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden' && t) saveNow()
  if (document.visibilityState === 'visible' && state.ready) closeStale()
})
window.addEventListener('pagehide', () => { if (t) saveNow() })

export const sorted = () => Object.values(state.sessions).sort((a, b) => b.date.localeCompare(a.date) || (b.started || 0) - (a.started || 0))

export function counts(s) {
  let n = 0, t = 0
  Object.values(s.ex || {}).forEach(a => a.forEach(x => { t++; if (x.d) n++ }))
  return { n, t }
}
const hasData = s => Object.values(s.ex || {}).some(a => a.some(x => x.d))
const ticked = a => (a || []).some(x => x.d && x.w != null)

// a workout left open for over 12 h (forgot to tap Zakończ): keep it if anything was ticked, drop it if empty.
// Time-based, not date-based, so a workout that runs past midnight is not closed mid-session.
export function closeStale() {
  const limit = Date.now() - 12 * 3600e3
  Object.values(state.sessions).forEach(s => {
    if (s.finished || (s.updated || s.started || 0) > limit) return
    if (hasData(s)) s.finished = true
    else delete state.sessions[s.id]
  })
}

// last earlier session where this exercise was actually done (ticked, with a weight);
// skipped exercises keep their pre-filled weights but must not count as "last time"
export function lastFor(name, session) {
  return sorted().find(s => s.id !== session.id && (s.date < session.date || (s.date === session.date && s.started < session.started))
    && ticked(s.ex?.[name])) || null
}

export function startSession(day) {
  const now = Date.now()
  const s = { id: now.toString(36), date: iso(new Date()), day, ex: {}, started: now, finished: false, updated: now }
  // values and number of sets default to the last time this exercise (or part) was done
  entriesOf(day).forEach(g => {
    // values: newest earlier workout where this exercise had any value entered (skip empty ones)
    const prev = sorted().find(o => (o.ex?.[g.key] || []).some(x => x.w != null))?.ex[g.key]
    const lastAny = sorted().find(o => (o.ex?.[g.key] || []).some(x => x.d))?.ex[g.key]
    const n = lastAny ? Math.max(1, lastAny.length) : prev ? Math.max(1, prev.length) : g.sets
    s.ex[g.key] = Array.from({ length: n }, (_, i) => {
      const w = prev ? (prev[i]?.w ?? [...prev].reverse().find(x => x.w != null)?.w ?? null) : null
      return { w, d: false }
    })
  })
  state.sessions[s.id] = s
  saveNow()
  return s
}

export const activeSession = () => sorted().find(s => !s.finished) || null

// finishing an empty workout throws it away instead of cluttering history
export function finishSession(id) {
  const s = state.sessions[id]
  if (!s) return null
  if (!hasData(s)) { delete state.sessions[id]; saveNow(); return null }
  s.finished = true; s.updated = Date.now(); saveNow()
  return s
}

export function remove(id) { delete state.sessions[id]; saveNow() }

// merge sessions from a backup: adds missing ones, newer versions win, nothing is deleted
export function mergeSessions(src) {
  let n = 0
  Object.entries(src || {}).forEach(([k, b]) => {
    if (k.includes('~draft') || !b?.date) return
    const a = state.sessions[k]
    if (!a || (b.updated || 0) > (a.updated || 0)) {
      state.sessions[k] = { ...b, id: k, started: b.started || new Date(b.date + 'T12:00:00').getTime(), finished: b.finished ?? true }
      n++
    }
  })
  if (n) saveNow()
  return n
}

export function lastDoneOf(day) { return sorted().find(s => s.day === day && hasData(s)) || null }
// the plan you haven't done for the longest time
export function suggestedDay() {
  let best = 0, bestKey = Infinity
  PLAN.forEach((_, i) => { const l = lastDoneOf(i); const k = l ? l.started : -1; if (k < bestKey) { bestKey = k; best = i } })
  return best
}

export function series(name) {
  return sorted().slice().reverse().map(s => {
    const done = (s.ex?.[name] || []).filter(x => x.d && x.w != null)
    if (!done.length) return null
    return { id: s.id, date: s.date, w: Math.max(...done.map(x => x.w)) }
  }).filter(Boolean)
}

export const doneSessions = () => sorted().filter(hasData)
