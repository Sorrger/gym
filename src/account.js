// Account on this phone. Today: local only – a random id + nickname, no sign-in.
// Later (planned): sign-in (Google) and an own database instead of the GitHub gist. The shape is plain JSON so it can
// become a row in a "profiles" table 1:1, and `uid` is what the phone's data gets attached to on the first sign-in.
//   { uid, nick, created, updated, provider: 'local' | 'google', email? }
import { reactive, watch } from 'vue'
import { get, set } from 'idb-keyval'
import { cloud, readGistFile, writeGistFile } from './cloud'
import { prefs, setPrefsLocal, prefsData } from './prefs'

export const account = reactive({ uid: '', nick: '', created: 0, updated: 0, provider: 'local', email: '', loaded: false })

// sign-in options shown in Profil; `ready: false` = shown as "wkrótce"
export const PROVIDERS = [
  { id: 'google', name: 'Google', ready: false }
]

const newId = () => (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2, 12))
const save = () => set('profile', accountData()).catch(() => {})
const FILE = 'gym-profile.json'
// Today the GitHub gist plays the role of the account: one gist = one person. A phone restored from the same gist
// takes over its uid, so every phone of that person has the same id (ready to become the database user id).
export async function syncAccount() {
  if (!cloud.token || !cloud.gistId || !navigator.onLine || !account.uid) return
  try {
    const r = await readGistFile(FILE)
    let up = !r?.uid
    if (r?.uid) {
      if (r.uid !== account.uid) { account.uid = r.uid; account.created = Math.min(r.created || Infinity, account.created || Infinity) }
      if ((r.updated || 0) > (account.updated || 0)) { account.nick = r.nick || ''; setPrefsLocal(r.prefs); account.updated = r.updated } else if ((account.updated || 0) > (r.updated || 0)) up = true
      save()
    }
    if (up) await writeGistFile(FILE, accountData())
  } catch {}
}

export async function initAccount() {
  let a = null
  try { a = await get('profile') } catch {}
  if (!a?.uid) { a = { uid: newId(), nick: '', created: Date.now(), updated: Date.now(), provider: 'local' }; await set('profile', a).catch(() => {}) }
  setPrefsLocal(a.prefs)
  const { prefs: _p, ...rest } = a
  Object.assign(account, rest, { loaded: true })
  watch(() => cloud.gistId, id => { if (id) syncAccount() })
  setTimeout(syncAccount, 3500)
}
export const accountData = () => ({ uid: account.uid, nick: account.nick, created: account.created, updated: account.updated, provider: account.provider, prefs: prefsData(), ...(account.email ? { email: account.email } : {}) })

export function setNick(nick) {
  account.nick = String(nick || '').trim().replace(/\s+/g, ' ').slice(0, 24)
  account.updated = Date.now()
  save(); syncAccount()
}
// from the Kopia file (or later the server): keep this phone's id, take the newer nickname
export function importAccount(a) {
  if (!a || typeof a !== 'object') return false
  if ((a.updated || 0) <= (account.updated || 0)) return false
  account.nick = a.nick; setPrefsLocal(a.prefs); account.updated = a.updated; save(); return true
}
// change one preference (per account; goes to the backup like the nickname)
export function setPref(k, v) { prefs[k] = v; account.updated = Date.now(); save(); syncAccount() }
export const initials = n => (String(n || '').trim().split(/\s+/).map(w => w[0]).join('').slice(0, 2) || '?').toUpperCase()

// placeholder for the future: returns a message for the UI until a backend exists
export async function signIn(provider) {
  return { ok: false, message: `Logowanie przez ${PROVIDERS.find(p => p.id === provider)?.name || provider} będzie wkrótce. Na razie wszystko zostaje na tym telefonie (i w Twojej kopii).` }
}
