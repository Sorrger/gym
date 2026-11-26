// Training cycle read from the history: the automatic light week (deload) and the pull-up learning stage
import { computed } from 'vue'
import { prefs } from './prefs'
import { entriesOf, rangeOf, setStageFn, stageOfSession, stageGoalMet, isAssisted } from './plan'
import { sorted, iso, hasData } from './store'

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
