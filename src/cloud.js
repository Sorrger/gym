// Automatic backup to a secret GitHub Gist. Token + gist id live only on this phone.
import { reactive, watch } from 'vue'
import { get, set, del } from 'idb-keyval'
import { state, mergeSessions } from './store'

const FILE = 'gym-backup.json'
const API = 'https://api.github.com'

export const cloud = reactive({ token: '', gistId: '', login: '', lastSync: 0, dirty: false, busy: false, error: '', loaded: false })

const persist = () => set('cloud', { token: cloud.token, gistId: cloud.gistId, login: cloud.login, lastSync: cloud.lastSync, dirty: cloud.dirty }).catch(console.warn)

async function api(path, opts = {}) {
  const r = await fetch(API + path, {
    ...opts,
    headers: { Authorization: 'Bearer ' + cloud.token, Accept: 'application/vnd.github+json', 'Content-Type': 'application/json', ...(opts.headers || {}) }
  })
  if (r.status === 401) throw new Error('Token nieważny albo wygasł')
  if (r.status === 403 || r.status === 404) throw new Error('Token nie ma dostępu do Gistów')
  if (!r.ok) throw new Error('GitHub: błąd ' + r.status)
  return r.status === 204 ? null : r.json()
}

const payload = () => JSON.stringify({ app: 'silownia', v: 2, exported: new Date().toISOString(), sessions: state.sessions })

async function findGist() {
  for (let page = 1; page <= 5; page++) {
    const list = await api('/gists?per_page=100&page=' + page)
    const g = list.find(x => x.files?.[FILE])
    if (g) return g.id
    if (list.length < 100) break
  }
  return ''
}

async function readGist() {
  const g = await api('/gists/' + cloud.gistId)
  const f = g.files?.[FILE]
  if (!f) return null
  const text = f.truncated ? await (await fetch(f.raw_url)).text() : f.content
  return JSON.parse(text)
}

export async function syncNow() {
  if (!cloud.token || cloud.busy || !navigator.onLine) return false
  cloud.busy = true
  try {
    const files = { [FILE]: { content: payload() } }
    if (cloud.gistId) {
      try { await api('/gists/' + cloud.gistId, { method: 'PATCH', body: JSON.stringify({ files }) }) }
      catch (e) { if (!/dostępu/.test(e.message)) throw e; cloud.gistId = '' } // gist deleted on GitHub: make a new one
    }
    if (!cloud.gistId) {
      const g = await api('/gists', { method: 'POST', body: JSON.stringify({ description: 'Gym – kopia treningów (automatyczna)', public: false, files }) })
      cloud.gistId = g.id
    }
    cloud.dirty = false; cloud.lastSync = Date.now(); cloud.error = ''
    return true
  } catch (e) {
    cloud.error = e.message || 'Brak połączenia'
    return false
  } finally { cloud.busy = false; persist() }
}

// connect with a token; if a backup already exists (new phone), merge it in first
export async function connect(token) {
  cloud.token = token.trim(); cloud.error = ''
  try {
    const u = await api('/user')
    cloud.login = u.login
    cloud.gistId = await findGist()
    let n = 0
    if (cloud.gistId) { const d = await readGist(); if (d?.sessions) n = mergeSessions(d.sessions) }
    await persist()
    await syncNow()
    return { ok: true, restored: n }
  } catch (e) {
    cloud.token = ''; cloud.login = ''; cloud.gistId = ''
    await persist()
    return { ok: false, error: e.message || 'Brak połączenia' }
  }
}

export async function restoreNow() {
  if (!cloud.gistId) return 0
  const d = await readGist()
  return d?.sessions ? mergeSessions(d.sessions) : 0
}

export async function disconnect() {
  Object.assign(cloud, { token: '', gistId: '', login: '', lastSync: 0, dirty: false, error: '' })
  await del('cloud')
}

let timer = null
const schedule = (ms = 4000) => { clearTimeout(timer); timer = setTimeout(() => { if (cloud.dirty) syncNow() }, ms) }

export async function initCloud() {
  try { Object.assign(cloud, (await get('cloud')) || {}) } catch (e) { console.warn(e) }
  cloud.loaded = true
  // any change to workouts marks the backup as out of date; sent a few seconds later when online
  watch(() => state.sessions, () => { if (cloud.token) { cloud.dirty = true; persist(); schedule() } }, { deep: true })
  window.addEventListener('online', () => schedule(1000))
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden' && cloud.dirty) syncNow() // leaving the app: try right away
    if (document.visibilityState === 'visible') schedule(1500)
  })
  if (cloud.dirty) schedule(2000)
}
