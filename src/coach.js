// Progression hints (double progression). Work in a rep range, e.g. 6-8:
// • every planned set reached the top (8) at the same weight → add weight, start again at the bottom (6)
// • otherwise stay on the weight and beat last time by 1 rep per set (up to the top)
// • stuck below the bottom of the range (prefs.failN workouts in a row) → go prefs.dropPct % lighter and build back up
// Optional reps in reserve per set (x.q: 0, 1, 2, 3 = "3+") refine it:
// • every set with prefs.rirUp+ left → too light: add weight now, even below the top of the range
// • per set: 0 left → same reps next time, 1-2 left → +1, 3+ left → +2 (unknown → +1)
import { UNITS, HARDER, PULLUP, PULLUP_STAGES, rangeOf, fmtNum, isAssisted, incOf, DEF_REPS, canon } from './plan'
import { sorted, deloadKg, deloadSets } from './store'
import { prefs, rirLabel, deloadWords } from './prefs'

const roundTo = (v, st) => Math.round(v / st) * st
const gain = q => (q == null ? prefs.repsGain : q >= prefs.rirUp ? prefs.repsGain + 1 : q >= 1 ? prefs.repsGain : 0)
const qTxt = sets => (sets.some(x => x.q != null) ? ` (zapas ${sets.map(x => (x.q == null ? '?' : rirLabel(x.q))).join(', ')})` : '')
const repsWord = n => (n === 1 ? 'powtórzenie' : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 12 || n % 100 > 14) ? 'powtórzenia' : 'powtórzeń')

// done sets of this exercise in earlier workouts, newest first
// unit = the exercise's unit now: sets logged with another unit (plan edited kg ↔ reps) are left out
function history(key, session, max = 3, unit = null) {
  const out = []
  for (const o of sorted()) {
    if (o.deload || o.id === session.id || o.date > session.date || (o.date === session.date && o.started >= session.started)) continue
    let done = (o.ex?.[key] || []).filter(x => x.d && x.w != null && x.t !== 'w')
    if (unit && done.length && (unit === 'kg') !== done.some(x => x.r != null)) done = []
    if (done.length) out.push({ date: o.date, sets: done })
    if (out.length >= max) break
  }
  return out
}

