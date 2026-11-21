// Progression hints (double progression). Work in a rep range, e.g. 6-8:
// • every planned set reached the top (8) at the same weight → add weight, start again at the bottom (6)
// • otherwise stay on the weight and beat last time by 1 rep per set (up to the top)
// • two workouts in a row below the bottom of the range at that weight → go ~10 % lighter and build back up
import { UNITS, INC, ASSISTED, HARDER, rangeOf, fmtNum } from './plan'
import { sorted } from './store'

const roundTo = (v, st) => Math.round(v / st) * st
const repsWord = n => (n === 1 ? 'powtórzenie' : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 12 || n % 100 > 14) ? 'powtórzenia' : 'powtórzeń')

// done sets of this exercise in earlier workouts, newest first
function history(key, session, max = 3) {
  const out = []
  for (const o of sorted()) {
    if (o.id === session.id || o.date > session.date || (o.date === session.date && o.started >= session.started)) continue
    const done = (o.ex?.[key] || []).filter(x => x.d && x.w != null)
    if (done.length) out.push({ date: o.date, sets: done })
    if (out.length >= max) break
  }
  return out
}

export function suggest(g, session) {
  const range = rangeOf(g.target)
  if (!range) return null
  const hist = history(g.key, session)
  const { lo, hi } = range
  if (!hist.length) return { kind: 'first', short: `Zakres ${lo}-${hi}`, text: `Pierwszy raz: dobierz ciężar tak, żeby zrobić ${lo}-${hi} ${repsWord(hi)} w każdej serii.` }
  const last = hist[0].sets
  const n = g.sets

  if (g.unit !== 'kg') {
    const unit = UNITS[g.unit].short, plus = g.unit === 's' ? 5 : 1
    const vals = last.map(x => x.w)
    const top = vals.length >= n && vals.every(v => v >= hi)
    if (top) {
      const how = HARDER[g.key] || HARDER[g.name]
      return { kind: 'up', title: 'Masz cały zakres! 💪', short: how ? 'Utrudnij' : `${hi} ${unit}`,
        text: `Ostatnio: ${vals.join(', ')} ${unit} – wszystkie serie na górze zakresu (${lo}-${hi}).` + (how ? ` Czas utrudnić: ${how}.` : ''), sets: null }
    }
    const target = Array.from({ length: n }, (_, i) => Math.min(hi, Math.max(lo, (vals[i] ?? vals[vals.length - 1]) + plus)))
    return { kind: 'same', title: 'Więcej niż ostatnio', short: target.join(', ') + ' ' + unit,
      text: `Ostatnio: ${vals.join(', ')} ${unit}${unit.endsWith('.') ? '' : '.'} Dziś celuj w ${target.join(', ')} ${unit}${unit.endsWith('.') ? '' : '.'}`, sets: target.map(w => ({ w })) }
  }

  const inc = INC[g.name] || 2.5, assist = ASSISTED.has(g.name)
  const W = assist ? Math.min(...last.map(x => x.w)) : Math.max(...last.map(x => x.w))
  const work = last.filter(x => x.w === W)
  // workouts saved before reps were tracked have no reps: don't guess (it could wrongly say "go lighter")
  if (work.every(x => x.r == null)) {
    return { kind: 'same', title: 'Licz powtórzenia', short: `${fmtNum(W)} kg × ${lo}-${hi}`,
      text: `Ostatnio ${fmtNum(W)} kg (bez zapisanych powtórzeń). Zostań na tym ciężarze i wpisz, ile powtórzeń zrobisz – od następnego razu podpowiem, kiedy dodać.`,
      sets: Array.from({ length: n }, () => ({ w: W, r: lo })) }
  }
  const reps = work.map(x => x.r ?? lo)
  const lastTxt = `${fmtNum(W)} kg: ${reps.join(', ')} ${repsWord(reps[reps.length - 1])}`
  const top = work.length >= n && reps.every(r => r >= hi)
  if (top) {
    // way above the range (every set 3+ reps over the top) → a double step, otherwise one step
    const step = reps.every(r => r >= hi + 3) ? 2 * inc : inc
    const w = Math.max(0, W + (assist ? -step : step))
    return { kind: 'up', title: assist ? 'Mniej wspomagania 💪' : 'Dodaj ciężar 💪', short: `${fmtNum(w)} kg × ${lo}`,
      text: `Ostatnio ${lastTxt} – wszystkie serie na górze zakresu (${lo}-${hi}). Dziś ${fmtNum(w)} kg i celuj w ${lo}, potem z treningu na trening dochodź do ${hi}.`,
      sets: Array.from({ length: n }, () => ({ w, r: lo })) }
  }
  // stuck: two workouts in a row at this weight with a set under the bottom of the range AND no more total reps
  // than the time before (a normal 8, 7, 6 right after adding weight, then 8, 8, 7, is progress – not a reason to go lighter)
  const prev = hist[1]?.sets.filter(x => x.w === W)
  const sum = a => a.reduce((t, r) => t + (r ?? 0), 0)
  const failed = reps.some(r => r < lo) && prev?.length && prev.some(x => x.r != null && x.r < lo) &&
    sum(reps.slice(0, prev.length)) <= sum(prev.map(x => x.r).slice(0, reps.length))
  if (failed) {
    const w = assist ? W + 2 * inc : Math.max(0, roundTo(W * 0.9, inc))
    return { kind: 'down', title: 'Lżej, żeby ruszyć dalej', short: `${fmtNum(w)} kg × ${lo}`,
      text: `Dwa treningi z rzędu poniżej ${lo} powtórzeń na ${fmtNum(W)} kg. Zejdź na ${fmtNum(w)} kg, zrób ${lo}-${hi} czysto i buduj od nowa.`,
      sets: Array.from({ length: n }, () => ({ w, r: lo })) }
  }
  const target = Array.from({ length: n }, (_, i) => Math.min(hi, Math.max(lo, (reps[i] ?? reps[reps.length - 1]) + 1)))
  const left = hi * n - target.reduce((a, b) => a + b, 0)
  return { kind: 'same', title: 'Ten sam ciężar, więcej powtórzeń', short: `${fmtNum(W)} kg × ${target.join(', ')}`,
    text: `Ostatnio ${lastTxt}. Zostań na ${fmtNum(W)} kg i zrób ${target.join(', ')}. ` +
      (left > 0 ? `Gdy zrobisz ${n} × ${hi}, dodasz ${fmtNum(inc)} kg.` : `Jak się uda, następnym razem ${assist ? 'mniej wspomagania' : 'więcej kilogramów'}.`),
    sets: target.map(r => ({ w: W, r })) }
}

// put the suggested weight/reps into the sets not ticked yet (adds missing planned sets)
export function applySuggestion(arr, sug, unit) {
  if (!sug?.sets) return
  sug.sets.forEach((t, i) => {
    if (!arr[i]) arr.push(unit === 'kg' ? { w: null, r: null, d: false } : { w: null, d: false })
    if (arr[i].d) return
    arr[i].w = t.w
    if (unit === 'kg') arr[i].r = t.r
  })
}
