import { reactive, watch } from 'vue'
import { get, set } from 'idb-keyval'
import { PLAN, entriesOf, DEF_REPS, WEEKDAY_TO_DAY } from './plan'

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
  saveNow() // persist what closeStale / migration changed during loading
  if (navigator.storage?.persist) navigator.storage.persist().catch(() => {})
}

// Auto-save: every change is written to the phone right away (no delay), so swiping the app away
// a moment after a tap loses nothing. Changes made in the same tick are written once.
let queued = false
function saveNow() {
  if (state.loadError) return Promise.resolve()
  return set('sessions', JSON.parse(JSON.stringify(state.sessions))).catch(console.warn)
}
watch(() => state.sessions, () => {
  if (!state.ready || queued) return
  queued = true
  queueMicrotask(() => { queued = false; saveNow() })
}, { deep: true, flush: 'sync' })
// leaving the app: write once more, just in case
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden' && state.ready) saveNow()
  if (document.visibilityState === 'visible' && state.ready) closeStale()
})
window.addEventListener('pagehide', () => { if (state.ready) saveNow() })

export const sorted = () => Object.values(state.sessions).sort((a, b) => b.date.localeCompare(a.date) || (b.started || 0) - (a.started || 0))

export function counts(s) {
  let n = 0, t = 0
  Object.values(s.ex || {}).forEach(a => a.forEach(x => { t++; if (x.d) n++ }))
  return { n, t }
}
const hasData = s => Object.values(s.ex || {}).some(a => a.some(x => x.d))
const ticked = a => (a || []).some(x => x.d && x.w != null)

// a workout left open for over 12 h (forgot to tap Zakończ) gets closed. Time-based, not date-based,
// so a workout that runs past midnight is not closed mid-session.
// Kept if anything was ticked OR any value was changed by hand (so typed weights/reps are remembered for next time);
// only a workout that was opened and never touched is dropped.
export function closeStale() {
  const limit = Date.now() - 12 * 3600e3
  Object.values(state.sessions).forEach(s => {
    if (s.finished || (s.updated || s.started || 0) > limit) return
    if (hasData(s) || (s.updated || 0) > (s.started || 0) + 1000) s.finished = true
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
      if (g.unit !== 'kg') return { w, d: false }
      const r = prev?.[i]?.r ?? (prev ? [...prev].reverse().find(x => x.r != null)?.r : null) ?? DEF_REPS
      return { w, r, d: false }
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
// suggested plan follows the weekly schedule (Mon Push, Tue Pull, Thu Legs, Fri Upper):
// today's plan on a training day, otherwise (rest day, or today's already done) the next one in the week
export function suggestedDay() {
  const now = new Date(), today = iso(now)
  const doneToday = new Set(Object.values(state.sessions).filter(s => s.date === today && hasData(s)).map(s => s.day))
  for (let k = 0; k < 7; k++) {
    const day = WEEKDAY_TO_DAY[(now.getDay() + k) % 7]
    if (day == null || (k === 0 && doneToday.has(day))) continue
    return day
  }
  return 0
}

export function series(name) {
  return sorted().slice().reverse().map(s => {
    const done = (s.ex?.[name] || []).filter(x => x.d && x.w != null)
    if (!done.length) return null
    return { id: s.id, date: s.date, w: Math.max(...done.map(x => x.w)) }
  }).filter(Boolean)
}

export const doneSessions = () => sorted().filter(hasData)
