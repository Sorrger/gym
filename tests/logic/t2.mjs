// Second set: records, weight log, stats helpers, backup merge, auto-close, settings steppers, time texts, English.
const { store, plan, stats, prefsM, weight, records, rules, now, i18n, en, catalog, muscles } = await import('./b.mjs')
const { state } = store
const { prefs, DEFAULT_PREFS } = prefsM
let fails = 0, n = 0
const ok = (c, m, extra) => { n++; if (!c) { fails++; console.log('FAIL', m, extra ?? '') } else console.log('ok  ', m) }
const iso = d => store.iso(d)
const dAgo = k => iso(new Date(Date.now() - k * 864e5))
const reset = () => { for (const k of Object.keys(state.sessions)) delete state.sessions[k]; state.ready = true }
let seq = 0
function S(date, day, ex, extra = {}) {
  const id = 'r' + (seq++)
  const started = new Date(date + 'T18:00:00').getTime() + seq
  state.sessions[id] = { id, date, day, ex, started, finished: true, updated: started, ...extra }
  return state.sessions[id]
}
const kg = (vals, r = 8) => vals.map(w => ({ w, r, d: true }))
const BENCH = 'Wyciskanie sztangi na ławce płaskiej'
const gB = { key: BENCH, name: BENCH, unit: 'kg', target: '3 × 6-8' }
const ASSIST = { key: 'Nauka podciągania · Ze wspomaganiem', name: 'Nauka podciągania', label: 'Ze wspomaganiem', unit: 'kg', target: '3 × 6-8' }

// ---------- records ----------
reset()
S(dAgo(9), 0, { [BENCH]: kg([60, 60, 57.5]) })
S(dAgo(5), 0, { [BENCH]: kg([62.5, 60]) })
let today = S(dAgo(0), 0, { [BENCH]: [{ w: 65, r: 6, d: true }, { w: 70, r: 3, d: true, t: 'w' }, { w: 62.5, r: 8, d: false }] })
ok(records.bestBefore(today, gB, 0) === 62.5, 'best before = best of earlier workouts')
ok(records.bestBefore(today, gB, 2) === 65, 'best before counts sets already ticked today (not the set itself)')
ok(records.bestBefore(today, gB, 1) === 65, 'warm-up sets (t=w) never count as a best')
let rows = records.sessionRecords(today, [gB])
ok(rows[0].pr && rows[0].max === 65 && rows[0].prev === 62.5, 'summary: 65 after 62.5 = record', rows[0])
reset(); today = S(dAgo(0), 0, { [BENCH]: kg([40]) })
ok(records.bestBefore(today, gB, 0) === null && !records.sessionRecords(today, [gB])[0].pr, 'first time ever is not a record')
reset()
S(dAgo(7), 1, { [ASSIST.key]: kg([30, 30]) })
today = S(dAgo(0), 1, { [ASSIST.key]: kg([25, 30]) })
rows = records.sessionRecords(today, [ASSIST])
ok(rows[0].pr && rows[0].max === 25 && rows[0].prev === 30, 'assisted: less help = record', rows[0])
ok(records.bestBefore(today, ASSIST, 0) === 30, 'assisted best before = least help')
reset()
const later = S(dAgo(0), 0, { [BENCH]: kg([100]) })
const earlierSameDay = S(dAgo(0), 0, { [BENCH]: kg([50]) }, { started: later.started - 3600e3 })
ok(records.bestBefore(earlierSameDay, gB, 0) === null, 'a later workout the same day does not count for an earlier one')
today = S(dAgo(0), 0, { [BENCH]: [{ w: 70, r: 5, d: false }] })
ok(!records.sessionRecords(today, [gB])[0].done, 'nothing ticked → not done, no record')

