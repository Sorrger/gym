import { prefs } from './prefs'
import { reactive, watch, computed, ref } from 'vue'
import { get, set, keys, getMany, setMany, delMany } from './db'
import { PLAN, entriesOf, DEF_REPS, rangeOf, migrateNames, stampIds, ensurePlans, isAssisted, incOf } from './plan'
import { deloadState } from './cycle'
import { extraMuscles } from './sessionEdit'
// the store is split by topic; everything stays importable from here
export * from './cycle'
export * from './schedule'
export * from './sessionEdit'

export const iso = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')
export const fmtDate = s => { const [y, m, d] = s.split('-'); return `${d}.${m}.${y}` }
export const fmtShort = s => { const [, m, d] = s.split('-'); return `${d}.${m}` }
export const fmtKg = w => (w == null ? '–' : String(+(+w).toFixed(2)).replace('.', ','))
export function ago(date) {
  const days = Math.round((new Date(iso(new Date()) + 'T12:00:00').getTime() - new Date(date + 'T12:00:00').getTime()) / 864e5)
  if (days <= 0) return 'dzisiaj'
  if (days === 1) return 'wczoraj'
  return days + ' dni temu'
}

// sessions: id -> { id, date, day, ex: { name: [{ w, d }] }, started, finished, updated }
// deleted: id -> time of deletion, so a workout deleted here doesn't come back from a backup / another phone
export const state = reactive({ sessions: {}, deleted: {}, ready: false, flash: '', loadError: false })
export const ui = reactive({ progressDay: 0, period: null, ptab: 'all' }) // period: days for the Progress tab, null = all time

// Storage: one IndexedDB entry per workout (`s:<id>`), so a change writes only that workout.
// Older versions kept everything in one entry `sessions`: it is read, merged and copied to the new
// entries once, then kept untouched as `sessions-v1` (a safety copy, never written again).
const SKEY = id => 's:' + id
const newer = (a, b) => (!a ? b : !b ? a : (b.updated || 0) > (a.updated || 0) ? b : a)
async function readAll() {
  const ks = (await keys()).filter(k => typeof k === 'string' && k.startsWith('s:'))
  const out = {}
  ;(await getMany(ks)).forEach(s => { if (s?.id) out[s.id] = s })
  const legacy = await get('sessions')
  if (legacy) {
    Object.entries(legacy).forEach(([id, s]) => { if (s) out[id] = newer(out[id], { ...s, id: s.id || id }) })
    await setMany(Object.entries(out).map(([id, s]) => [SKEY(id), s]))
    // keep the old single entry as a copy, but never read it again as the live list
    const prev = await get('sessions-v1')
    await set('sessions-v1', { ...(prev || {}), ...legacy })
    await delMany(['sessions'])
  }
  return out
}

export async function load() {
  // if storage can't be read, do NOT continue with an empty list: the first save would wipe the real data
  for (let k = 0; k < 3; k++) {
    try {
      state.sessions = await readAll(); state.deleted = (await get('deleted')) || {}; state.loadError = false
      saved.clear(); for (const [id, s] of Object.entries(state.sessions)) saved.set(id, JSON.stringify(s))
      savedDeleted = JSON.stringify(state.deleted)
      break
    } catch (e) { console.warn(e); state.loadError = true; await new Promise(r => setTimeout(r, 300)) }
  }
  // older versions keyed sessions by "date_day" and had no id/started/finished
  Object.entries(state.sessions).forEach(([k, s]) => {
    if (k.includes('~draft')) { delete state.sessions[k]; return }
    s.id = k
    if (!s.started) s.started = new Date(s.date + 'T12:00:00').getTime()
    if (s.finished == null) s.finished = s.date < iso(new Date())
    migrateNames(s)
    stampIds(s)
    extraMuscles(s)
  })
  ensurePlans(Math.max(0, ...Object.values(state.sessions).map(s => +s.day || 0)))
  closeStale()
  state.ready = true
  dataRev.value++
  saveNow(true) // persist what closeStale / migration changed during loading
  if (navigator.storage?.persist) navigator.storage.persist().catch(() => {})
}

