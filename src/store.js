import { prefs } from './prefs'
import { reactive, watch, computed } from 'vue'
import { get, set, keys, getMany, setMany, delMany } from './db'
import { MUSCLES } from './muscles'
import { PLAN, exOf, entriesOf, groupsOf, DEF_REPS, WEEKDAY_TO_DAY, rangeOf, migrateNames, stampIds, ensurePlans, visiblePlans, setStageFn, stageOfSession, stageGoalMet, isAssisted, incOf } from './plan'

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
  saveNow() // persist what closeStale / migration changed during loading
  if (navigator.storage?.persist) navigator.storage.persist().catch(() => {})
}

// Auto-save: every change is written to the phone right away (no delay), so swiping the app away
// a moment after a tap loses nothing. Changes made in the same tick are written once.
let queued = false
const saved = new Map() // id → JSON last written, so only workouts that really changed are written
let savedDeleted = ''
function saveNow() {
  if (state.loadError || !state.ready) return Promise.resolve()
  const put = [], gone = []
  for (const [id, s] of Object.entries(state.sessions)) {
    stampIds(s)
    const json = JSON.stringify(s)
    if (saved.get(id) !== json) { put.push([SKEY(id), JSON.parse(json)]); saved.set(id, json) }
  }
  for (const id of [...saved.keys()]) if (!state.sessions[id]) { gone.push(SKEY(id)); saved.delete(id) }
  const del = JSON.stringify(state.deleted), jobs = []
  if (put.length) jobs.push(setMany(put))
  if (gone.length) jobs.push(delMany(gone))
  if (del !== savedDeleted) { savedDeleted = del; jobs.push(set('deleted', JSON.parse(del))) }
  return Promise.all(jobs).catch(e => { console.warn(e); saved.clear(); savedDeleted = '' }) // failed: write everything next time
}
// remove a workout and remember that it was deleted (see state.deleted)
function forget(id) { delete state.sessions[id]; state.deleted[id] = Date.now() }
watch(() => [state.sessions, state.deleted], () => {
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

// newest first; cached (recomputed only when a workout is added/removed or its date changes) – a copy, so callers may reverse it
const sortedC = computed(() => Object.values(state.sessions).sort((a, b) => b.date.localeCompare(a.date) || (b.started || 0) - (a.started || 0)))
export const sorted = () => sortedC.value.slice()

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
function prefill(g, n, deload, self = null) {
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
// swap a plan exercise for its alternative in this workout (machine busy). Untouched sets of the old one are dropped,
// the new one starts from its own history (deload rules too).
export function swapExercise(s, orig, to) {
  const ex = PLAN[s.day]?.ex.find(e => e[0] === orig)
  if (!ex) return
  const before = groupsOf(ex, s)
  s.swap = { ...(s.swap || {}) }
  if (to === orig) delete s.swap[orig]; else s.swap[orig] = to
  if (!Object.keys(s.swap).length) delete s.swap
  for (const g of before) if (!(s.ex[g.key] || []).some(x => x.d)) delete s.ex[g.key]
  for (const g of groupsOf(ex, s)) if (!s.ex[g.key]) { const n = g.sets || 1; s.ex[g.key] = prefill(g, s.deload ? deloadSets(n) : n, !!s.deload, s.id) }
  s.updated = Date.now()
}
// "Dziś trenuj normalnie" in a light-week workout: back to the full plan and numbers; the deload waits one more week
export function cancelDeload(s) {
  delete s.deload
  s.noDeload = true
  entriesOf(s.day, s).forEach(g => {
    const arr = s.ex[g.key] || (s.ex[g.key] = [])
    const full = prefill(g, g.sets || 1, false, s.id)
    full.forEach((v, i) => { if (!arr[i]) arr.push(v); else if (!arr[i].d) Object.assign(arr[i], v) })
  })
  s.updated = Date.now()
}

// ---------- automatic light week (deload) ----------
// due every prefs.deloadEvery weeks of training, or sooner (from DELOAD_MIN) when most exercises stopped improving. A break of 7+ days counts as rest
// and starts the count again. The light week lasts 7 days from its first workout.
export const DELOAD_EVERY = 6, DELOAD_MIN = 4
const dayN = d => Math.round(new Date(d + 'T12:00:00').getTime() / 864e5)
const addDays = (d, n) => iso(new Date(new Date(d + 'T12:00:00').getTime() + n * 864e5))
export function deloadState(today = iso(new Date())) {
  if (!prefs.deload) return { active: false, due: false, weeks: 0, left: 0, off: true }
  const EVERY = prefs.deloadEvery || DELOAD_EVERY, MIN = Math.min(DELOAD_MIN, EVERY - 1)
  // an open workout counts too (a deload workout just started makes the week light; "Trenuj normalnie" postpones it)
  // trainings marked as done without the app count as training too (not a break)
  const list = sorted().filter(s => hasData(s) || !s.finished || s.offApp).reverse() // oldest first
  if (!list.length) return { active: false, due: false, weeks: 0, left: EVERY }
  let block = list[0].date, dl = null, prev = null, skip = ''
  for (const s of list) {
    if (s.date > today) break
    const inDl = dl && dayN(s.date) - dayN(dl) < 7
    if (s.deload && !inDl) { dl = s.date }
    if (s.deload) block = addDays(dl, 7)
    else if (prev && !inDl && dayN(s.date) - dayN(prev) >= 8) block = s.date // a week+ without training = rest
    if (s.noDeload) skip = addDays(s.date, 7)
    prev = s.date
  }
  if (dl && dayN(today) - dayN(dl) < 7) return { active: true, due: false, start: dl, end: addDays(dl, 6) }
  if (dayN(today) - dayN(prev) >= 8) return { active: false, due: false, weeks: 0, left: EVERY } // back after a break
  const weeks = (dayN(today) - dayN(block)) / 7
  const st = weeks >= MIN ? stalled(block) : null
  const due = today >= skip && (weeks >= EVERY || !!st?.many)
  return { active: false, due, weeks: Math.floor(weeks), left: Math.max(0, Math.ceil(EVERY - weeks)),
    reason: due ? (weeks >= EVERY ? `${Math.floor(weeks)} tygodni ciężkich treningów` : `w ${st.n} z ${st.t} ćwiczeń wyniki stoją`) : '' }
}
// exercises with no new best in their last 2 workouts since `from` (needs 3+ workouts of that exercise)
function stalled(from) {
  const list = sorted().filter(s => hasData(s) && !s.deload && s.date >= from).reverse()
  const seen = new Map()
  for (const s of list) for (const g of entriesOf(s.day, s)) {
    const done = (s.ex?.[g.key] || []).filter(x => x.d && x.w != null)
    if (!done.length) continue
    const as = isAssisted(g), lo = rangeOf(g.target)?.lo || 6
    const v = g.unit !== 'kg' ? Math.max(...done.map(x => x.w)) : as ? -Math.min(...done.map(x => x.w)) : Math.max(...done.map(x => x.w * (1 + (x.r ?? lo) / 30)))
    if (!seen.has(g.key)) seen.set(g.key, [])
    seen.get(g.key).push(v)
  }
  let n = 0, t = 0
  for (const v of seen.values()) {
    if (v.length < 3) continue
    t++
    if (Math.max(...v.slice(-2)) <= Math.max(...v.slice(0, -2)) + 1e-9) n++
  }
  return { n, t, many: t >= 5 && n / t >= 0.6 }
}

// ---------- pull-up learning stage, from history: highest stage seen, +1 when a workout met its goal ----------
export function pullupStage() {
  let st = 1
  for (const s of sorted().filter(hasData).reverse()) {
    if (s.deload) continue
    const own = stageOfSession(s)
    if (own == null) continue
    st = Math.max(st, own)
    if (own === st && st < 4 && stageGoalMet(st, s.ex)) st++
  }
  return st
}
// cached: groupsOf/entriesOf ask for the stage very often (every list, card and chart)
const stageC = computed(() => pullupStage())
setStageFn(() => stageC.value)

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

export function lastDoneOf(day) { return sorted().find(s => s.day === day && hasData(s)) || null }
// which plan to do now, from the plan's weekdays (week = Mon–Sun):
// 1) today's scheduled plan if not done this week yet ("Dziś")
// 2) else a plan of this week whose day already passed and wasn't done – earliest first ("Zaległy"),
//    e.g. Pull skipped on Tuesday → Wednesday or the weekend suggests Pull
// 3) else the next scheduled plan not done yet this week, or Push of next week ("Następny")
// Done this week = done on any day this week (order can change). A plan done today doesn't count as missed.
export function suggestion(now = new Date()) {
  const today = iso(now), wd = (now.getDay() + 6) % 7 // 0 = Monday
  const monday = iso(new Date(now.getFullYear(), now.getMonth(), now.getDate() - wd))
  const doneWeek = new Set(Object.values(state.sessions).filter(s => s.date >= monday && s.date <= today && (hasData(s) || s.offApp)).map(s => s.day))
  const sched = Object.entries(WEEKDAY_TO_DAY).map(([js, day]) => ({ wd: (+js + 6) % 7, day })).sort((a, b) => a.wd - b.wd)
  // no fixed weekdays (own plan): just the next training in order after the last one done
  if (!sched.length) {
    const vis = visiblePlans(), last = sorted().find(s => hasData(s) || s.offApp)
    const k = last ? vis.findIndex(i => i > last.day) : 0
    return { day: vis[k < 0 ? 0 : k] ?? 0, kind: 'next' }
  }
  const todays = sched.find(x => x.wd === wd)
  if (todays && !doneWeek.has(todays.day)) return { day: todays.day, kind: 'today' }
  const missed = sched.find(x => x.wd < wd && !doneWeek.has(x.day))
  if (missed) return { day: missed.day, kind: 'missed' }
  const upcoming = sched.find(x => x.wd > wd && !doneWeek.has(x.day))
  return { day: (upcoming || sched[0]).day, kind: 'next' }
}
export const suggestedDay = () => suggestion().day

// a training done without logging it in the app (forgot the phone, before installing it)
// Stored as an empty finished session { offApp: true } on that plan's scheduled day, so it syncs with the backup;
// it has no sets, so it never shows in history or stats – it only stops the plan from being suggested as missed.
// date: the day it was done (picked by the user); default = the plan's scheduled day this week, or today if that's later.
export function markDoneOff(day, date = null, now = new Date()) {
  if (!date) {
    const wd = (now.getDay() + 6) % 7
    const js = +Object.keys(WEEKDAY_TO_DAY).find(k => WEEKDAY_TO_DAY[k] === day)
    const back = js >= 0 ? Math.max(0, wd - ((js + 6) % 7)) : 0
    date = iso(new Date(now.getFullYear(), now.getMonth(), now.getDate() - back))
  }
  const id = 'off' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
  state.sessions[id] = { id, date, day, plan: PLAN[day]?.key, ex: {}, started: 0, finished: true, updated: Date.now(), offApp: true }
  saveNow()
  return state.sessions[id]
}
// "Dodaj zrobiony trening" with sets: a finished workout on a past day, sets prefilled from last time (unticked).
// Opens in edit mode; the user ticks what was done. Left without any ticked set → removed (dropEmptyManual).
export function addPastSession(day, date) {
  const now = Date.now(), started = new Date(date + 'T18:00:00').getTime()
  const s = { id: now.toString(36), date, day, plan: PLAN[day]?.key, ex: {}, started, finished: true, updated: now, manual: true }
  entriesOf(day).forEach(g => { s.ex[g.key] = prefill(g, g.sets || 1, false) })
  state.sessions[s.id] = s
  saveNow()
  return s
}
export function dropEmptyManual() {
  let n = 0
  for (const s of Object.values(state.sessions)) if (s.manual && s.finished && !hasData(s)) { forget(s.id); n++ }
  if (n) saveNow()
}
export const offMarks = () => Object.values(state.sessions).filter(s => s.offApp)

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

// ---------- exercises added during a workout ----------
// session.extra = [[name, target, null, unit, { m: main, h: help }]] – only in this workout, after the plan's exercises
export function extraMuscles(s) {
  for (const e of s?.extra || []) if (!MUSCLES[e[0]] && e[4]) MUSCLES[e[0]] = [e[4].m || [], e[4].h || []]
}
export const namesIn = s => exOf(s.day, s).flatMap(e => groupsOf(e, s).map(g => g.name))
export function addExtra(s, { name, unit, range, main = [], help = [] }) {
  if (namesIn(s).includes(name)) return false
  const [lo, hi] = range || [8, 12]
  const ex = [name, `3 × ${lo}-${hi}${unit === 's' ? ' s' : ''}`, null, unit || 'kg', { m: main, h: help }]
  s.extra = [...(s.extra || []), ex]
  extraMuscles(s)
  for (const g of groupsOf(ex, s)) if (!s.ex[g.key]) s.ex[g.key] = prefill(g, s.deload ? deloadSets(g.sets || 1) : g.sets || 1, !!s.deload, s.id)
  s.updated = Date.now()
  return true
}
// only while nothing of it is ticked; returns false otherwise
export function removeExtra(s, i) {
  const k = i - (PLAN[s.day]?.ex.length || 0), ex = s.extra?.[k]
  if (!ex) return false
  const gs = groupsOf(ex, s)
  if (gs.some(g => (s.ex[g.key] || []).some(x => x.d))) return false
  gs.forEach(g => delete s.ex[g.key])
  s.extra = s.extra.filter((_, j) => j !== k)
  if (!s.extra.length) delete s.extra
  s.ss = (s.ss || []).filter(p => !p.includes(i)).map(p => p.map(j => (j > i ? j - 1 : j)))
  if (!s.ss.length) delete s.ss
  if ((s.cur || 0) >= i) s.cur = Math.max(0, (s.cur || 0) - 1)
  s.updated = Date.now()
  return true
}

// ---------- notes per exercise ----------
// session.notes = { exerciseName: text }. The newest note is shown in every later workout until it is changed;
// an empty text clears it.
export function noteFor(name, s) {
  if (s?.notes?.[name] != null) return { text: s.notes[name], own: true, date: s.date }
  const o = sorted().find(o => o.id !== s?.id && o.notes?.[name] != null && (!s || o.date < s.date || (o.date === s.date && o.started < s.started)))
  return o ? { text: o.notes[name], own: false, date: o.date } : { text: '', own: false, date: '' }
}
export function setNote(s, name, text) {
  s.notes = { ...(s.notes || {}), [name]: String(text || '').trim().slice(0, 500) }
  s.updated = Date.now()
}

// ---------- supersets ----------
// session.ss = [[i, j]]: indices of two exercises done in turns
export const partnerOf = (s, i) => { const p = (s?.ss || []).find(p => p.includes(i)); return p ? p.find(j => j !== i) : null }
export function setSuperset(s, i, j) {
  s.ss = (s.ss || []).filter(p => !p.includes(i) && (j == null || !p.includes(j)))
  if (j != null && j !== i) s.ss.push([Math.min(i, j), Math.max(i, j)])
  if (!s.ss.length) delete s.ss
  s.updated = Date.now()
}
