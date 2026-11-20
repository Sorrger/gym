export const PLAN = [
  { key: 'push', abbr: 'Pu', short: 'Pn', name: 'Push', note: 'Najpierw najcięższe wyciskanie.', ex: [
    ['Wyciskanie płasko', '3 × 6-8'], ['Wyciskanie hantli na skosie dodatnim', '3 × 8-10'], ['Rozpiętki na bramie', '3 × 10-15'],
    ['Wznosy bokiem (hantle)', '4 × 10-15'], ['Francuskie', '3 × 8-10'], ['Triceps na wyciągu (opcjonalnie)', '2 × 10-12']] },
  { key: 'pull', abbr: 'Pl', short: 'Wt', name: 'Pull', note: 'Wolny ciężar przed T-barem.', ex: [
    ['Nauka podciągania', 'Wiszenie + negatywy', null, [
      { label: 'Wiszenie', unit: 's', target: '3 × 20-30 s', sets: 3 },
      { label: 'Negatywy', unit: 'reps', target: '3 × 3-5', sets: 3 }]], ['Wiosłowanie hantlem z podparciem', '3 × 8-10 / stronę'],
    ['T-bar row', '3 × 8-10'], ['Face pully', '3 × 12-15'], ['Szrugsy', '3 × 10-12'], ['Uginanie na ławce skośnej (hantle)', '3 × 8-12'],
    ['Unoszenie nóg na poręczach (captain’s chair)', '3 × 10-15', null, 'reps'], ['Allahy (brzuch na wyciągu)', '3 × 12-15']] },
  { key: 'legs', abbr: 'Ng', short: 'Cz', name: 'Nogi', note: '', ex: [
    ['Rumuński martwy ciąg', '3 × 8-10'], ['Przysiad Zercher', '3 × 6-8'], ['Prostowanie nóg (maszyna)', '3 × 10-12'],
    ['Uginanie nóg (maszyna)', '3 × 10-12'], ['Łydki siedząc (maszyna)', '4 × 12-15'],
    ['Pallof press (wyciąg, bokiem)', '3 × 10-12 / stronę, 2 s pauza'],
    ['Unoszenie nóg na poręczach (captain’s chair)', '3 × 10-15', null, 'reps'], ['Allahy (brzuch na wyciągu)', '3 × 12-15']] },
  { key: 'chestback', abbr: 'Up', short: 'Pt', name: 'Upper', note: 'Superserie: 1+2, 3+4, 5+6.', ex: [
    ['Podciąganie nachwytem (wspomagane)', '3 × 6-8', 'Plecy'], ['Wyciskanie sztangi nad głowę', '3 × 6-8', 'Barki'],
    ['Seal row', '3 × 8-10', 'Plecy'], ['Wyciskanie na Smithcie na skosie', '3 × 8-10', 'Klatka'],
    ['Wyciąg górny szeroki', '3 × 8-10', 'Plecy'], ['Butterfly', '3 × 10-15', 'Klatka'], ['Triceps + biceps', '2 × 12-15 każdy', 'Ręce']] }
]
export const COLORS = { push: '#ff5a4f', pull: '#2f8cff', legs: '#22b864', chestback: '#ff9500' }
// the user's week: Mon Push, Tue Pull, Thu Legs, Fri Upper (JS getDay: 0 = Sunday)
export const WEEKDAY_TO_DAY = { 1: 0, 2: 1, 4: 2, 5: 3 }
export function nSets(t) { const m = t.match(/^(\d+)(?:-(\d+))?/); return m ? +(m[2] || m[1]) : 3 }

// Units: most exercises are weight in kg; some parts are time (s) or reps.
export const UNITS = {
  kg: { step: 2.5, max: 300, frac: true, short: 'kg', best: 'Najcięższa seria (kg)' },
  s: { step: 5, max: 300, frac: false, short: 's', best: 'Najdłuższe wiszenie (s)' },
  reps: { step: 1, max: 50, frac: false, short: 'powt.', best: 'Najwięcej powtórzeń' }
}
// weight exercises also log reps per set; 6 unless changed (then the last value is remembered)
export const DEF_REPS = 6

// progressive overload (double progression): rep range from the target ("3 × 6-8" → 6..8)
export function rangeOf(target) {
  const m = String(target || '').match(/×\s*(\d+)(?:\s*-\s*(\d+))?/)
  return m ? { lo: +m[1], hi: +(m[2] || m[1]) } : null
}
// how much to add when every set reached the top of the range (default 2,5 kg)
export const INC = {
  'Rumuński martwy ciąg': 5,
  'Wyciskanie hantli na skosie dodatnim': 2, 'Wiosłowanie hantlem z podparciem': 2,
  'Wznosy bokiem (hantle)': 1, 'Uginanie na ławce skośnej (hantle)': 1
}
// machines where the kg number is help (less = harder)
export const ASSISTED = new Set(['Podciąganie nachwytem (wspomagane)'])
// what to do when a bodyweight/time exercise tops out
export const HARDER = {
  'Unoszenie nóg na poręczach (captain’s chair)': 'proste nogi albo hantelek między stopami',
  'Nauka podciągania · Wiszenie': 'zostań na 30 s i dołóż 1 negatyw',
  'Nauka podciągania · Negatywy': 'spróbuj 1 pełnego podciągnięcia na początku'
}

export function fmtNum(v) { return v == null ? '–' : String(+(+v).toFixed(2)).replace('.', ',') }
export function fmtVal(v, unit = 'kg') { return fmtNum(v) + ' ' + UNITS[unit].short }

// An exercise may be made of parts with their own sets (e.g. Nauka podciągania = Wiszenie + Negatywy).
// A plain exercise may name its unit instead of parts: [name, target, tag, 'reps'].
// Each part is stored under its own key "Name · Part"; a plain exercise is stored under its name.
export function groupsOf(ex) {
  const [name, target, , parts] = ex
  if (typeof parts === 'string') return [{ key: name, name, label: null, unit: parts, target, sets: nSets(target) }]
  return parts
    ? parts.map(p => ({ key: name + ' · ' + p.label, name, label: p.label, unit: p.unit, target: p.target, sets: p.sets }))
    : [{ key: name, name, label: null, unit: 'kg', target, sets: nSets(target) }]
}
export function entriesOf(day) { return PLAN[day].ex.flatMap((ex, i) => groupsOf(ex).map(g => ({ ...g, ex: i }))) }