// ---------- stats: warm-ups, volume, streak ----------
reset()
const s1 = S(dAgo(1), 0, { [BENCH]: [{ w: 60, r: 8, d: true }, { w: 40, r: 10, d: true, t: 'w' }, { w: 60, r: 8, d: false }] })
ok(stats.setsOf(s1) === 1, 'set count: only ticked working sets')
ok(stats.volumeOf(s1) === 480, 'volume: 60 × 8, warm-up and unticked left out', stats.volumeOf(s1))
const mon = d => { const x = new Date(d); x.setDate(x.getDate() - (x.getDay() + 6) % 7); return x }
reset(); ok(stats.weekStreak() === 0, 'streak 0 without workouts')
const thisMon = mon(new Date())
for (const w of [1, 2, 3]) S(iso(new Date(thisMon.getTime() - w * 7 * 864e5 + 864e5)), 0, { [BENCH]: kg([60]) })
ok(stats.weekStreak() === 3, 'streak counts past weeks; an empty current week does not break it', stats.weekStreak())
S(iso(thisMon), 0, { [BENCH]: kg([60]) })
ok(stats.weekStreak() === 4, 'streak +1 with a workout this week')
reset()
S(iso(new Date(thisMon.getTime() - 7 * 864e5)), 0, { [BENCH]: kg([60]) })
S(iso(new Date(thisMon.getTime() - 21 * 864e5)), 0, { [BENCH]: kg([60]) })
ok(stats.weekStreak() === 1, 'a week without training breaks the streak')
reset()
S(dAgo(0), 1, {}, { offApp: true, started: 0 })
ok(stats.weekly(1)[0].n === 1, 'a workout marked as done outside the app counts in the week')

// ---------- backup merge (never loses data) ----------
reset()
const local = S(dAgo(2), 0, { [BENCH]: kg([60]) }, { updated: 2000 })
let added = store.mergeSessions({ [local.id]: { ...local, ex: { [BENCH]: kg([10]) }, updated: 1000 } })
ok(added === 0 && state.sessions[local.id].ex[BENCH][0].w === 60, 'older remote copy does not overwrite a newer local one')
added = store.mergeSessions({ [local.id]: { ...local, ex: { [BENCH]: kg([65]) }, updated: 3000 } })
ok(added === 1 && state.sessions[local.id].ex[BENCH][0].w === 65, 'newer remote copy wins')
added = store.mergeSessions({ x1: { date: dAgo(4), day: 1, ex: {}, updated: 5 }, 'y~draft': { date: dAgo(1), day: 0, ex: {} }, bad: { day: 0 } })
ok(added === 1 && state.sessions.x1 && !state.sessions['y~draft'] && !state.sessions.bad, 'adds new workouts, skips drafts and broken ones')
ok(state.sessions.x1.finished === true && state.sessions.x1.started > 0, 'merged workout without fields gets finished + start time')
store.mergeSessions({})
ok(state.sessions[local.id] && state.sessions.x1, 'an empty backup deletes nothing')
store.mergeSessions({ x9: { date: dAgo(1), day: 7, ex: {}, updated: 1 } })
ok(plan.PLAN[7] && plan.PLAN[7].hidden, 'unknown training index from a backup gets a hidden placeholder')

// ---------- deleted workouts don't come back ----------
reset(); for (const k of Object.keys(state.deleted)) delete state.deleted[k]
const del1 = S(dAgo(3), 0, { [BENCH]: kg([60]) }, { updated: 1000 })
const copy = JSON.parse(JSON.stringify(state.sessions))
store.remove(del1.id)
ok(!state.sessions[del1.id] && state.deleted[del1.id] > 0, 'delete leaves a tombstone')
store.mergeSessions(copy, {})
ok(!state.sessions[del1.id], 'an old backup that still has it does not bring it back')
reset(); for (const k of Object.keys(state.deleted)) delete state.deleted[k]
const other = S(dAgo(2), 1, { [BENCH]: kg([50]) }, { updated: 1000 })
store.mergeSessions({}, { [other.id]: 2000 })
ok(!state.sessions[other.id] && state.deleted[other.id] === 2000, 'deleted on another phone → removed here too')
const edited = S(dAgo(1), 1, { [BENCH]: kg([55]) }, { updated: 5000 })
store.mergeSessions({}, { [edited.id]: 3000 })
ok(!!state.sessions[edited.id], 'a workout changed after the deletion elsewhere is kept')
const remoteNew = { id: 'n1', date: dAgo(1), day: 0, ex: { [BENCH]: kg([70]) }, started: 10, finished: true, updated: 10 }
ok(store.mergeSessions({ n1: remoteNew }, {}) === 1 && state.sessions.n1, 'new workouts still come in with tombstones around')