// Auto-save: every change is written to the phone right away (no delay), so swiping the app away
// a moment after a tap loses nothing. Changes made in the same tick are written once.
let queued = false
// bumped when finished workouts change (not on every tap of an open workout): statistics are cached per value
export const dataRev = ref(0)
// bumped on every write (any workout or deletion changed) – the cloud backup listens to this instead of a deep watch
export const changes = ref(0)
const saved = new Map() // id → JSON last written, so only workouts that really changed are written
const seen = new Map() // id → `updated|finished` at the last write: finished workouts that didn't change are not even serialized
let savedDeleted = ''
// full = compare every workout (load, leaving the app); otherwise finished workouts are compared only when `updated` moved
export function saveNow(full = false) {
  if (state.loadError || !state.ready) return Promise.resolve()
  const put = [], gone = []
  for (const [id, s] of Object.entries(state.sessions)) {
    const mark = s.updated + '|' + !!s.finished
    if (!full && s.finished && seen.get(id) === mark && saved.has(id)) continue
    stampIds(s)
    const json = JSON.stringify(s)
    seen.set(id, mark)
    if (saved.get(id) !== json) { put.push([SKEY(id), JSON.parse(json)]); saved.set(id, json) }
  }
  for (const id of [...saved.keys()]) if (!state.sessions[id]) { gone.push(SKEY(id)); saved.delete(id); seen.delete(id) }
  const del = JSON.stringify(state.deleted), jobs = []
  if (put.length || gone.length || del !== savedDeleted) changes.value++
  if (gone.length || del !== savedDeleted || put.some(([k]) => { const x = state.sessions[k.slice(2)]; return x?.finished || x?.offApp })) dataRev.value++
  if (put.length) jobs.push(setMany(put))
  if (gone.length) jobs.push(delMany(gone))
  if (del !== savedDeleted) { savedDeleted = del; jobs.push(set('deleted', JSON.parse(del))) }
  return Promise.all(jobs).catch(e => { console.warn(e); saved.clear(); seen.clear(); savedDeleted = '' }) // failed: write everything next time
}
// remove a workout and remember that it was deleted (see state.deleted)
export function forget(id) { delete state.sessions[id]; state.deleted[id] = Date.now() }
// what can change: deletions, the list of workouts, everything inside open workouts, and `updated` of finished ones
// (edits always move it) – watching every set of every old workout made each tap slower as the history grew
watch(() => { const out = [state.deleted]; for (const s of Object.values(state.sessions)) out.push(s?.finished ? s.updated : s); return out }, () => {
  if (!state.ready || queued) return
  queued = true
  queueMicrotask(() => { queued = false; saveNow() })
}, { deep: true, flush: 'sync' })
// leaving the app: write once more, just in case
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden' && state.ready) saveNow(true)
  if (document.visibilityState === 'visible' && state.ready) closeStale()
})
window.addEventListener('pagehide', () => { if (state.ready) saveNow(true) })

// newest first; cached (recomputed only when a workout is added/removed or its date changes) – a copy, so callers may reverse it
const sortedC = computed(() => Object.values(state.sessions).sort((a, b) => b.date.localeCompare(a.date) || (b.started || 0) - (a.started || 0)))
export const sorted = () => sortedC.value.slice()

export function counts(s) {
  let n = 0, t = 0
  Object.values(s.ex || {}).forEach(a => a.forEach(x => { t++; if (x.d) n++ }))
  return { n, t }
}
export const hasData = s => Object.values(s.ex || {}).some(a => a.some(x => x.d))
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
    else forget(s.id)
  })
}

// last earlier session where this exercise was actually done (ticked, with a weight);
// skipped exercises keep their pre-filled weights but must not count as "last time"
export function lastFor(name, session) {
  return sorted().find(s => s.id !== session.id && (s.date < session.date || (s.date === session.date && s.started < session.started))
    && ticked(s.ex?.[name])) || null
}

