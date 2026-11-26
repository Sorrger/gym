import { wu, stepU, uMax, uStep, fmtW } from './units.js'
/** @type {Training[]} */
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
// default weekdays: Mon Push, Tue Pull, Thu Legs, Fri Upper (JS getDay: 0 = Sunday)
export const WEEKDAY_TO_DAY = { 1: 0, 2: 1, 4: 2, 5: 3 }
export function nSets(t) { const m = t.match(/^(\d+)(?:-(\d+))?/); return m ? +(m[2] || m[1]) : 3 }

// Units: most exercises are weight in kg; some parts are time (s) or reps.
// ---- own plan: each phone can edit its plan (customPlan.js); PLAN above is the basic default ----
// The plan above is the default. A phone can keep its own version: { t, days: [{ name, note, ex } | null], muscles: { name: [[main],[help]] } }
// stored in IndexedDB (key `plan`) and the backup gist (gym-plan.json). applyPlan() swaps it into PLAN in place
// (everything imports the same PLAN), null = back to the default.
// any number of trainings (extra ones get keys 'p4', 'p5'…); a removed one stays as { hidden: true }
// (workouts store the plan by its index, so indices never shift), own weekdays `wd` ({ jsWeekday: index }) and
// own alternatives `alts` ({ name: [names] }). The default plan above is the basic one for everybody.
export const DEFAULT_PLAN = JSON.parse(JSON.stringify(PLAN))
const DEFAULT_WD = { ...WEEKDAY_TO_DAY }
export const PALETTE = ['#ff5a4f', '#2f8cff', '#22b864', '#ff9500', '#af52de', '#ff2d55', '#30b0c7', '#e6a700', '#5856d6', '#8e8e93']
const DEFAULT_COLORS = { ...COLORS }
export const abbrOf = name => { const w = String(name || '?').trim().split(/\s+/); return (w.length > 1 ? w[0][0] + w[1][0] : w[0].slice(0, 2)).replace(/^./, c => c.toUpperCase()) }
function blank(i) { return { key: 'p' + i, abbr: '', short: '', name: 'Trening ' + (i + 1), note: '', ex: [] } }
export function applyPlan(c) {
  const n = Math.max(DEFAULT_PLAN.length, c?.days?.length || 0, PLAN.length)
  for (let i = 0; i < n; i++) {
    const d = c?.days?.[i], def = DEFAULT_PLAN[i] || blank(i)
    const p = PLAN[i] || (PLAN[i] = /** @type {Training} */ ({}))
    p.key = def.key
    p.ex = JSON.parse(JSON.stringify(d?.ex?.length ? d.ex : def.ex))
    p.name = d?.name || def.name
    p.note = d ? (d.note ?? '') : def.note
    p.abbr = d?.name && d.name !== def.name || !def.abbr ? abbrOf(p.name) : def.abbr
    p.hidden = !!d?.hidden || (i >= DEFAULT_PLAN.length && !d)
    COLORS[p.key] = d?.color || DEFAULT_COLORS[p.key] || PALETTE[i % PALETTE.length] // own colour per training (editor)
  }
  for (const k of Object.keys(WEEKDAY_TO_DAY)) delete WEEKDAY_TO_DAY[k]
  Object.assign(WEEKDAY_TO_DAY, c?.wd || DEFAULT_WD)
  for (const k of Object.keys(WEEKDAY_TO_DAY)) if (!PLAN[WEEKDAY_TO_DAY[k]] || PLAN[WEEKDAY_TO_DAY[k]].hidden) delete WEEKDAY_TO_DAY[k]
  for (const k of Object.keys(ALT)) delete ALT[k]
  Object.assign(ALT, JSON.parse(JSON.stringify(DEFAULT_ALT)), c?.alts || {})
  for (const k of Object.keys(ALT)) if (!ALT[k]?.length) delete ALT[k]
  // the user's renames: a name that is in the plan again (or an own exercise) is a new exercise, so its old mapping is dropped
  const inUse = new Set([...PLAN.flatMap(p => p.ex.map(e => e[0])), ...Object.keys(ALT), ...Object.values(ALT).flat(), ...Object.values(c?.own || {}).map(o => o.name)])
  for (const k of Object.keys(OWN_RENAMED)) delete OWN_RENAMED[k]
  for (const [o, n] of Object.entries(c?.renamed || {})) if (o !== n && !inUse.has(o)) OWN_RENAMED[o] = n
  for (const k of Object.keys(ORIGIN)) delete ORIGIN[k]
  const targets = new Set(Object.values(OWN_RENAMED))
  for (const o of Object.keys(OWN_RENAMED)) if (!targets.has(o)) ORIGIN[resolveName(o)] = o
  for (const k of Object.keys(EX_IDS)) delete EX_IDS[k]
  Object.assign(EX_IDS, c?.ids || {})
  for (const [id, o] of Object.entries(c?.own || {})) if (o?.name && !EX_IDS[o.name]) EX_IDS[o.name] = id
}
// stable exercise ids (name → id): from the user's plan data; other names get one made from their first name,
// so renaming an exercise never changes its id. Workouts store them next to the names (session.xid).
export const EX_IDS = {}
export const slug = n => String(n).normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ł/g, 'l').replace(/Ł/g, 'L').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
export function exId(key) {
  const [b, ...part] = String(key).split(' · ')
  const id = EX_IDS[b] || EX_IDS[ORIGIN[b]] || 'x-' + slug(ORIGIN[b] || b)
  return part.length ? id + '/' + slug(part.join(' ')) : id
}
// give every exercise of a workout its id (kept when the name changes later)
export function stampIds(s) {
  let changed = false
  for (const key of Object.keys(s?.ex || {})) if (!s.xid?.[key]) { (s.xid ||= {})[key] = exId(key); changed = true }
  for (const key of Object.keys(s?.xid || {})) if (!s.ex?.[key]) { delete s.xid[key]; changed = true }
  return changed
}
// the user's own renames (old → new): their history follows (migrateNames)
export const OWN_RENAMED = {}
// current name → the name it had first; built-in tables (INC, WARMUP, HARDER, ASSISTED) are keyed by that
export const ORIGIN = {}
export function resolveName(n) {
  let x = n
  const seen = new Set()
  while (!seen.has(x) && (OWN_RENAMED[x] || RENAMED[x])) { seen.add(x); x = OWN_RENAMED[x] || RENAMED[x] }
  return x
}
export const canon = k => { const [b, ...p] = String(k ?? '').split(' · '); return ORIGIN[b] ? [ORIGIN[b], ...p].join(' · ') : k }
// a workout may point at a training this phone doesn't know (e.g. restored from another phone): add a hidden placeholder
export function ensurePlans(maxDay) { for (let i = PLAN.length; i <= maxDay; i++) { PLAN[i] = { ...blank(i), hidden: true }; if (!COLORS[PLAN[i].key]) COLORS[PLAN[i].key] = PALETTE[i % PALETTE.length] } }
// indices of the trainings shown on Start / Plan / Postępy
export const visiblePlans = () => PLAN.map((p, i) => i).filter(i => !PLAN[i].hidden)

