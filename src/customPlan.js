// The phone's own version of the plan (see applyPlan in plan.js). IndexedDB key `plan` + gist file gym-plan.json
// (newer `t` wins). Changes take effect after a reload, so every screen and cache starts from the same plan.
import { reactive } from 'vue'
import { get, set } from 'idb-keyval'
import { applyPlan, ALT } from './plan'
import { MUSCLES } from './muscles'
import { canSync, hasBackend, readFile, writeFile, onConnected, cloudLoaded } from './sync'

const FILE = 'gym-plan.json'
export const custom = reactive({ data: null })
const DEF_MUSCLES = { ...MUSCLES }

function apply(c) {
  custom.data = c && c.days ? c : null
  applyPlan(custom.data)
  for (const k of Object.keys(MUSCLES)) if (!(k in DEF_MUSCLES)) delete MUSCLES[k]
  Object.assign(MUSCLES, DEF_MUSCLES, custom.data?.muscles || {})
  // an alternative nobody described works the same muscles as the exercise it replaces
  for (const [orig, alts] of Object.entries(ALT)) for (const n of alts) if (!MUSCLES[n] && MUSCLES[orig]) MUSCLES[n] = MUSCLES[orig]
}

export async function initPlan() {
  try { apply(await get('plan')) } catch { apply(null) }
  setTimeout(pull, 3500)
}

// save (null = default plan), push to the backup, then reload into the new plan
export async function savePlan(c, go) {
  const data = c ? { ...c, t: Date.now() } : { t: Date.now(), days: null }
  await set('plan', JSON.parse(JSON.stringify(data)))
  try { if (canSync()) await writeFile(FILE, data) } catch {}
  if (go) history.replaceState(history.state, '', go) // no hashchange: the router must not start navigating right before the reload
  location.reload()
}

// a newer plan in the gist (e.g. restored on a new phone): take it; reload only when no workout is open
async function pull() {
  if (!canSync()) return
  try {
    const remote = await readFile(FILE), local = (await get('plan')) || null
    if (remote && (remote.t || 0) > (local?.t || 0)) {
      await set('plan', remote)
      const { activeSession } = await import('./store')
      if (!activeSession()) location.reload()
    } else if (local && (local.t || 0) > (remote?.t || 0)) await writeFile(FILE, local)
  } catch {}
}
// from a backup file (Kopia → Wczytaj z pliku)
export async function importPlan(c) {
  const local = (await get('plan')) || null
  if (c && (c.t || 0) > (local?.t || 0)) { await set('plan', c); return true }
  return false
}
export const planData = async () => (await get('plan')) || null