// ---------- open workouts left for >12 h ----------
reset()
const old = Date.now() - 13 * 3600e3
S(dAgo(1), 0, { [BENCH]: kg([60]) }, { finished: false, started: old, updated: old })
S(dAgo(1), 0, { [BENCH]: [{ w: 60, d: false }] }, { finished: false, started: old, updated: old })
S(dAgo(1), 0, { [BENCH]: [{ w: 62.5, d: false }] }, { finished: false, started: old, updated: old + 60e3 })
S(dAgo(0), 0, {}, { finished: false, started: Date.now(), updated: Date.now() })
const before = Object.keys(state.sessions).length
store.closeStale()
const left = Object.values(state.sessions)
ok(left.length === before - 1, 'only the untouched old workout is dropped', left.length)
ok(left.filter(s => s.finished).length === left.length - 1, 'touched old workouts are closed and kept; a fresh one stays open')

// ---------- finishing ----------
reset()
const empty = S(dAgo(0), 0, { [BENCH]: [{ w: 60, d: false }] }, { finished: false })
ok(!store.finishSession(empty.id) && !state.sessions[empty.id], 'finishing an empty workout discards it')
const full = S(dAgo(0), 0, { [BENCH]: kg([60]) }, { finished: false })
ok(store.finishSession(full.id) && state.sessions[full.id].finished, 'finishing a workout with sets keeps it')
const manual = S(dAgo(1), 0, { [BENCH]: [{ w: 60, d: false }] }, { manual: true })
store.dropEmptyManual()
ok(!state.sessions[manual.id], 'an added past workout with nothing ticked is removed')

// ---------- weight log ----------
const P = weight.parseList('29.10 108,0\n31.10: 107.6; 2.11.2025 107,2 | 5/11 20 | 6.11 350')
ok(P.length === 3 && P[0].kg === 108 && P[1].kg === 107.6 && P[2].date === '2025-11-02', 'paste old weigh-ins: day.month weight, skips impossible values', P)
const fut = new Date(Date.now() + 40 * 864e5)
const pf = weight.parseList(fut.getDate() + '.' + (fut.getMonth() + 1) + ' 100')
ok(pf.length === 1 && pf[0].date < iso(new Date()), 'a date in the future means last year')
const L = [['2026-11-01', 100], ['2026-11-04', 99.6], ['2026-11-08', 99.4], ['2026-11-11', 99], ['2026-11-15', 98.6]].map(([date, k]) => ({ date, kg: k }))
const sm = weight.smooth(L)
ok(Math.abs(sm[1].avg - 99.8) < 1e-9 && Math.abs(sm[2].avg - 99.5) < 1e-9, '7-day average uses only the last 7 days', sm.map(x => x.avg))
const tr = weight.trend(L)
ok(tr < -0.5 && tr > -0.8, 'trend ≈ −0.6 kg/week', tr)
ok(weight.trend(L.slice(0, 2)) === null, 'trend needs 3 weigh-ins')
weight.wstate.entries = { '2026-11-01': { kg: 100, t: 5 } }
ok(weight.importWeights({ '2026-11-01': { kg: 90, t: 1 }, '2026-11-02': { kg: 99, t: 2 }, 'bad': { kg: 1, t: 9 }, '2026-11-03': { kg: 0, t: 9 } }) === 1, 'weight import: only newer/new valid entries')
ok(weight.wstate.entries['2026-11-01'].kg === 100 && weight.wstate.entries['2026-11-02'].kg === 99, 'older remote weight does not overwrite')
weight.importWeights({ '2026-11-02': { del: true, t: 3 } })
ok(weight.wstate.entries['2026-11-02'].del && !weight.weights.value.some(w => w.date === '2026-11-02'), 'a newer delete (tombstone) hides the weigh-in')

