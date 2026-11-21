export const PLAN = [
  { key: 'push', abbr: 'Pu', short: 'Pn', name: 'Push', note: 'Najpierw najcięższe wyciskanie. Rozpiętki z dołu do góry: wyciągi nisko, ręce łukiem do wysokości brody – góra klatki.', ex: [
    ['Wyciskanie sztangi na ławce płaskiej', '3 × 6-8'], ['Wyciskanie hantli na ławce skośnej', '4 × 8-10'], ['Rozpiętki na bramie z dołu do góry', '3 × 10-15'],
    ['Unoszenie hantli bokiem', '4 × 10-15'], ['Wyciskanie francuskie leżąc', '3 × 8-10'], ['Prostowanie ramion na wyciągu nad głową', '3 × 10-12']] },
  { key: 'pull', abbr: 'Pl', short: 'Wt', name: 'Pull', note: 'Najpierw hantel (wolny ciężar), potem wyciągi. Wiosłowanie na wyciągu: szeroki drążek nachwytem, łokcie ok. 45–60° od tułowia, ściągaj łopatki – góra pleców. Młotki od razu po uginaniu na skosie.', ex: [
    ['Nauka podciągania', null, null, 'stages'], ['Wiosłowanie hantlem jednorącz z podparciem', '3 × 8-10 / stronę'],
    ['Wiosłowanie na wyciągu dolnym szerokim chwytem', '3 × 8-10'], ['Ściąganie drążka szerokim chwytem', '3 × 8-10'], ['Face pull na wyciągu', '3 × 12-15'], ['Uginanie ramion z hantlami na ławce skośnej', '3 × 8-12'], ['Uginanie ramion z hantlami chwytem młotkowym', '2 × 10-12'],
    ['Unoszenie nóg w podporze na poręczach', '3 × 10-15', null, 'reps'], ['Allahy – spięcia brzucha na wyciągu', '3 × 12-15']] },
  { key: 'legs', abbr: 'Ng', short: 'Cz', name: 'Nogi', note: 'Najpierw przysiad Zerchera – najcięższy, na świeżo.', ex: [
    ['Przysiad Zerchera', '3 × 6-8'], ['Martwy ciąg rumuński', '3 × 8-10'], ['Prostowanie nóg na maszynie', '3 × 10-12'],
    ['Uginanie nóg siedząc na maszynie', '3 × 10-12'], ['Wspięcia na palce stojąc', '2 × 12-15'], ['Wspięcia na palce siedząc', '2 × 12-15'],
    ['Pallof press na wyciągu', '3 × 10-12 / stronę, 2 s pauza'],
    ['Unoszenie nóg w podporze na poręczach', '3 × 10-15', null, 'reps'], ['Allahy – spięcia brzucha na wyciągu', '3 × 12-15']] },
  { key: 'chestback', abbr: 'Up', short: 'Pt', name: 'Upper', note: 'Superserie: 1+2, 3+4, 5+6. Odwrotne rozpiętki zaraz po butterfly – ta sama maszyna. Na koniec unoszenie bokiem na wyciągu.', ex: [
    ['Nauka podciągania', null, 'Plecy', 'stages'], ['Wyciskanie sztangi siedząc z oparciem', '3 × 6-8', 'Barki'],
    ['Seal row – wiosłowanie leżąc na ławce', '3 × 8-10', 'Plecy'], ['Wyciskanie na skosie na Smithie', '4 × 8-10', 'Klatka'],
    ['Ściąganie drążka szerokim chwytem', '3 × 8-10', 'Plecy'], ['Rozpiętki na maszynie (butterfly)', '3 × 10-15', 'Klatka'],
    ['Odwrotne rozpiętki na maszynie (reverse butterfly)', '3 × 12-15', 'Tył barków'], ['Unoszenie ramienia bokiem na wyciągu', '3 × 10-15 / stronę', 'Boki barków']] }
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
  'Nauka podciągania · Ze wspomaganiem': 5,
  'Unoszenie hantli bokiem': 1, 'Unoszenie ramienia bokiem na wyciągu': 1.25, 'Uginanie ramion z hantlami na ławce skośnej': 1, 'Uginanie ramion z hantlami chwytem młotkowym': 1
}
// machines where the kg number is help (less = harder)
export const ASSISTED = new Set(['Podciąganie nachwytem (wspomagane)', 'Nauka podciągania · Ze wspomaganiem'])
export const isAssisted = g => ASSISTED.has(g.key) || ASSISTED.has(g.name)
export const incOf = g => INC[g.key] || INC[g.name] || 2.5
// what to do when a bodyweight/time exercise tops out
export const HARDER = {
  'Unoszenie nóg w podporze na poręczach': 'proste nogi albo hantelek między stopami',
  'Nauka podciągania · Wiszenie': 'zostań na 30 s. Gdy w jednym treningu zrobisz 3 × 30 s wiszenia i 3 × 5 negatywów, apka sama przejdzie na etap 2 (maszyna ze wspomaganiem)',
  'Nauka podciągania · Negatywy@1': 'schodź wolniej (5 s). Gdy w jednym treningu zrobisz też 3 × 30 s wiszenia, apka sama przejdzie na etap 2 (maszyna ze wspomaganiem)',
  'Nauka podciągania · Negatywy@2': 'schodź wolniej (5 s)',
  'Nauka podciągania · Negatywy@3': 'schodź wolniej (5 s)',
  'Nauka podciągania · Pełne@3': 'masz 3 × 3 – apka sama przejdzie na etap 4 (samo podciąganie, 3-6 powtórzeń)',
  'Nauka podciągania · Pełne@4': 'dołóż obciążenie (hantel między stopami / pas) i wróć do 3 powtórzeń'
}

