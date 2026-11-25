// records of a workout – pure functions (no Vue), so the logic tests can check them
import { isAssisted } from '../../plan'
import { sorted } from '../../store'

const work = x => x.d && x.w != null && x.t !== 'w' // ticked, with a value, not a warm-up set

// workouts done before this one (earlier day, or earlier the same day)
export const before = s => sorted().filter(o => o.id !== s.id && (o.date < s.date || (o.date === s.date && o.started < s.started)))

// best value of a group before set `skip` of this workout (earlier workouts + sets already ticked today);
// assisted: less help = better. null = first time (not a record)
export function bestBefore(s, g, skip) {
  const vals = before(s).flatMap(o => (o.ex?.[g.key] || []).filter(work).map(x => x.w))
  if (!vals.length) return null
  ;(s.ex[g.key] || []).forEach((x, i) => { if (i !== skip && work(x)) vals.push(x.w) })
  return isAssisted(g) ? Math.min(...vals) : Math.max(...vals)
}

// per group of the workout: done?, best today, best before, record?
export function sessionRecords(s, groups) {
  const prevOnes = before(s)
  return groups.map(g => {
    const arr = s.ex[g.key] || []
    const done = arr.filter(work).map(x => x.w)
    const as = isAssisted(g)
    const prevVals = prevOnes.flatMap(o => (o.ex?.[g.key] || []).filter(work).map(x => x.w))
    const best = done.length ? (as ? Math.min(...done) : Math.max(...done)) : null
    const prev = prevVals.length ? (as ? Math.min(...prevVals) : Math.max(...prevVals)) : null
    return { ...g, done: arr.some(x => x.d), max: best, prev, as, pr: best != null && prev != null && (as ? best < prev : best > prev) }
  })
}