export function suggest(g, session) {
  const range = rangeOf(g.target)
  if (!range) return null
  const hist = history(g.key, session, Math.max(3, prefs.failN + 1), g.unit)
  const { lo, hi } = range
  if (session.deload) return deload(g, session, hist, range)
  if (!hist.length) {
    if (g.name === PULLUP && g.stage > 1) {
      const st = PULLUP_STAGES[g.stage - 1]
      const how = g.label === 'Ze wspomaganiem' ? `Na maszynie do podciągania ze wspomaganiem (przeciwwaga pod kolana) dobierz taką pomoc, żeby zrobić ${lo}-${hi} powtórzeń. Im mniej kg, tym trudniej.`
        : g.label === 'Pełne' ? `Zrób tyle pełnych podciągnięć, ile dasz radę (cel ${lo}-${hi} w serii), z pełnym zwisem na dole.` : `Cel ${lo}-${hi} w serii.`
      return { kind: 'stage', title: `Nowy etap ${st.n}/4`, short: `Etap ${st.n}/4`,
        text: `Przeszedłeś dalej: ${st.title.toLowerCase()}. ${how}` + (st.goal ? ` Następny etap, gdy zrobisz ${st.goal}.` : '') }
    }
    return { kind: 'first', short: `Zakres ${lo}-${hi}`, text: `Pierwszy raz: dobierz ciężar tak, żeby zrobić ${lo}-${hi} ${repsWord(hi)} w każdej serii.` }
  }
  const last = hist[0].sets
  const n = g.sets

  if (g.unit !== 'kg') {
    const unit = UNITS[g.unit].short, plus = g.unit === 's' ? 5 : 1
    const vals = last.map(x => x.w)
    const easy = g.unit !== 's' && last.length >= n && last.every(x => x.q != null && x.q >= prefs.rirUp && x.w >= lo)
    const top = vals.length >= n && (vals.every(v => v >= hi) || easy)
    if (top) {
      const how = HARDER[g.key + '@' + g.stage] || HARDER[g.key] || HARDER[g.name] || HARDER[canon(g.key)] || HARDER[canon(g.name)]
      return { kind: 'up', title: 'Masz cały zakres!', short: how ? 'Utrudnij' : `${hi} ${unit}`,
        text: `Ostatnio: ${vals.join(', ')} ${unit}${qTxt(last)} – ${easy && !vals.every(v => v >= hi) ? `za łatwo, w każdej serii zostało ${prefs.rirUp}+` : `wszystkie serie na górze zakresu (${lo}-${hi})`}.` + (how ? ` Czas utrudnić: ${how}.` : ''), sets: null }
    }
    const target = Array.from({ length: n }, (_, i) => {
      const v = vals[i] ?? vals[vals.length - 1], q = g.unit === 's' ? null : (last[i] ?? last[last.length - 1]).q
      return Math.min(hi, Math.max(lo, v + (g.unit === 's' ? plus : gain(q))))
    })
    return { kind: 'same', title: 'Więcej niż ostatnio', short: target.join(', ') + ' ' + unit,
      text: `Ostatnio: ${vals.join(', ')} ${unit}${unit.endsWith('.') ? '' : '.'}${qTxt(last)} Dziś celuj w ${target.join(', ')} ${unit}${unit.endsWith('.') ? '' : '.'}`, sets: target.map(w => ({ w })) }
  }

  const inc = incOf(g, prefs.stepKg), assist = isAssisted(g)
  const W = assist ? Math.min(...last.map(x => x.w)) : Math.max(...last.map(x => x.w))
  const work = last.filter(x => x.w === W)
  // workouts saved before reps were tracked have no reps: don't guess (it could wrongly say "go lighter")
  if (work.every(x => x.r == null)) {
    return { kind: 'same', title: 'Licz powtórzenia', short: `${fmtNum(W)} kg × ${lo}-${hi}`,
      text: `Ostatnio ${fmtNum(W)} kg (bez zapisanych powtórzeń). Zostań na tym ciężarze i wpisz, ile powtórzeń zrobisz – od następnego razu podpowiem, kiedy dodać.`,
      sets: Array.from({ length: n }, () => ({ w: W, r: lo })) }
  }
  const reps = work.map(x => x.r ?? lo)
  const lastTxt = `${fmtNum(W)} kg: ${reps.join(', ')} ${repsWord(reps[reps.length - 1])}${qTxt(work)}`
  const easy = work.length >= n && work.every(x => x.q != null && x.q >= prefs.rirUp && (x.r ?? 0) >= lo) // rirUp+ left in every set, at least the bottom of the range
  const top = work.length >= n && (reps.every(r => r >= hi) || easy)
  if (top) {
    // way above the range (every set 3+ reps over the top) → a double step, otherwise one step
    const step = reps.every(r => r >= hi + 3) ? 2 * inc : inc
    const w = Math.max(0, W + (assist ? -step : step))
    return { kind: 'up', title: assist ? 'Mniej wspomagania' : 'Dodaj ciężar', short: `${fmtNum(w)} kg × ${lo}`,
      text: `Ostatnio ${lastTxt} – ${!reps.every(r => r >= hi) ? `za lekko, w każdej serii zostało ${prefs.rirUp}+ powtórzeń` : `wszystkie serie na górze zakresu (${lo}-${hi})`}. Dziś ${fmtNum(w)} kg i celuj w ${lo}, potem z treningu na trening dochodź do ${hi}.`,
      sets: Array.from({ length: n }, () => ({ w, r: lo })) }
  }
  // stuck: prefs.failN workouts in a row at this weight with a set under the bottom of the range AND no more total reps
  // than the time before (a normal 8, 7, 6 right after adding weight, then 8, 8, 7, is progress – not a reason to go lighter)
  const sum = a => a.reduce((t, r) => t + (r ?? 0), 0)
  const runs = hist.slice(0, prefs.failN).map(h => h.sets.filter(x => x.w === W))
  const failed = reps.some(r => r < lo) && runs.length === prefs.failN && runs.every(a => a.length && a.some(x => x.r != null && x.r < lo)) &&
    runs.every((a, k) => !k || sum(runs[k - 1].map(x => x.r).slice(0, a.length)) <= sum(a.map(x => x.r).slice(0, runs[k - 1].length)))
  if (failed) {
    const w = assist ? W + 2 * inc : Math.max(0, Math.min(W - inc, roundTo(W * (1 - prefs.dropPct / 100), inc)))
    return { kind: 'down', title: 'Lżej, żeby ruszyć dalej', short: `${fmtNum(w)} kg × ${lo}`,
      text: `${prefs.failN === 1 ? 'Trening' : prefs.failN + ' treningi z rzędu'} poniżej ${lo} powtórzeń na ${fmtNum(W)} kg. Zejdź na ${fmtNum(w)} kg, zrób ${lo}-${hi} czysto i buduj od nowa.`,
      sets: Array.from({ length: n }, () => ({ w, r: lo })) }
  }
  const target = Array.from({ length: n }, (_, i) => {
    const x = work[i] ?? work[work.length - 1]
    return Math.min(hi, Math.max(lo, (x.r ?? lo) + gain(x.q)))
  })
  const left = hi * n - target.reduce((a, b) => a + b, 0)
  return { kind: 'same', title: 'Ten sam ciężar, więcej powtórzeń', short: `${fmtNum(W)} kg × ${target.join(', ')}`,
    text: `Ostatnio ${lastTxt}. Zostań na ${fmtNum(W)} kg i zrób ${target.join(', ')}. ` +
      (left > 0 ? `Gdy zrobisz ${n} × ${hi}, dodasz ${fmtNum(inc)} kg.` : `Jak się uda, następnym razem ${assist ? 'mniej wspomagania' : 'więcej kilogramów'}.`),
    sets: target.map(r => ({ w: W, r })) }
}

