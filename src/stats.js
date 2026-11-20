// Numbers for the Progress tab (overview + per plan)
import { PLAN, ASSISTED, entriesOf } from './plan'
import { sorted, series } from './store'
import { musclesOf } from './muscles'

const ticked = s => Object.values(s.ex || {}).some(a => a.some(x => x.d))
const daysAgoIso = n => { const d = new Date(Date.now() - n * 864e5); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0') }

// kg × reps of one workout (only kg exercises)
export function volumeOf(s) {
  const kg = new Set(entriesOf(s.day).filter(g => g.unit === 'kg').map(g => g.key))
  let v = 0
  for (const [k, arr] of Object.entries(s.ex || {})) if (kg.has(k)) for (const x of arr) if (x.d && x.w != null) v += x.w * (x.r || 0)
  return Math.round(v)
}
export const setsOf = s => Object.values(s.ex || {}).reduce((a, arr) => a + arr.filter(x => x.d).length, 0)

// exercises (of one plan, or all) whose best in the last `days` beat everything before
export function prCount(day = null, days = 30) {
  const cut = daysAgoIso(days)
  const days_ = day == null ? PLAN.map((_, i) => i) : [day]
  let n = 0
  for (const d of days_) for (const g of entriesOf(d)) {
    const pts = series(g.key), old = pts.filter(p => p.date < cut), rec = pts.filter(p => p.date >= cut)
    if (!old.length || !rec.length) continue
    const as = ASSISTED.has(g.name)
    if (as ? Math.min(...rec.map(p => p.w)) < Math.min(...old.map(p => p.w)) : Math.max(...rec.map(p => p.w)) > Math.max(...old.map(p => p.w))) n++
  }
  return n
}

export function planSummary(day) {
  const list = sorted().filter(s => s.day === day && ticked(s))
  const vols = list.slice(0, 8).map(volumeOf).reverse()
  const n = vols.length, hi = Math.max(1, ...vols)
  return { last: list[0] || null, count: list.length, prs: prCount(day, 30), vol: n ? vols[n - 1] : 0,
    volDiff: n > 1 && vols[n - 2] ? Math.round((vols[n - 1] / vols[n - 2] - 1) * 100) : null,
    bars: vols.map(v => Math.max(6, Math.round(v / hi * 100))) }
}

// last 4 weeks, all plans
export function overview(days = 28) {
  const cut = daysAgoIso(days)
  const list = sorted().filter(s => s.date >= cut && ticked(s))
  return { workouts: list.length, sets: list.reduce((a, s) => a + setsOf(s), 0), vol: list.reduce((a, s) => a + volumeOf(s), 0), prs: prCount(null, days) }
}

// sets per muscle per week (main = 1, helping = ½), averaged over the last 4 weeks
export function muscleWeek(days = 28) {
  const cut = daysAgoIso(days), out = {}
  for (const s of sorted()) {
    if (s.date < cut) continue
    const perEx = {}
    for (const [k, arr] of Object.entries(s.ex || {})) {
      const base = k.split(' · ')[0], n = arr.filter(x => x.d).length
      perEx[base] = Math.max(perEx[base] || 0, n) // multi-part exercises count once
    }
    for (const [base, n] of Object.entries(perEx)) {
      const m = musclesOf(base)
      m.main.forEach(x => (out[x] = (out[x] || 0) + n))
      m.help.forEach(x => (out[x] = (out[x] || 0) + n / 2))
    }
  }
  // average over the weeks actually trained (a new user with 2 weeks of data is not divided by 4)
  const first = sorted().filter(ticked).map(s => s.date).sort()[0]
  const span = first ? Math.ceil((Date.now() - new Date(first + 'T00:00').getTime()) / 864e5 + 1) : days
  const weeks = Math.max(1, Math.min(days, span) / 7)
  return Object.fromEntries(Object.entries(out).map(([k, v]) => [k, Math.round(v / weeks * 10) / 10]))
}

export const fmtTon = v => (v >= 10000 ? (Math.round(v / 100) / 10).toFixed(1).replace('.', ',') + ' t' : Math.round(v).toLocaleString('pl-PL') + ' kg')