// ---------- settings steppers ----------
const step = rules.NUMS.find(t => t.k === 'stepKg'), rirUp = rules.NUMS.find(t => t.k === 'rirUp')
prefs.stepKg = 2.5; rules.step(step, 1); ok(prefs.stepKg === 5, 'kg step walks through its options (2,5 → 5)')
ok(!rules.canStep(step, 1), 'last option: + disabled'); rules.step(step, 1); ok(prefs.stepKg === 5, '+ at the end does nothing')
prefs.stepKg = 3; ok(rules.canStep(step, -1), 'a value outside the options can still be stepped'); rules.step(step, -1); ok(prefs.stepKg === 2.5, '…and snaps back to 2,5')
prefs.rirUp = 1; ok(!rules.canStep(rirUp, -1), 'minimum reached: − disabled'); rules.step(rirUp, -1); ok(prefs.rirUp === 1, 'never below the minimum')
prefs.rirUp = 4; ok(!rules.rulesDefault(), 'changed rule → not default'); rules.resetRules()
ok(rules.rulesDefault() && rules.RULES.every(k => prefs[k] === DEFAULT_PREFS[k]), 'reset puts every training rule back')
ok(rules.REST.fmt(90) === '1:30' && rules.REST.fmt(300) === '5:00', 'rest time shown as m:ss')

// ---------- "… temu" ----------
const T0 = Date.now()
ok(now.agoMin(T0 - 20e3, T0) === 'przed chwilą' && now.agoMin(T0 - 5 * 60e3, T0) === '5 min temu' && now.agoMin(T0 - 3 * 3600e3, T0) === '3 godz. temu', 'time since: just now / min / hours')

// ---------- English ----------
i18n.setLang('en', false)
const E = s => i18n.tr(s)
ok(E('Postępy') === 'Progress' && E('  Zapisz trening ') === '  Save workout ', 'whole phrases, spaces kept')
ok(E('Ćwiczenie 2 z 9') === 'Exercise 2 of 9' && E('1 trening') === '1 workout' && E('3 treningi') === '3 workouts', 'numbers inside + plural')
ok(E('Za ciężko (5 z 6-8). Kolejne serie: 57,5 kg × 6') === 'Too heavy (5 of 6-8). Next sets: 57.5 kg × 6', 'coach advice, decimal comma → dot')
ok(E('Ostatnio: 10, 9, 9 powt. (zapas 1, 2, 3+) – wszystkie serie na górze zakresu (8-10). Czas utrudnić: schodź wolniej (5 s).') ===
  'Last time: 10, 9, 9 reps (RIR 1, 2, 3+) – all sets at the top of the range (8-10). Time to make it harder: lower more slowly (5 s).', 'nested patterns translate every part')