export const UNITS = {
  kg: { get step() { return uStep() }, get max() { return uMax() }, frac: true, get short() { return wu() }, get best() { return 'Najcięższa seria (' + wu() + ')' } },
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
export const isAssisted = g => ASSISTED.has(g.key) || ASSISTED.has(g.name) || ASSISTED.has(canon(g.key)) || ASSISTED.has(canon(g.name)) || /ze wspomaganiem/.test(g.key || '')
export const incOf = (g, def = 2.5) => stepU(INC[g.key] || INC[g.name] || INC[canon(g.key)] || INC[canon(g.name)] || def)
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
// plate sizes a gym can have (kg); the user ticks the ones their gym has (prefs.plateSet)
export const ALL_PLATES = [25, 20, 15, 10, 5, 2.5, 2, 1.25, 1, 0.5]
export const PLATES = [25, 20, 15, 10, 5, 2.5, 1.25]
// bar weight of a barbell exercise (null = not loaded with plates on a bar): own warm-up table first, then the name.
// `std` = the gym's standard bar (EZ bars stay 10 kg)
export function barOf(name, std = 20) {
  const w = WARMUP[name] ?? WARMUP[canon(name)]
  if (w != null) return w === 20 ? std : w
  const n = String(name).toLowerCase()
  if (/smith|hantl|wyciąg|maszyn|linkach|kettl|talerz/.test(n)) return null
  if (/łaman|\bez\b/.test(n)) return 10
  return /sztang|martwy ciąg|przysiad zerchera|hip thrust/.test(n) ? std : null
}
// all numbers in one unit (kg, or lb with rs = 5)
export function warmupSets(W, bar = 20, set = PLATES, rs = 2.5) {
  if (!(W > bar)) return []
  const out = [{ w: bar, r: 10 }]
  for (const [p, r] of [[0.5, 8], [0.7, 5], [0.85, 2]]) {
    const w = Math.round((W * p) / rs) * rs
    if (w > out[out.length - 1].w && w < W) out.push({ w, r })
  }
  return out.map(x => ({ ...x, plates: platesPerSide(x.w, bar, set) }))
}
// heaviest plates first; whatever the gym's plates can't make is left over (see platesLeft)
export function platesPerSide(w, bar = 20, set = PLATES) {
  let side = Math.round(((w - bar) / 2) * 100) / 100
  const out = []
  for (const p of [...set].sort((a, b) => b - a)) while (side >= p - 1e-9) { out.push(p); side = Math.round((side - p) * 100) / 100 }
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
export function fmtVal(v, unit = 'kg') { return (unit === 'kg' ? fmtW(v) : fmtNum(v)) + ' ' + UNITS[unit].short }

// An exercise may be made of parts with their own sets (e.g. Nauka podciągania = Wiszenie + Negatywy).
// A plain exercise may name its unit instead of parts: [name, target, tag, 'reps'].
// Each part is stored under its own key "Name · Part"; a plain exercise is stored under its name.
// Interchangeable exercises: do whichever machine is free. Chosen per workout on the
// Workout screen (session.swap = { planName: chosenName }); each exercise keeps its own history and progression.
export const ALT = {
  'Rozpiętki na bramie z dołu do góry': ['Rozpiętki na maszynie (butterfly)'],
  'Rozpiętki na maszynie (butterfly)': ['Rozpiętki na bramie z dołu do góry']
}
const DEFAULT_ALT = JSON.parse(JSON.stringify(ALT))
export const altOf = name => ALT[name] || []
// the exercise a workout really did at this plan position (after a swap)
export const nameIn = (ex, s) => (s && s !== 'all' && s.swap?.[ex[0]]) || ex[0]

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
  // progress views: the plan's exercise and its alternatives (each with its own history)
  if (ctx === 'all' && ALT[ex[0]]) return [ex, ...ALT[ex[0]].map(n => [n, ex[1], ex[2]])].flatMap((e, k) => groupsOf(e).map(g => ({ ...g, alt: k > 0 })))
  if (ctx && ctx !== 'all' && ctx.swap?.[ex[0]]) ex = [ctx.swap[ex[0]], ex[1], ex[2], ex[3]]
  const [name, target, , parts] = ex
  if (parts === 'stages') return stagedParts(ctx).map(p => ({ key: name + ' · ' + p.label, name, label: p.label, unit: p.unit, target: p.target, sets: p.sets, stage: p.stage }))
  if (typeof parts === 'string') return [{ key: name, name, label: null, unit: parts, target, sets: nSets(target) }]
  return parts
    ? parts.map(p => ({ key: name + ' · ' + p.label, name, label: p.label, unit: p.unit, target: p.target, sets: p.sets }))
    : [{ key: name, name, label: null, unit: 'kg', target, sets: nSets(target) }]
}
// unit of a stored exercise key that may no longer be in the plan (default plan + pull-up stage parts)
export function unitOfKey(k, arr = []) {
  for (const d of DEFAULT_PLAN) for (const e of d.ex) for (const g of groupsOf(e, 'all')) if (g.key === k) return g.unit
  for (const st of PULLUP_STAGES) for (const p of st.parts) if (PULLUP + ' · ' + p.label === k) return p.unit
  return arr.some(x => x.r != null) ? 'kg' : 'reps'
}
// the exercises of one workout: the plan's, plus the ones added during that workout (`session.extra`)
export const exOf = (day, s) => [...(PLAN[day]?.ex || []), ...(s && typeof s === 'object' ? s.extra || [] : [])]
export function entriesOf(day, ctx) { return exOf(day, ctx).flatMap((ex, i) => groupsOf(ex, ctx).map(g => ({ ...g, ex: i }))) }

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
    const to = resolveName(base)
    if (to === base) continue
    const nk = [to, ...part].join(' · ')
    if (s.ex[nk]?.length && s.ex[key]?.length) continue // both names in one workout: keep both, never drop sets
    if (!s.ex[nk]?.length) { s.ex[nk] = s.ex[key]; if (s.xid?.[key]) s.xid[nk] = s.xid[key] } // the id moves with the history
    delete s.ex[key]
    if (s.xid) delete s.xid[key]
    changed = true
  }
  // notes follow a renamed exercise
  for (const n of Object.keys(s?.notes || {})) { const to = resolveName(n); if (to !== n && s.notes[to] == null) { s.notes[to] = s.notes[n]; delete s.notes[n]; changed = true } }
  return changed
}