// during the workout: after a ticked set, advice for the sets still to do.
// Only for clear cases, a normal drop like 8, 7, 6 says nothing:
//  - below the range with 0 (or unknown) left → lighter (~10 %, at least one step) and the bottom of the range
//  - 3+ left at the top of the range, or 3+ reps over it → one step heavier
// Assisted machine: the other way round. Not in a deload week (it is light on purpose). Null when nothing to say
// or the remaining sets already have that weight.
export function live(g, session) {
  if (g.unit !== 'kg' || session.deload) return null
  const arr = session.ex?.[g.key] || []
  let li = -1
  arr.forEach((x, i) => { if (x.d) li = i })
  const rest = arr.filter(x => !x.d)
  const last = arr[li], range = rangeOf(g.target)
  if (!last || last.w == null || !rest.length || !range) return null
  const { lo, hi } = range, r = last.r ?? DEF_REPS, q = last.q, inc = incOf(g, prefs.stepKg), assist = isAssisted(g)
  const kg = v => fmtNum(v) + ' kg'
  if (r < lo && (q == null || q === 0)) {
    const w = assist ? last.w + inc : Math.max(0, Math.min(last.w - inc, roundTo(last.w * (1 - prefs.dropPct / 100), inc)))
    if (rest.every(x => x.w != null && (assist ? x.w >= w : x.w <= w))) return null
    return { kind: 'down', w, r: lo, short: `${kg(w)} × ${lo}`,
      text: `Za ciężko (${r} z ${lo}-${hi}). ${assist ? 'Więcej pomocy' : 'Kolejne serie'}: ${kg(w)} × ${lo}` }
  }
  if ((q != null && q >= prefs.rirUp && r >= hi) || r >= hi + 3) {
    const w = assist ? Math.max(0, last.w - inc) : last.w + inc
    if (rest.every(x => x.w != null && (assist ? x.w <= w : x.w >= w))) return null
    return { kind: 'up', w, r: lo, short: `${kg(w)} × ${lo}`,
      text: `Za lekko (${r}${q != null && q >= prefs.rirUp ? ', zapas ' + rirLabel(q) : ''}). ${assist ? 'Mniej pomocy' : 'Kolejne serie'}: ${kg(w)} × ${lo}` }
  }
  return null
}

// light week: same exercises, fewer sets and lighter (prefs.deloadHalf / deloadPct), bottom of the range, 3-4 reps left
function deload(g, session, hist, { lo }) {
  const n = deloadSets(g.sets || 1), unit = UNITS[g.unit].short
  const note = `Tydzień lżejszy (deload): ${deloadWords()}, bez dochodzenia do upadku – zostaw 3-4 powtórzenia w zapasie. Mięśnie odpoczywają, siła wraca, a w przyszłym tygodniu wracasz do normalnych ciężarów.`
  if (!hist.length) return { kind: 'deload', title: 'Tydzień lżejszy', short: `${n} × ${lo}`, note, text: `Dziś ${n} × ${lo}, lekko.` }
  const last = hist[0].sets
  if (g.unit !== 'kg') {
    const v = Math.min(lo, Math.max(...last.map(x => x.w)))
    return { kind: 'deload', title: 'Tydzień lżejszy', short: `${n} × ${v} ${unit}`, note, text: `Dziś ${n} × ${v} ${unit}${unit.endsWith('.') ? '' : '.'}`, sets: Array.from({ length: n }, () => ({ w: v })) }
  }
  const assist = isAssisted(g)
  const W = assist ? Math.min(...last.map(x => x.w)) : Math.max(...last.map(x => x.w)), w = deloadKg(W, g)
  return { kind: 'deload', title: 'Tydzień lżejszy', short: `${fmtNum(w)} kg × ${lo}`,
    note, text: `Dziś ${n} × ${lo} na ${fmtNum(w)} kg (zwykle ${fmtNum(W)} kg).`, sets: Array.from({ length: n }, () => ({ w, r: lo })) }
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