ok(E('Od następnego treningu – 6 tygodni ciężkich treningów. Połowa serii, ok. 10% lżej, potem wracasz do normy.') === 'From the next workout – 6 weeks of hard training. Half the sets, about 10% lighter, then back to normal.', 'light week notice')
ok(E('Wyciskanie sztangi na ławce płaskiej') !== 'Wyciskanie sztangi na ławce płaskiej', 'exercise names are shown in English')
ok(E('8, 8, 7') === '8, 8, 7' && E('102,8 kg') === '102.8 kg', 'number lists keep their commas, decimals get a dot')
ok(E('Coś zupełnie nowego') === 'Coś zupełnie nowego', 'unknown text stays as it is')
const PL = /[ąćęłńóśźż]/i
ok(Object.entries(en.EN).every(([, v]) => !PL.test(v) || /[Jj]ęzyk/.test(v)), 'no Polish letters in English phrases', Object.entries(en.EN).filter(([, v]) => PL.test(v) && !/[Jj]ęzyk/.test(v)).slice(0, 3))
ok(en.PATTERNS.every(([src]) => { try { new RegExp(src); return true } catch { return false } }), 'every pattern is a valid regex')
ok(plan.PLAN.flatMap(p => p.ex.map(e => e[0])).filter(x => x !== plan.PULLUP).every(x => !PL.test(E(x))), 'every exercise of the basic plan has an English name',
  plan.PLAN.flatMap(p => p.ex.map(e => e[0])).filter(x => PL.test(E(x))))
i18n.setLang('pl', false)
ok(i18n.tr('Postępy') === 'Postępy', 'Polish: text untouched')

