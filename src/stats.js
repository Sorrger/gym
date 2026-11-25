// Numbers for the Progress tab (overview + per plan)
import { PLAN, isAssisted, entriesOf, rangeOf } from './plan'
import { sorted, series } from './store'
import { musclesOf } from './muscles'

const ticked = s => Object.values(s.ex || {}).some(a => a.some(x => x.d))
const daysAgoIso = n => { const d = new Date(Date.now() - n * 864e5); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0') }

// kg × reps of one workout (only kg exercises)
export function volumeOf(s) {
  // assisted machine kg is help, not load → not volume
  const kg = new Set(entriesOf(s.day, s).filter(g => g.unit === 'kg' && !isAssisted(g)).map(g => g.key))
  let v = 0
  const inPlan = new Set(entriesOf(s.day, s).map(g => g.key))
  for (const [k, arr] of Object.entries(s.ex || {})) {
    // an exercise later removed from the plan still counts if it was done with kg × reps
    const count = kg.has(k) || (!inPlan.has(k) && !k.includes('wspomag') && arr.some(x => x.r != null))
    if (count) for (const x of arr) if (x.d && x.w != null && x.t !== 'w') v += x.w * (x.r || 0)
  }
  return Math.round(v)
}
export const setsOf = s => Object.values(s.ex || {}).reduce((a, arr) => a + arr.filter(x => x.d && x.t !== 'w').length, 0)

// new records in a period (days = null → all time): every workout where an exercise beat all its earlier workouts
export function prEvents(day = null, days = null) {
  const cut = days ? daysAgoIso(days) : ''
  const plans = day == null ? PLAN.map((_, i) => i) : [day]
  let n = 0
  const seen = new Set() // an exercise in two plans (e.g. pull-up learning) shares one history: count it once
  for (const d of plans) for (const g of entriesOf(d, 'all')) {
    if (seen.has(g.key)) continue
    seen.add(g.key)
    const as = isAssisted(g)
    let best = null
    for (const p of series(g.key)) {
      const better = best != null && (as ? p.w < best : p.w > best)
      if (better && p.date >= cut) n++
      if (best == null || better) best = p.w
    }
  }
  return n
}
// records of one plan in the last `days` (plan page): exercises whose best in the window beat everything before
export function prCount(day = null, days = 30) {
  const cut = daysAgoIso(days)
  const plans = day == null ? PLAN.map((_, i) => i) : [day]
  let n = 0
  const seen = new Set()
  for (const d of plans) for (const g of entriesOf(d, 'all')) {
    if (seen.has(g.key)) continue
    seen.add(g.key)
    const pts = series(g.key), old = pts.filter(p => p.date < cut), rec = pts.filter(p => p.date >= cut)
    if (!old.length || !rec.length) continue
    const as = isAssisted(g)
    if (as ? Math.min(...rec.map(p => p.w)) < Math.min(...old.map(p => p.w)) : Math.max(...rec.map(p => p.w)) > Math.max(...old.map(p => p.w))) n++
  }
  return n
}

// "strength" of one exercise in one workout: kg → estimated 1-rep max (Epley: kg × (1 + reps/30)) of the best set,
// reps/seconds → the best value. Compared only with itself, so units never mix.
function bestValue(g, arr) {
  const done = (arr || []).filter(x => x.d && x.w != null && x.t !== 'w')
  if (!done.length) return null
  if (g.unit !== 'kg') return Math.max(...done.map(x => x.w))
  const lo = rangeOf(g.target)?.lo || 6
  if (isAssisted(g)) return Math.min(...done.map(x => x.w)) // less help = stronger
  return Math.max(...done.map(x => x.w * (1 + (x.r ?? lo) / 30)))
}

// strength index of a plan per workout: average of every exercise vs its first workout (100 = start)
export function strength(day) {
  const groups = entriesOf(day, 'all')
  // deload weeks are lighter on purpose: they don't count for the strength index
  const list = sorted().filter(s => s.day === day && ticked(s) && !s.deload).reverse() // oldest first
  const first = {}, last = {}, prev = {}
  const index = []
  for (const s of list) {
    const rel = []
    for (const g of groups) {
      const v = bestValue(g, s.ex?.[g.key])
      if (v == null) continue
      if (first[g.key] == null) first[g.key] = v
      prev[g.key] = last[g.key]; last[g.key] = v
      const as = isAssisted(g)
      rel.push(as ? (v > 0 ? first[g.key] / v : 1) : (first[g.key] > 0 ? v / first[g.key] : 1))
    }
    if (rel.length) index.push(rel.reduce((a, b) => a + b, 0) / rel.length * 100)
  }
  // exercises that went up last time (vs the time before)
  let up = 0, tracked = 0
  for (const g of groups) {
    if (last[g.key] == null || prev[g.key] == null) continue
    tracked++
    if (isAssisted(g) ? last[g.key] < prev[g.key] : last[g.key] > prev[g.key]) up++
  }
  return { index, gain: index.length ? Math.round(index[index.length - 1] - 100) : null, up, tracked }
}

export function planSummary(day) {
  const list = sorted().filter(s => s.day === day && ticked(s))
  const vols = list.slice(0, 8).map(volumeOf).reverse()
  const n = vols.length, hi = Math.max(1, ...vols)
  const st = strength(day)
  const idx = st.index.slice(-8), lo = Math.min(...idx), hi2 = Math.max(...idx, lo + 0.0001)
  return { last: list[0] || null, count: list.length, prs: prCount(day, 30), vol: n ? vols[n - 1] : 0,
    gain: st.gain, up: st.up, tracked: st.tracked,
    sbars: idx.map(v => Math.round(30 + (v - lo) / (hi2 - lo) * 70)),
    volDiff: n > 1 && vols[n - 2] ? Math.round((vols[n - 1] / vols[n - 2] - 1) * 100) : null,
    bars: vols.map(v => Math.max(6, Math.round(v / hi * 100))) }
}

// newest records (all plans): [{ key, name, label, unit, w, r, prev, date, day, i }] – i = index in entriesOf(day, 'all')
export function recentPRs(limit = 5, days = null) {
  const cut = days ? daysAgoIso(days) : '', out = [], seen = new Set()
  PLAN.forEach((_, d) => entriesOf(d, 'all').forEach((g, i) => {
    if (seen.has(g.key)) return
    seen.add(g.key)
    const as = isAssisted(g)
    let best = null
    for (const p of series(g.key)) {
      const better = best != null && (as ? p.w < best : p.w > best)
      if (better && p.date >= cut) out.push({ key: g.key, name: g.name, label: g.label, unit: g.unit, w: p.w, r: p.r, prev: best, date: p.date, day: d, i, as })
      if (best == null || better) best = p.w
    }
  }))
  return out.sort((a, b) => b.date.localeCompare(a.date)).slice(0, limit)
}
// workouts per week (Mon–Sun), oldest first, last n weeks incl. this one; marks "done without the app" count too
export function weekly(n = 8) {
  const now = new Date(), mon = new Date(now.getFullYear(), now.getMonth(), now.getDate() - ((now.getDay() + 6) % 7))
  const iso = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')
  const all = sorted().filter(s => ticked(s) || s.offApp)
  return Array.from({ length: n }, (_, k) => {
    const a = new Date(mon); a.setDate(mon.getDate() - (n - 1 - k) * 7)
    const b = new Date(a); b.setDate(a.getDate() + 7)
    const from = iso(a), to = iso(b)
    return { from, n: all.filter(s => s.date >= from && s.date < to).length, label: a.getDate() + '.' + String(a.getMonth() + 1).padStart(2, '0'), now: k === n - 1 }
  })
}
// overall strength trend: every workout (all plans) vs each exercise's first workout, averaged over the last 4 workouts
export function strengthTrend(max = 16) {
  const first = {}, per = []
  for (const s of sorted().filter(s => ticked(s) && !s.deload).reverse()) {
    const rel = []
    for (const g of entriesOf(s.day, s)) {
      const v = bestValue(g, s.ex?.[g.key])
      if (v == null) continue
      if (first[g.key] == null) first[g.key] = v
      rel.push(isAssisted(g) ? (v > 0 ? first[g.key] / v : 1) : (first[g.key] > 0 ? v / first[g.key] : 1))
    }
    if (rel.length) per.push(rel.reduce((a, b) => a + b, 0) / rel.length * 100)
  }
  const roll = per.map((_, i) => { const w = per.slice(Math.max(0, i - 3), i + 1); return w.reduce((a, b) => a + b, 0) / w.length })
  return roll.slice(-max)
}

// period stats, days = null → all time
export function overview(days = null) {
  const cut = days ? daysAgoIso(days) : ''
  const list = sorted().filter(s => s.date >= cut && ticked(s))
  return { workouts: list.length, sets: list.reduce((a, s) => a + setsOf(s), 0), vol: list.reduce((a, s) => a + volumeOf(s), 0), prs: prEvents(null, days) }
}

// sets per muscle (main = 1, helping = ½): all time when days = null
export function muscleSets(days = null) {
  const cut = days ? daysAgoIso(days) : '', out = {}
  for (const s of sorted()) {
    if (s.date < cut) continue
    const perEx = {}
    for (const [k, arr] of Object.entries(s.ex || {})) {
      const base = k.split(' · ')[0], n = arr.filter(x => x.d && x.t !== 'w').length
      perEx[base] = Math.max(perEx[base] || 0, n)
    }
    for (const [base, n] of Object.entries(perEx)) {
      const m = musclesOf(base)
      m.main.forEach(x => (out[x] = (out[x] || 0) + n))
      m.help.forEach(x => (out[x] = (out[x] || 0) + n / 2))
    }
  }
  return out
}
// distinct plans (Push, Pull…) trained at least once, all time
export const plansDone = (days = null) => { const cut = days ? daysAgoIso(days) : ''; return new Set(sorted().filter(s => s.date >= cut && ticked(s) && !PLAN[s.day]?.hidden).map(s => s.day)).size }

// sets per muscle per week in a period (days = null → all time)
export function muscleWeek(days = null) {
  const out = muscleSets(days)
  // average over the weeks actually trained (a new user with 2 weeks of data is not divided by 4)
  const first = sorted().filter(ticked).map(s => s.date).sort()[0]
  const span = first ? Math.ceil((Date.now() - new Date(first + 'T00:00').getTime()) / 864e5 + 1) : days
  const weeks = Math.max(1, (days ? Math.min(days, span) : span) / 7)
  return Object.fromEntries(Object.entries(out).map(([k, v]) => [k, Math.round(v / weeks * 10) / 10]))
}

export const fmtTon = v => (v >= 10000 ? (Math.round(v / 100) / 10).toFixed(1).replace('.', ',') + ' t' : Math.round(v).toLocaleString('pl-PL') + ' kg')

// sets per muscle in one week of the plan (same weighting as muscleSets: main 1, helping ½)
export function planMuscleSets() {
  const out = {}
  PLAN.forEach((p, d) => {
    if (p.hidden) return
    const perEx = {}
    entriesOf(d).forEach(g => (perEx[g.name] = Math.max(perEx[g.name] || 0, g.sets || 0)))
    for (const [base, n] of Object.entries(perEx)) {
      const m = musclesOf(base)
      m.main.forEach(x => (out[x] = (out[x] || 0) + n))
      m.help.forEach(x => (out[x] = (out[x] || 0) + n / 2))
    }
  })
  return out
}
// weeks in a row (Mon–Sun) with at least one training; the current week only adds once it has one (it never breaks the streak)
export function weekStreak() {
  const w = weekly(104)
  let n = 0, i = w.length - 1
  if (w[i].n) n++
  for (i--; i >= 0 && w[i].n; i--) n++
  return n
}