// warm-up sets before heavy barbell lifts (only shown on screen, never saved – so they never count in stats)
export const WARMUP = { 'Wyciskanie sztangi na ławce płaskiej': 20, 'Przysiad Zerchera': 20, 'Wyciskanie sztangi siedząc z oparciem': 20, 'Martwy ciąg rumuński': 20 }
const PLATES = [25, 20, 15, 10, 5, 2.5, 1.25]
export function warmupSets(W, bar = 20) {
  if (!(W > bar)) return []
  const out = [{ w: bar, r: 10 }]
  for (const [p, r] of [[0.5, 8], [0.7, 5], [0.85, 2]]) {
    const w = Math.round((W * p) / 2.5) * 2.5
    if (w > out[out.length - 1].w && w < W) out.push({ w, r })
  }
  return out.map(x => ({ ...x, plates: platesPerSide(x.w, bar) }))
}
export function platesPerSide(w, bar = 20) {
  let side = Math.round(((w - bar) / 2) * 100) / 100
  const out = []
  for (const p of PLATES) while (side >= p - 1e-9) { out.push(p); side = Math.round((side - p) * 100) / 100 }
  return out
}

// Pull-up learning goes through stages; the app moves to the next one by itself when the goal is met
// (looked up from the workout history, so it follows the backup to a new phone).
export const PULLUP = 'Nauka podciągania'
export const PULLUP_STAGES = [
  { n: 1, title: 'Wiszenie + negatywy', goal: '3 × 30 s wiszenia i 3 × 5 negatywów w jednym treningu', parts: [
    { label: 'Wiszenie', unit: 's', target: '3 × 20-30 s', sets: 3 },
    { label: 'Negatywy', unit: 'reps', target: '3 × 3-5', sets: 3 }] },
  { n: 2, title: 'Ze wspomaganiem + negatywy', goal: '3 × 8 na maszynie z pomocą 15 kg lub mniej', parts: [
    { label: 'Ze wspomaganiem', unit: 'kg', target: '3 × 6-8', sets: 3 },
    { label: 'Negatywy', unit: 'reps', target: '2 × 3-5', sets: 2 }] },
  { n: 3, title: 'Pierwsze pełne + negatywy', goal: '3 serie po 3 pełne podciągnięcia', parts: [
    { label: 'Pełne', unit: 'reps', target: '3 × 1-3', sets: 3 },
    { label: 'Negatywy', unit: 'reps', target: '2 × 3-5', sets: 2 }] },
  { n: 4, title: 'Podciąganie', goal: null, parts: [
    { label: 'Pełne', unit: 'reps', target: '3 × 3-6', sets: 3 }] }
]
// does this workout (one session) meet the goal of stage n?
export function stageGoalMet(n, ex) {
  const done = l => (ex?.[PULLUP + ' · ' + l] || []).filter(x => x.d && x.w != null)
  const all = (l, f) => { const d = done(l); return d.length >= 3 && d.every(f) }
  if (n === 1) return all('Wiszenie', x => x.w >= 30) && all('Negatywy', x => x.w >= 5)
  if (n === 2) return all('Ze wspomaganiem', x => x.w <= 15 && (x.r ?? 0) >= 8)
  if (n === 3) return all('Pełne', x => x.w >= 3)
  return false
}
// stage a stored workout was done in (from the parts it holds); null if it has none
export function stageOfSession(s) {
  const has = l => !!s?.ex?.[PULLUP + ' · ' + l]
  if (has('Pełne')) return has('Negatywy') ? 3 : 4
  if (has('Ze wspomaganiem')) return 2
  if (has('Wiszenie') || has('Negatywy')) return 1
  return null
}
// the current stage comes from the store (history); node scripts fall back to stage 1
let stageFn = () => 1
export function setStageFn(f) { stageFn = f }
export const currentStage = () => stageFn()