// ---------- exercise catalogue ----------
{
  const C = catalog
  function* combos(b) {
    const axes = Object.keys(b.o), vs = b.v ? b.v.map(v => v[0]) : [undefined]
    const rec = function* (i, s) { if (i === axes.length) { for (const v of vs) yield { ...s, v }; return } for (const k of b.o[axes[i]]) yield* rec(i + 1, { ...s, [axes[i]]: k }) }
    yield* rec(0, {})
  }
  const all = C.BASES.flatMap(b => [...combos(b)].map(s => C.compose(b, s)))
  const byNm = new Map(); let dup = null
  for (const r of all) { if (byNm.has(r.name) && byNm.get(r.name) !== r.id) dup = r.name; byNm.set(r.name, r.id) }
  ok(C.BASES.length >= 110 && byNm.size > 1100, 'catalogue: many bases and combinations', [C.BASES.length, byNm.size])
  ok(new Set(C.BASES.map(b => b.id)).size === C.BASES.length && new Set(C.BASES.map(b => b.pl)).size === C.BASES.length, 'catalogue: unique ids and names')
  ok(C.BASES.every(b => C.GROUPS.some(g => g.k === b.g) && Object.entries(b.o).every(([ax, ks]) => ks.every(k => C.AXES[ax]?.v[k]))), 'catalogue: groups and options exist')
  ok(C.BASES.every(b => Object.keys(b.x || {}).every(k => { const [ax, v] = k.split(':'); return b.o[ax]?.includes(v) })), 'catalogue: every option effect belongs to an option of that exercise')
  ok(all.every(r => [...r.main, ...r.help].every(m => muscles.MUSCLE_NAMES[m]) && r.main.length && !r.main.some(m => r.help.includes(m))), 'catalogue: known muscles, at least one main, main ≠ helping')
  ok(!dup, 'catalogue: one name = one combination', dup)
  ok(all.every(r => !r.name.includes('·') && r.name.length < 90), 'catalogue: names without "·" (part separator) and not too long')
  ok(all.every(r => { const b = C.byName(r.name); return b && C.compose(b.base, b.sel).id === r.id }), 'catalogue: every name leads back to its choice')
  ok(Object.entries(C.ALIASES).every(([nm, [id, sel]]) => C.compose(C.byId[id], sel).name === nm), 'catalogue: plan exercises keep their own names (history continues)')
  ok(plan.PLAN.flatMap(p => p.ex.map(e => e[0])).filter(x => x !== plan.PULLUP).every(x => C.ALIASES[x]), 'catalogue: every basic-plan exercise is in the catalogue')
  const r1 = C.compose(C.byId['bench-press'], { eq: 'db', angle: 'incline' }), r2 = C.compose(C.byId['bench-press'], { width: 'close' })
  ok(r1.name === 'Wyciskanie hantli na ławce skośnej' && r1.main.join() === 'chest' && r1.help.includes('shoulders'), 'incline bench (30°): plan name, chest main, front delts helping')
  ok(r2.name === 'Wyciskanie na ławce – sztanga, wąsko' && r2.main.includes('triceps'), 'close-grip bench: own name, triceps main')
  const cs = C.compose(C.byId['calf-raise'], { pos: 'seat', eq: 'bw' }), pu = C.compose(C.byId['pull-up'], { eq: 'as' })
  ok(cs.unit === 'reps' && pu.unit === 'kg' && pu.assisted && plan.isAssisted({ key: pu.name }), 'unit follows equipment; assisted machine = less is harder')
  ok(C.compose(C.byId['fly'], { eq: 'db', v: 'lowhigh' }).name === 'Rozpiętki – hantle' && C.axesOf(C.byId['fly'], { eq: 'db' }).axes.includes('angle'), 'options shown only where they make sense')
  const ce = C.catalogEN()
  ok(Object.values(ce).every(v => v && !/[ąćęłńóśźż]/i.test(v)), 'catalogue: English for every phrase')
  const seen = new Map(); let clash = null
  const add = (pl, en) => { if (seen.has(pl) && seen.get(pl) !== en) clash = pl; seen.set(pl, en) }
  C.GROUPS.forEach(g => add(g.pl, g.en)); Object.values(C.AXES).forEach(ax => { add(ax.pl, ax.en); Object.values(ax.v).forEach(([a, b]) => add(a, b)) })
  C.BASES.forEach(b => { add(b.pl, b.en); (b.v || []).forEach(v => add(v[1], v[2])) })
  ok(!clash, 'catalogue: one Polish phrase = one English phrase', clash)
  ok(C.GROUPS.every(g => C.BASES.some(b => b.g === g.k)), 'catalogue: every group has exercises')
  const dl = C.compose(C.byId['deadlift'], { v: 'rack' }), sq = C.compose(C.byId['squat'], { eq: 'db' })
  ok(dl.main.includes('upperback') && dl.help.includes('hamstrings') && !sq.name.includes('Zerchera') && !C.axesOf(C.byId['squat'], { eq: 'db' }).variants, 'variants only where they fit (rack pull, no Zercher with dumbbells)')
  // naming: capital first letter, the rest lowercase except names of people, brands and letters
  const PROPER = /^(T-gryf\w*|Arnolda|JM|Pallof\w*|Svend|Meadows\w*|Z-press|Y|Zottmana|Tate|GHD|V-up|V-uchwyt|Turkish|Smith|Zerchera|Pendlay|Yates|Nordic|L-sit|Copenhagen|RKC|OHP|MC|RDL|GHR|TGU|Pec)$/
  const words = t => t.replace(/[(),–:]/g, ' ').split(/\s+/).filter(Boolean)
  const badCase = C.BASES.flatMap(b => [
    ...(b.pl[0] === b.pl[0].toUpperCase() && b.en[0] === b.en[0].toUpperCase() ? [] : [b.pl]),
    ...words(b.pl).slice(1).filter(w => /^[A-ZĄĆĘŁŃÓŚŹŻ]/.test(w) && !PROPER.test(w)),
    ...(b.v || []).flatMap(v => words(v[1]).filter(w => /^[A-ZĄĆĘŁŃÓŚŹŻ]/.test(w) && !PROPER.test(w))),
  ]).concat(Object.values(C.AXES).flatMap(ax => Object.values(ax.v).map(x => x[0]).filter(w => /^[A-ZĄĆĘŁŃÓŚŹŻ]/.test(w) && !PROPER.test(w))))
  ok(!badCase.length, 'catalogue names: capital only at the start and for proper names', badCase)
  ok(C.BASES.filter(b => b.aka).length >= 90, 'catalogue: colloquial names for most exercises')
  ok(C.BASES.every(b => b.how && b.how.length === 2), 'catalogue: technique cue in both languages')
}

globalThis.T2 = { n, fails }
