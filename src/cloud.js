// Automatic backup to a secret GitHub Gist. Token + gist id live only on this phone.
import { reactive, watch, nextTick } from 'vue'
import { get, set, del } from './db'
import { state, mergeSessions } from './store'

const FILE = 'gym-backup.json'
const API = 'https://api.github.com'

export const cloud = reactive({ token: '', gistId: '', login: '', lastSync: 0, dirty: false, busy: false, connecting: false, error: '', loaded: false })
let rev = 0 // bumped on every change, so edits made during an upload are not marked as sent

const persist = () => set('cloud', { token: cloud.token, gistId: cloud.gistId, login: cloud.login, lastSync: cloud.lastSync, dirty: cloud.dirty }).catch(console.warn)

async function api(path, opts = {}) {
  const r = await fetch(API + path, {
    cache: 'no-store',
    ...opts,
    headers: { Authorization: 'Bearer ' + cloud.token, Accept: 'application/vnd.github+json', 'Content-Type': 'application/json', ...(opts.headers || {}) }
  })
  if (r.status === 401) throw new Error('Token nieważny albo wygasł')
  if (r.status === 403 || r.status === 404) throw new Error('Token nie ma dostępu do Gistów')
  if (!r.ok) throw new Error('GitHub: błąd ' + r.status)
  return r.status === 204 ? null : r.json()
}

const payload = () => JSON.stringify({ app: 'silownia', v: 2, exported: new Date().toISOString(), sessions: state.sessions, deleted: state.deleted })
const hasData = sessions => Object.values(sessions || {}).some(s => Object.values(s.ex || {}).some(a => a.some(x => x.d)))

async function findGist() {
  for (let page = 1; page <= 5; page++) {
    const list = await api('/gists?per_page=100&page=' + page)
    const g = list.find(x => x.files?.[FILE])
    if (g) return g.id
    if (list.length < 100) break
  }
  return ''
}

// other files in the same gist (Strava link + data written by the GitHub Action)
export async function readGistFile(name) {
  if (!cloud.token || !cloud.gistId) return null
  const g = await api('/gists/' + cloud.gistId)
  const f = g.files?.[name]
  if (!f) return null
  return JSON.parse(f.truncated ? await (await fetch(f.raw_url)).text() : f.content)
}
export async function writeGistFile(name, data) {
  if (!cloud.token || !cloud.gistId) throw new Error('Najpierw połącz kopię z GitHub')
  await api('/gists/' + cloud.gistId, { method: 'PATCH', body: JSON.stringify({ files: { [name]: { content: JSON.stringify(data, null, 1) } } }) })
}

async function readGist() {
  const g = await api('/gists/' + cloud.gistId)
  const f = g.files?.[FILE]
  if (!f) return null
  const text = f.truncated ? await (await fetch(f.raw_url)).text() : f.content
  return JSON.parse(text)
}

export async function syncNow({ leaving = false } = {}) {
  if (!cloud.token || !navigator.onLine || state.loadError) return false
  if (cloud.busy) { again = true; return false }
  cloud.busy = true
  let at = rev
  try {
    // safety net: never overwrite a backup that has workouts with a phone that has none (wiped storage) - restore instead
    if (cloud.gistId && !hasData(state.sessions)) {
      const d = await readGist().catch(() => null)
      if (hasData(d?.sessions)) { mergeSessions(d.sessions, d.deleted); cloud.dirty = false; cloud.lastSync = Date.now(); cloud.error = ''; return true }
    }
    // take in what another phone sent since (so this upload never drops its workouts); skipped when leaving the app
    if (cloud.gistId && !leaving) {
      const d = await readGist().catch(() => null)
      if (d?.sessions) { mergeSessions(d.sessions, d.deleted); await nextTick(); at = rev }
    }
    const body = payload()
    const files = { [FILE]: { content: body } }
    // keepalive lets the upload finish when iOS suspends the app, but only for bodies under 64 KB
    const ka = leaving && body.length < 60000 ? { keepalive: true } : {}
    if (cloud.gistId) {
      try { await api('/gists/' + cloud.gistId, { method: 'PATCH', body: JSON.stringify({ files }), ...ka }) }
      catch (e) { if (!/dostępu/.test(e.message)) throw e; cloud.gistId = '' } // gist deleted on GitHub: make a new one
    }
    if (!cloud.gistId) {
      const g = await api('/gists', { method: 'POST', body: JSON.stringify({ description: 'Gym – kopia treningów (automatyczna)', public: false, files }) })
      cloud.gistId = g.id
    }
    cloud.dirty = rev !== at; cloud.lastSync = Date.now(); cloud.error = ''
    return true
  } catch (e) {
    cloud.error = /fetch|network|load failed/i.test(e.message) ? 'Brak połączenia' : (e.message || 'Brak połączenia')
    return false
  } finally {
    cloud.busy = false; persist()
    if (again || cloud.dirty) { again = false; schedule() }
  }
}
let again = false