export function fmtNum(v) { return v == null ? '–' : String(+(+v).toFixed(2)).replace('.', ',') }
export function fmtVal(v, unit = 'kg') { return fmtNum(v) + ' ' + UNITS[unit].short }

// An exercise may be made of parts with their own sets (e.g. Nauka podciągania = Wiszenie + Negatywy).
// A plain exercise may name its unit instead of parts: [name, target, tag, 'reps'].
// Each part is stored under its own key "Name · Part"; a plain exercise is stored under its name.
// ctx: a stored workout (its own stage), 'all' (every part reached so far – for progress/history), or nothing (current stage)
function stagedParts(ctx) {
  const cur = currentStage()
  if (ctx === 'all') {
    const m = new Map()
    PULLUP_STAGES.filter(st => st.n <= cur).forEach(st => st.parts.forEach(p => m.set(p.label, { ...p, stage: st.n })))
    return [...m.values()]
  }
  const n = (ctx && stageOfSession(ctx)) || cur
  return PULLUP_STAGES[n - 1].parts.map(p => ({ ...p, stage: n }))
}
export function stageOf(ctx) { return (ctx && ctx !== 'all' && stageOfSession(ctx)) || currentStage() }
export function targetOf(ex, ctx) {
  if (ex[3] !== 'stages') return ex[1]
  const n = stageOf(ctx)
  return `Etap ${n}/4 · ${PULLUP_STAGES[n - 1].title.toLowerCase()}`
}
export function groupsOf(ex, ctx) {
  const [name, target, , parts] = ex
  if (parts === 'stages') return stagedParts(ctx).map(p => ({ key: name + ' · ' + p.label, name, label: p.label, unit: p.unit, target: p.target, sets: p.sets, stage: p.stage }))
  if (typeof parts === 'string') return [{ key: name, name, label: null, unit: parts, target, sets: nSets(target) }]
  return parts
    ? parts.map(p => ({ key: name + ' · ' + p.label, name, label: p.label, unit: p.unit, target: p.target, sets: p.sets }))
    : [{ key: name, name, label: null, unit: 'kg', target, sets: nSets(target) }]
}
export function entriesOf(day, ctx) { return PLAN[day].ex.flatMap((ex, i) => groupsOf(ex, ctx).map(g => ({ ...g, ex: i }))) }

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
  'Uginanie nóg (maszyna)': 'Uginanie nóg siedząc na maszynie',
  'Uginanie nóg na maszynie': 'Uginanie nóg siedząc na maszynie',
  'Łydki siedząc (maszyna)': 'Wspięcia na palce siedząc',
  'Pallof press (wyciąg, bokiem)': 'Pallof press na wyciągu',
  'Wyciskanie sztangi nad głowę': 'Wyciskanie sztangi siedząc z oparciem',
  'Seal row': 'Seal row – wiosłowanie leżąc na ławce',
  'Wyciskanie na Smithcie na skosie': 'Wyciskanie na skosie na Smithie',
  'Wyciąg górny szeroki': 'Ściąganie drążka szerokim chwytem',
  'Butterfly': 'Rozpiętki na maszynie (butterfly)',
  'Triceps + biceps': 'Triceps + biceps na wyciągu'
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