// values a new set list starts with: from the newest earlier workout with a value (deload workouts don't count,
// so after the light week the old numbers come back)
export function prefill(g, n, deload, self = null) {
  // same unit only (kg sets carry reps; a plan edited kg ↔ reps must not prefill 60 kg as 60 reps)
  const fits = arr => (g.unit === 'kg') === arr.some(x => x.r != null)
  const find = key => sorted().find(o => o.id !== self && !o.deload && (o.ex?.[key] || []).some(x => x.w != null) && fits(o.ex[key]))?.ex[key]
  // first time on the assisted machine in pull-up stage 2: start from the old assisted pull-up numbers, if any
  const prev = find(g.key) || (g.key === 'Nauka podciągania · Ze wspomaganiem' ? find('Podciąganie nachwytem (wspomagane)') : null)
  const lo = rangeOf(g.target)?.lo
  return Array.from({ length: n }, (_, i) => {
    let w = prev ? (prev[i]?.w ?? [...prev].reverse().find(x => x.w != null)?.w ?? null) : null
    if (deload && w != null) w = g.unit === 'kg' ? deloadKg(w, g) : lo != null ? Math.min(w, lo) : w
    if (g.unit !== 'kg') return { w, d: false }
    const r = deload ? (lo ?? DEF_REPS) : prev?.[i]?.r ?? (prev ? [...prev].reverse().find(x => x.r != null)?.r : null) ?? lo ?? DEF_REPS
    return { w, r, d: false }
  })
}
const roundTo = (v, st) => Math.round(v / st) * st
// light week: prefs.deloadPct less (default 10 %) (assisted machine: one step more help)
export function deloadKg(w, g) { const inc = incOf(g, prefs.stepKg); return isAssisted(g) ? w + inc : Math.max(0, roundTo(w * (1 - prefs.deloadPct / 100), inc)) }
export const deloadSets = n => (prefs.deloadHalf ? Math.max(1, Math.ceil(n / 2)) : n)

export function startSession(day) {
  const now = Date.now()
  const dl = deloadState()
  const deload = dl.active || dl.due
  const s = { id: now.toString(36), date: iso(new Date()), day, plan: PLAN[day]?.key, ex: {}, started: now, finished: false, updated: now }
  if (deload) s.deload = true
  // always the planned number of sets (half of it in a light week); extra sets can still be added
  entriesOf(day).forEach(g => { const n = g.sets || 1; s.ex[g.key] = prefill(g, deload ? deloadSets(n) : n, deload) })
  // supersets stay as they were set the last time this training was done
  const n = PLAN[day]?.ex.length || 0, prevSs = sorted().find(o => o.day === day && !o.offApp)?.ss
  const ss = (prevSs || []).filter(p => p.every(i => i < n))
  if (ss.length) s.ss = ss.map(p => [...p])
  state.sessions[s.id] = s
  saveNow()
  return s
}
export const activeSession = () => sorted().find(s => !s.finished) || null

// finishing an empty workout throws it away instead of cluttering history
export function finishSession(id) {
  const s = state.sessions[id]
  if (!s) return null
  if (!hasData(s)) { forget(id); saveNow(); return null }
  s.finished = true; s.updated = Date.now(); saveNow()
  return s
}

export function remove(id) { forget(id); saveNow() }

// merge sessions from a backup: adds missing ones, newer versions win. Deletions travel as tombstones
// (deleted: id -> time): a workout deleted after its last change is removed on every phone.
export function mergeSessions(src, deleted = {}) {
  let n = 0, gone = 0 // n = workouts added or updated
  for (const [k, t] of Object.entries(deleted || {})) if (t > (state.deleted[k] || 0)) state.deleted[k] = t
  for (const [k, t] of Object.entries(state.deleted)) {
    const a = state.sessions[k]
    if (a && (a.updated || a.started || 0) <= t) { delete state.sessions[k]; gone++ }
  }
  Object.entries(src || {}).forEach(([k, b]) => {
    if (k.includes('~draft') || !b?.date) return
    if ((state.deleted[k] || 0) >= (b.updated || b.started || 0)) return
    const a = state.sessions[k]
    if (!a || (b.updated || 0) > (a.updated || 0)) {
      migrateNames(b); extraMuscles(b)
      state.sessions[k] = { ...b, id: k, started: b.started || new Date(b.date + 'T12:00:00').getTime(), finished: b.finished ?? true }
      n++
    }
  })
  if (n || gone) { ensurePlans(Math.max(0, ...Object.values(state.sessions).map(s => +s.day || 0))); saveNow() }
  return n
}

export function series(name) {
  return sorted().slice().reverse().map(s => {
    const done = (s.ex?.[name] || []).filter(x => x.d && x.w != null)
    if (!done.length) return null
    const w = isAssisted({ key: name, name: name.split(' · ')[0] }) ? Math.min(...done.map(x => x.w)) : Math.max(...done.map(x => x.w))
    const r = Math.max(0, ...done.filter(x => x.w === w).map(x => x.r || 0)) || null // reps of the heaviest set (kg exercises)
    return { id: s.id, date: s.date, w, r }
  }).filter(Boolean)
}

export const doneSessions = () => sorted().filter(hasData)