// connect with a token; if a backup already exists (new phone), merge it in first
export async function connect(token) {
  cloud.token = token.trim(); cloud.error = ''; cloud.connecting = true
  try {
    const u = await api('/user')
    cloud.login = u.login
    cloud.gistId = await findGist()
    let n = 0
    if (cloud.gistId) { const d = await readGist(); if (d?.sessions) n = mergeSessions(d.sessions, d.deleted) }
    await persist()
    const sent = await syncNow()
    return { ok: true, restored: n, sent }
  } catch (e) {
    cloud.token = ''; cloud.login = ''; cloud.gistId = ''
    await persist()
    return { ok: false, error: /fetch|network|load failed/i.test(e.message) ? 'Brak internetu' : (e.message || 'Brak połączenia') }
  } finally { cloud.connecting = false }
}

export async function restoreNow() {
  if (!cloud.gistId) return 0
  const d = await readGist()
  return d?.sessions ? mergeSessions(d.sessions, d.deleted) : 0
}

export async function disconnect() {
  Object.assign(cloud, { token: '', gistId: '', login: '', lastSync: 0, dirty: false, error: '' })
  await del('cloud')
}

let timer = null
const QUICK = 4000 // outside a workout: a few seconds after the last change
export const WORKOUT_GAP = 5 * 60e3 // during an open workout: at most one upload per 5 minutes (the phone keeps every tap anyway)
const openWorkout = () => Object.values(state.sessions).some(s => s && !s.finished && !s.offApp)
export const nextDelay = (now = Date.now()) => openWorkout() ? Math.max(QUICK, (cloud.lastSync || 0) + WORKOUT_GAP - now) : QUICK
const schedule = (ms = nextDelay()) => { clearTimeout(timer); timer = setTimeout(() => { if (cloud.dirty) syncNow() }, ms) }
const finishedIds = () => new Set(Object.values(state.sessions).filter(s => s?.finished).map(s => s.id))

export async function initCloud() {
  try { Object.assign(cloud, (await get('cloud')) || {}) } catch (e) { console.warn(e) }
  cloud.loaded = true
  // any change to workouts marks the backup as out of date; sent a few seconds later when online
  // a workout just finished goes out at once, in one upload
  let done = finishedIds()
  watch(() => [state.sessions, state.deleted], () => {
    const now = finishedIds(), fresh = [...now].some(id => !done.has(id)); done = now
    if (cloud.token) { rev++; if (!cloud.dirty) { cloud.dirty = true; persist() } schedule(fresh ? 1000 : nextDelay()) }
  }, { deep: true })
  window.addEventListener('online', () => schedule(Math.max(1000, nextDelay())))
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden' && cloud.dirty) { clearTimeout(timer); syncNow({ leaving: true }) } // leaving the app: try right away
    if (document.visibilityState === 'visible') schedule(Math.max(1500, nextDelay()))
  })
  // also check now and then, so a missed upload (no signal at the gym) goes out later
  if (cloud.token && (cloud.dirty || !cloud.lastSync)) { cloud.dirty = true; schedule(2000) }
}
