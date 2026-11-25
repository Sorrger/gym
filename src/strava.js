// Strava link. The phone only starts the Strava login and shows the results;
// the GitHub Action (scripts/strava-sync.mjs) talks to Strava with the secret and writes strava.json into the backup gist.
import { reactive } from 'vue'
import { get, set } from 'idb-keyval'
import { canSync, hasBackend, readFile, writeFile, onConnected, cloudLoaded } from './sync'
import { ask } from './dialog'

export const STRAVA_ICON = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' class='ionicon' viewBox='0 0 512 512'><path d='M226 32 90 294h80l56-105 55 105h80zm110 262-40 78-40-78h-60l100 186 100-186z'/></svg>"

export const strava = reactive({ clientId: '', code: '', sent: '', data: null, loaded: false, busy: false, msg: '' })
const persist = () => set('strava', { clientId: strava.clientId, code: strava.code, sent: strava.sent, data: strava.data }).catch(console.warn)

// workout id -> Strava numbers (heart rate, kcal, time)
export const stravaFor = id => {
  const acts = strava.data?.acts
  if (!acts) return null
  for (const k in acts) if (acts[k].session === id) return acts[k]
  return null
}
// "śr. 132 · max 171 · 410 kcal · 58 min"
export function svText(a) {
  const p = []
  if (a.hr) p.push('śr. ' + Math.round(a.hr) + (a.hrMax ? ' · max ' + Math.round(a.hrMax) : ''))
  if (a.kcal) p.push(Math.round(a.kcal) + ' kcal')
  if (a.elapsed) p.push(Math.round(a.elapsed / 60) + ' min')
  return p.join(' · ')
}

// 'off' | 'waiting' (code sent, Action not run yet) | 'on' | 'error'
export const status = () => {
  const d = strava.data
  if (strava.sent && !(d?.at > strava.sent)) return 'waiting'
  if (d?.authError) return 'error'
  return d?.athlete ? 'on' : 'off'
}

export function startConnect(clientId) {
  strava.clientId = String(clientId).trim(); persist()
  const back = location.origin + location.pathname
  location.href = 'https://www.strava.com/oauth/mobile/authorize?client_id=' + encodeURIComponent(strava.clientId) +
    '&response_type=code&approval_prompt=auto&scope=activity:read_all,activity:write&redirect_uri=' + encodeURIComponent(back)
}

// the code from Strava goes into the gist; the Action swaps it for a long-lived token
export async function sendCode(code = strava.code) {
  if (!code) return false
  strava.code = code; persist()
  try {
    await writeFile('strava-auth.json', { code, at: new Date().toISOString() })
    strava.code = ''; strava.sent = new Date().toISOString(); strava.msg = 'Wysłano. Strava połączy się w ciągu ~10 minut.'
    persist()
    return true
  } catch (e) { strava.msg = e.message || 'Brak internetu'; return false }
}

export async function disconnectStrava() {
  await writeFile('strava-auth.json', {})
  await writeFile('strava.json', {})
  strava.data = null; strava.sent = ''; strava.code = ''; persist()
}

export async function pull() {
  if (!canSync() || strava.busy) return
  strava.busy = true
  try {
    if (strava.code) await sendCode()
    const d = await readFile('strava.json')
    if (d) { strava.data = d; if (d.at > strava.sent && strava.sent) strava.sent = ''; persist() }
  } catch (e) { console.warn(e) } finally { strava.busy = false }
}

// called at start: picks up ?code=… after the Strava login page sends us back
export async function initStrava() {
  try { Object.assign(strava, (await get('strava')) || {}) } catch (e) { console.warn(e) }
  const q = new URLSearchParams(location.search)
  if (q.get('code') && /activity:read_all/.test(q.get('scope') || '')) {
    strava.code = q.get('code'); persist()
    history.replaceState(null, '', location.pathname + location.hash)
  } else if (q.get('error')) history.replaceState(null, '', location.pathname + location.hash)
  strava.loaded = true
  // Strava often sends us back into Safari, which does not share data with the home-screen app:
  // there is no GitHub token here, so let the user copy the code and paste it in the app
  if (strava.code) {
    for (let i = 0; i < 20 && !cloudLoaded(); i++) await new Promise(r => setTimeout(r, 100))
    if (!hasBackend()) {
      const code = strava.code
      const { role } = await ask({ icon: STRAVA_ICON, color: '#fc4c02', title: 'Jeszcze jeden krok',
        message: 'Strava otworzyła się w Safari, a nie w apce Gym. Skopiuj kod, otwórz Gym z ekranu głównego i wejdź w Profil → Ustawienia → Strava → Wklej kod.',
        buttons: [{ text: 'Kopiuj kod', role: 'copy', kind: 'primary' }, { text: 'Zamknij', role: 'cancel' }] })
      if (role === 'copy') { try { await navigator.clipboard.writeText(code) } catch { prompt('Skopiuj kod:', code) } }
      return
    }
    await sendCode()
  }
  setTimeout(pull, 2500)
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') setTimeout(pull, 2000) })
}
