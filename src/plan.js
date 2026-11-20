export const PLAN = [
  { key: 'push', abbr: 'Pu', short: 'Pn', name: 'Push', note: 'Najpierw najcięższe wyciskanie.', ex: [
    ['Wyciskanie sztangi na ławce płaskiej', '3 × 6-8'], ['Wyciskanie hantli na ławce skośnej', '3 × 8-10'], ['Rozpiętki na bramie', '3 × 10-15'],
    ['Unoszenie hantli bokiem', '4 × 10-15'], ['Wyciskanie francuskie leżąc', '3 × 8-10'], ['Prostowanie ramion na wyciągu nad głową', '3 × 10-12']] },
  { key: 'pull', abbr: 'Pl', short: 'Wt', name: 'Pull', note: 'Wolny ciężar przed T-barem.', ex: [
    ['Nauka podciągania', 'Wiszenie + negatywy', null, [
      { label: 'Wiszenie', unit: 's', target: '3 × 20-30 s', sets: 3 },
      { label: 'Negatywy', unit: 'reps', target: '3 × 3-5', sets: 3 }]], ['Wiosłowanie hantlem jednorącz z podparciem', '3 × 8-10 / stronę'],
    ['Wiosłowanie sztangą T (T-bar)', '3 × 8-10'], ['Face pull na wyciągu', '3 × 12-15'], ['Uginanie ramion z hantlami na ławce skośnej', '3 × 8-12'],
    ['Unoszenie nóg w podporze na poręczach', '3 × 10-15', null, 'reps'], ['Allahy – spięcia brzucha na wyciągu', '3 × 12-15']] },
  { key: 'legs', abbr: 'Ng', short: 'Cz', name: 'Nogi', note: 'Najpierw przysiad Zerchera – najcięższy, na świeżo.', ex: [
    ['Przysiad Zerchera', '3 × 6-8'], ['Martwy ciąg rumuński', '3 × 8-10'], ['Prostowanie nóg na maszynie', '3 × 10-12'],
    ['Uginanie nóg na maszynie', '3 × 10-12'], ['Wspięcia na palce siedząc', '4 × 12-15'],
    ['Pallof press na wyciągu', '3 × 10-12 / stronę, 2 s pauza'],
    ['Unoszenie nóg w podporze na poręczach', '3 × 10-15', null, 'reps'], ['Allahy – spięcia brzucha na wyciągu', '3 × 12-15']] },
  { key: 'chestback', abbr: 'Up', short: 'Pt', name: 'Upper', note: 'Superserie: 1+2, 3+4, 5+6. Odwrotne rozpiętki zaraz po butterfly – ta sama maszyna. Na koniec unoszenie bokiem na wyciągu.', ex: [
    ['Podciąganie nachwytem (wspomagane)', '3 × 6-8', 'Plecy'], ['Wyciskanie sztangi siedząc z oparciem', '3 × 6-8', 'Barki'],
    ['Seal row – wiosłowanie leżąc na ławce', '3 × 8-10', 'Plecy'], ['Wyciskanie na skosie na Smithie', '3 × 8-10', 'Klatka'],
    ['Ściąganie drążka szerokim chwytem', '3 × 8-10', 'Plecy'], ['Rozpiętki na maszynie (butterfly)', '3 × 10-15', 'Klatka'],
    ['Odwrotne rozpiętki na maszynie (reverse butterfly)', '3 × 12-15', 'Tył barków'], ['Triceps + biceps na wyciągu', '2 × 12-15 każdy', 'Ręce'], ['Unoszenie ramienia bokiem na wyciągu', '3 × 10-15 / stronę', 'Boki barków']] }
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
  'Martwy ciąg rumuński': 5,
  'Wyciskanie hantli na ławce skośnej': 2, 'Wiosłowanie hantlem jednorącz z podparciem': 2,
  'Unoszenie hantli bokiem': 1, 'Unoszenie ramienia bokiem na wyciągu': 1.25, 'Uginanie ramion z hantlami na ławce skośnej': 1
}
// machines where the kg number is help (less = harder)
export const ASSISTED = new Set(['Podciąganie nachwytem (wspomagane)'])
// what to do when a bodyweight/time exercise tops out
export const HARDER = {
  'Unoszenie nóg w podporze na poręczach': 'proste nogi albo hantelek między stopami',
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

// exercises renamed later: old stored name → current name (history keeps working)
export const RENAMED = {
  'Wyciskanie płasko': 'Wyciskanie sztangi na ławce płaskiej',
  'Wyciskanie hantli na skosie dodatnim': 'Wyciskanie hantli na ławce skośnej',
  'Wznosy bokiem (hantle)': 'Unoszenie hantli bokiem',
  'Francuskie': 'Wyciskanie francuskie leżąc',
  'Wiosłowanie hantlem z podparciem': 'Wiosłowanie hantlem jednorącz z podparciem',
  'T-bar row': 'Wiosłowanie sztangą T (T-bar)',
  'Face pully': 'Face pull na wyciągu',
  'Uginanie na ławce skośnej (hantle)': 'Uginanie ramion z hantlami na ławce skośnej',
  'Unoszenie nóg na poręczach (captain’s chair)': 'Unoszenie nóg w podporze na poręczach',
  'Allahy (brzuch na wyciągu)': 'Allahy – spięcia brzucha na wyciągu',
  'Rumuński martwy ciąg': 'Martwy ciąg rumuński',
  'Przysiad Zercher': 'Przysiad Zerchera',
  'Prostowanie nóg (maszyna)': 'Prostowanie nóg na maszynie',
  'Uginanie nóg (maszyna)': 'Uginanie nóg na maszynie',
  'Łydki siedząc (maszyna)': 'Wspięcia na palce siedząc',
  'Pallof press (wyciąg, bokiem)': 'Pallof press na wyciągu',
  'Wyciskanie sztangi nad głowę': 'Wyciskanie sztangi siedząc z oparciem',
  'Seal row': 'Seal row – wiosłowanie leżąc na ławce',
  'Wyciskanie na Smithcie na skosie': 'Wyciskanie na skosie na Smithie',
  'Wyciąg górny szeroki': 'Ściąganie drążka szerokim chwytem',
  'Butterfly': 'Rozpiętki na maszynie (butterfly)',
  'Triceps + biceps': 'Triceps + biceps na wyciągu',
  'Wyciskanie na Smithcie na skosie': 'Wyciskanie na skosie na Smithie'
}
// rename the exercise keys of one stored workout in place ("Old · Part" → "New · Part"); returns true if changed
export function migrateNames(s) {
  let changed = false
  for (const key of Object.keys(s?.ex || {})) {
    const [base, ...part] = key.split(' · ')
    const to = RENAMED[base]
    if (!to) continue
    const nk = [to, ...part].join(' · ')
    if (!s.ex[nk]?.length) s.ex[nk] = s.ex[key]
    delete s.ex[key]
    changed = true
  }
  return changed
}
