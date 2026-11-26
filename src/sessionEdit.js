// Changing one workout: swap a busy machine, cancel the light week, exercises added on the spot, notes, supersets
import { MUSCLES } from './muscles'
import { PLAN, exOf, entriesOf, groupsOf } from './plan'
import { sorted, prefill, deloadSets } from './store'

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
