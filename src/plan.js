export const PLAN = [
  { key: 'push', abbr: 'Pu', short: 'Pn', name: 'Push', note: 'Najpierw najcięższe wyciskanie.', ex: [
    ['Wyciskanie płasko', '3 × 6-10'], ['Wyciskanie hantli na skosie dodatnim', '3 × 8-10'], ['Rozpiętki na bramie', '3 × 12-15'],
    ['Wznosy bokiem (hantle)', '4 × 12-15'], ['Francuskie', '3 × 8-12'], ['Triceps na wyciągu (opcjonalnie)', '2 × 12-15']] },
  { key: 'pull', abbr: 'Pl', short: 'Wt', name: 'Pull', note: 'Wolny ciężar przed T-barem.', ex: [
    ['Nauka podciągania', 'Wiszenie + negatywy', null, [
      { label: 'Wiszenie', unit: 's', target: '3 × 20-30 s', sets: 3 },
      { label: 'Negatywy', unit: 'reps', target: '3 × 3-5', sets: 3 }]], ['Wiosłowanie hantlem z podparciem', '3 × 8-10 / stronę'],
    ['T-bar row', '3 × 8-10'], ['Face pully', '3-4 × 15-20'], ['Szrugsy', '3 × 10-15'], ['Spider curl', '3 × 10-12'],
    ['Unoszenie nóg na poręczach (captain’s chair)', '3 × 10-15', null, 'reps'], ['Allahy (brzuch na wyciągu)', '3 × 12-15']] },
  { key: 'legs', abbr: 'Ng', short: 'Cz', name: 'Nogi', note: '', ex: [
    ['Rumuński martwy ciąg', '3 × 8-10'], ['Przysiad Zercher', '3 × 6-10'], ['Prostowanie nóg (maszyna)', '3 × 10-15'],
    ['Uginanie nóg (maszyna)', '3 × 10-15'], ['Łydki siedząc (maszyna)', '4 × 12-20'],
    ['Hammer press (maszyna)', '3 × 8-12'],
    ['Unoszenie nóg na poręczach (captain’s chair)', '3 × 10-15', null, 'reps'], ['Allahy (brzuch na wyciągu)', '3 × 12-15']] },
  { key: 'chestback', abbr: 'Up', short: 'Pt', name: 'Upper', note: 'Superserie: 1+2, 3+4, 5+6.', ex: [
    ['Podciąganie nachwytem (wspomagane)', '3 × 4-6', 'Plecy'], ['Wyciskanie sztangi nad głowę', '3 × 8-12', 'Klatka'],
    ['Seal row', '3 × 8-12', 'Plecy'], ['Wyciskanie na Smithcie na skosie', '3 × 8-12', 'Klatka'],
    ['Wyciąg górny szeroki', '3 × 10-12', 'Plecy'], ['Butterfly', '3 × 12-15', 'Klatka'], ['Triceps + biceps', '2 × 12-15 każdy', 'Ręce']] }
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
