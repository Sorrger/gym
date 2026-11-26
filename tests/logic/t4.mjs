// Fourth set: notes per exercise, exercises added during a workout, supersets, plates on the bar.
const { store, plan, stats, muscles, prefsM, idb, measuresM, schema, units, coach, weight, catalog, scenes, rig } = await import('./b.mjs')
const { state } = store
let fails = 0, n = 0
const ok = (c, m, extra) => { n++; if (!c) { fails++; console.log('FAIL', m, extra ?? '') } else console.log('ok  ', m) }
for (const k of Object.keys(state.sessions)) delete state.sessions[k]

// plates: only real barbell lifts of the plan
const kgNames = [...new Set(plan.PLAN.flatMap(d => d.ex.flatMap(e => plan.groupsOf(e).filter(g => g.unit === 'kg' && !g.label).map(g => g.name))))]
const withBar = kgNames.filter(nm => plan.barOf(nm) != null)
ok(withBar.includes('Wyciskanie sztangi na ławce płaskiej') && withBar.includes('Martwy ciąg rumuński'), 'plates: bench and RDL have a bar', withBar)
ok(!withBar.some(nm => /hantl|wyciąg|maszyn|Smith/i.test(nm)), 'plates: no dumbbell / cable / machine / Smith exercise', withBar)
ok(plan.barOf('Uginanie ramion ze sztangą łamaną') === 10 && plan.barOf('Wiosłowanie sztangą w opadzie') === 20, 'plates: EZ bar 10 kg, barbell 20 kg')
ok(plan.barOf('Wyciskanie sztangi na ławce płaskiej', 15) === 15 && plan.barOf('Uginanie ramion ze sztangą łamaną', 15) === 10, 'plates: the gym\'s own standard bar, EZ stays 10')
ok(plan.platesPerSide(80, 20).join() === '25,5' && plan.platesPerSide(80, 20, [20, 10, 5, 2.5]).join() === '20,10', 'plates: only the plates the gym has')
ok(plan.platesPerSide(61, 20, [20, 10, 5, 2.5]).join() === '20', 'plates: what can\'t be made is left over')
ok(plan.warmupSets(80, 20, [20, 10, 5]).every(x => x.plates.every(p => [20, 10, 5].includes(p))), 'plates: warm-up uses the same plates')

// notes: the newest note shows in later workouts, an empty one clears it
const a = store.startSession(0); a.date = '2026-11-10'; a.started = 1; a.finished = true
const bench = plan.PLAN[0].ex[0][0]
store.setNote(a, bench, '  siedzenie na 4  ')
ok(store.noteFor(bench, a).text === 'siedzenie na 4' && store.noteFor(bench, a).own, 'notes: saved trimmed in this workout')
const b = store.startSession(0); b.date = '2026-11-12'; b.started = 2
ok(store.noteFor(bench, b).text === 'siedzenie na 4' && !store.noteFor(bench, b).own && store.noteFor(bench, b).date === '2026-11-10', 'notes: shown in the next workout with its date')
ok(store.noteFor(bench, null).text === 'siedzenie na 4', 'notes: plan preview sees the newest note')
store.setNote(b, bench, '')
ok(store.noteFor(bench, b).text === '' && store.noteFor(bench, null).text === '', 'notes: clearing stops carrying it over')
const renamedOld = Object.keys(plan.RENAMED)[0], renamedNew = plan.RENAMED[renamedOld]
const old = { id: 'o1', date: '2026-01-01', day: 0, ex: {}, notes: { [renamedOld]: 'stara' }, started: 0, finished: true }
plan.migrateNames(old)
ok(old.notes[renamedNew] === 'stara' && !(renamedOld in old.notes), 'notes: follow a renamed exercise')

// exercises added during a workout
const s = store.startSession(1)
const nPlan = plan.PLAN[1].ex.length
ok(store.addExtra(s, { name: 'Moje testowe ćwiczenie', unit: 'kg', range: [10, 12], main: ['chest'], help: ['triceps'] }), 'extra: added')
ok(!store.addExtra(s, { name: 'Moje testowe ćwiczenie', unit: 'kg', range: [10, 12] }), 'extra: the same exercise twice is refused')
ok(!store.addExtra(s, { name: plan.PLAN[1].ex[1][0], unit: 'kg', range: [8, 10] }), 'extra: an exercise of the plan is refused')
const ents = plan.entriesOf(1, s)
const xe = ents.find(g => g.name === 'Moje testowe ćwiczenie')
ok(xe && xe.ex === nPlan && xe.sets === 3 && xe.target === '3 × 10-12', 'extra: listed after the plan with 3 sets', xe)
ok(s.ex['Moje testowe ćwiczenie']?.length === 3, 'extra: sets prefilled')
ok(muscles.musclesOf('Moje testowe ćwiczenie').main[0] === 'chest', 'extra: muscles known for body map and stats')
ok(!plan.entriesOf(1).some(g => g.name === 'Moje testowe ćwiczenie'), 'extra: not part of the plan itself')
s.ex['Moje testowe ćwiczenie'].forEach(x => { x.w = 30; x.r = 10; x.d = true })
ok(stats.volumeOf(s) >= 900, 'extra: counts into volume', stats.volumeOf(s))
ok(!store.removeExtra(s, nPlan), 'extra: cannot remove with ticked sets')
s.ex['Moje testowe ćwiczenie'].forEach(x => { x.d = false })
store.setSuperset(s, nPlan, 0)
ok(store.removeExtra(s, nPlan) && !s.extra && !s.ex['Moje testowe ćwiczenie'] && !s.ss, 'extra: removed with its sets and superset')
ok(store.addExtra(s, { name: 'Wieszanie', unit: 's', range: [20, 40] }) && plan.entriesOf(1, s).find(g => g.name === 'Wieszanie').unit === 's', 'extra: seconds exercise')

// supersets
const t = store.startSession(2)
store.setSuperset(t, 1, 2)
ok(store.partnerOf(t, 1) === 2 && store.partnerOf(t, 2) === 1 && store.partnerOf(t, 0) == null, 'superset: pair both ways')
store.setSuperset(t, 2, 3)
ok(store.partnerOf(t, 1) == null && store.partnerOf(t, 2) === 3, 'superset: re-pairing drops the old pair')
store.setSuperset(t, 3, null)
ok(!t.ss, 'superset: unlinked')
store.setSuperset(t, 0, 1); t.finished = true; t.date = '2026-11-20'
const u = store.startSession(2)
ok(store.partnerOf(u, 0) === 1, 'superset: next workout of the same training keeps it')
const v = store.startSession(0)
ok(!v.ss, 'superset: other trainings are not affected')

// prefs with lists must still be storable (IndexedDB can't clone reactive arrays)
prefsM.prefs.plateSet = [20, 10, 5]
let cloned = null; try { cloned = structuredClone(prefsM.prefsData()) } catch {}
ok(cloned && cloned.plateSet.join() === '20,10,5', 'prefs: data with a plate list can be stored')
prefsM.setPrefsLocal(null)
ok(prefsM.prefs.plates === false && prefsM.prefs.plateSet.join() === '25,20,15,10,5,2.5,1.25' && prefsM.prefs.plateSet !== prefsM.DEFAULT_PREFS.plateSet, 'prefs: plates off by default, own copy of the default list')

// saving: an open workout is written on every change, an untouched finished one is not even compared
{
  const tick = () => new Promise(r => setTimeout(r, 0))
  state.ready = true
  const o = state.sessions[store.startSession(2).id]; await tick()
  const k = Object.keys(o.ex)[0]
  o.ex[k][0].w = 77; await tick(); await tick()
  ok((await idb.get('s:' + o.id))?.ex[k][0].w === 77, 'saving: a change in an open workout is written without touching updated')
  const c0 = store.changes.value
  o.cur = 1; await tick(); await tick()
  ok(store.changes.value === c0 + 1, 'saving: each written change is counted once (the backup listens to it)')
  await tick(); ok(store.changes.value === c0 + 1, 'saving: nothing new → no extra write')
}
// statistics cache: kept while only an open workout changes, recomputed once a finished one changes
{
  const tick = () => new Promise(r => setTimeout(r, 0))
  state.ready = true
  for (const k of Object.keys(state.sessions)) delete state.sessions[k]
  await tick()
  const f = store.startSession(0); f.finished = true; f.date = '2026-11-20'
  plan.entriesOf(0).forEach(g => (f.ex[g.key] || []).forEach(x => { x.w = 50; x.r = 8; x.d = true }))
  await tick()
  stats.enableStatsCache(true)
  const v1 = stats.overview(null).vol
  const o = store.startSession(1); await tick()
  const r0 = store.dataRev.value
  plan.entriesOf(1).forEach(g => (o.ex[g.key] || []).forEach(x => { x.w = 40; x.r = 10; x.d = true }))
  await tick()
  ok(store.dataRev.value === r0 && stats.overview(null).vol === v1, 'stats cache: taps in an open workout keep the cached numbers')
  store.finishSession(o.id); await tick()
  ok(store.dataRev.value > r0 && stats.overview(null).vol > v1, 'stats cache: finishing a workout recomputes', [v1, stats.overview(null).vol])
  stats.enableStatsCache(false)
}

// body measurements: per day, per part, tombstones, merge by time
{
  const M = measuresM
  ok(M.parseCm('92,5') === 92.5 && M.parseCm('') === null && Number.isNaN(M.parseCm('5')) && Number.isNaN(M.parseCm('abc')), 'measures: cm parsing (comma, empty, out of range)')
  M.setMeasures('2026-10-01', { waist: 95, arm: 40, foo: 3, chest: 5 })
  ok(JSON.stringify(M.mstate.entries['2026-10-01'].v) === '{"waist":95,"arm":40}', 'measures: unknown parts and impossible values are dropped', M.mstate.entries['2026-10-01'])
  M.setMeasures('2026-11-01', { waist: 92.04, arm: 40.5 })
  const w = M.byPart.value.waist
  ok(w.first.cm === 95 && w.last.cm === 92 && Math.abs(w.change + 3) < 1e-9 && w.pts.length === 2, 'measures: change since the first measurement', w)
  M.delMeasures('2026-10-01')
  ok(M.measures.value.length === 1 && M.mstate.entries['2026-10-01'].del, 'measures: delete keeps a tombstone')
  const t = M.mstate.entries['2026-10-01'].t
  ok(M.importMeasures({ '2026-10-01': { v: { waist: 99 }, t: t - 1000 } }) === 0 && M.measures.value.length === 1, 'measures: an older copy does not bring a deleted day back')
  ok(M.importMeasures({ '2026-09-01': { v: { thigh: 60 }, t: 5 }, 'bad': { v: { waist: 1 }, t: 9 } }) === 1 && M.byPart.value.thigh?.last.cm === 60, 'measures: import adds new days, skips bad keys')
  M.setMeasures('2026-09-01', {})
  ok(M.mstate.entries['2026-09-01'].del, 'measures: saving an empty day deletes it')
}

// data shapes for the database: unique ids, version, training key, exercise ids
{
  const ids = new Set(Array.from({ length: 500 }, () => schema.newId(1764000000000)))
  ok(ids.size === 500 && [...ids].every(i => /^[0-9a-z]+-[0-9a-z]{6}$/.test(i)), 'schema: ids unique even in the same millisecond')
  const old = { id: 'abc', date: '2026-01-02', day: 1, ex: { 'Wiosłowanie hantlem': [{ w: 30, r: 10, d: true }] }, started: 1, finished: true, updated: 1 }
  ok(schema.normSession(old) && old.plan === plan.PLAN[1].key && old.v === schema.V.session && old.xid?.['Wiosłowanie hantlem'], 'schema: old workout gets training key, version and exercise ids', old)
  ok(!schema.normSession(old), 'schema: upgrading twice changes nothing')
  const off = { id: 'off1', date: '2026-01-03', day: 0, offApp: true, ex: {}, started: 0, finished: true, updated: 1 }
  schema.normSession(off); ok(off.v === schema.V.session && off.plan == null, 'schema: done-outside-app marks keep no training key')
  const s = store.startSession(2)
  ok(/-/.test(s.id) && s.v === schema.V.session && s.plan === plan.PLAN[2].key, 'schema: new workouts are born in the new shape', s)
  store.remove(s.id)
  const n0 = store.mergeSessions({ 'old-1': { date: '2026-02-01', day: 0, ex: {}, started: 5, finished: true, updated: 5 } })
  ok(n0 === 1 && state.sessions['old-1'].plan === plan.PLAN[0].key && state.sessions['old-1'].v === schema.V.session, 'schema: merged old backups are upgraded too')
}

// kg / lb: stored in kg, shown and stepped in lb
{
  const P = prefsM.prefs, U = units
  P.units = 'lb'
  ok(U.fmtWU(61.23496) === '135 lb' && U.fmtW(U.fromU(135)) === '135', 'units: 135 lb round-trips through kg', U.fromU(135))
  ok(plan.fmtVal(100, 'kg') === '220,5 lb' && plan.UNITS.kg.short === 'lb' && plan.UNITS.kg.step === 5, 'units: labels and the ± step follow the unit')
  const g = plan.entriesOf(0).find(x => x.unit === 'kg' && !x.label)
  const inc = plan.incOf(g, P.stepKg)
  ok(Math.abs(inc * U.LB - 5) < 1e-9 || Math.abs(inc * U.LB - 10) < 1e-9 || Math.abs(inc * U.LB - 2.5) < 1e-9, 'units: plan steps become lb steps', inc * U.LB)
  for (const k of Object.keys(state.sessions)) delete state.sessions[k]
  const W = U.fromU(135), prev = store.startSession(0)
  const lo = plan.rangeOf(g.target).hi
  prev.ex[g.key] = Array.from({ length: g.sets }, () => ({ w: W, r: lo, d: true })); prev.date = '2026-11-01'; store.finishSession(prev.id)
  const cur = store.startSession(0), sug = coach.suggest(g, cur)
  const up = sug?.sets?.[0]?.w
  ok(sug?.kind === 'up' && Math.abs(U.toU(up) - Math.round(U.toU(up) / 2.5) * 2.5) < 1e-6 && U.toU(up) > 135, 'units: weight jump lands on a lb plate step', [sug?.kind, U.toU(up)])
  ok(/lb/.test(sug.short) && !/kg/.test(sug.short), 'units: coach text in lb', sug.short)
  ok(/^2\D?205 lb$/.test(U.fmtVol(1000)) && U.fmtVol(10000) === '22k lb', 'units: volume in lb', U.fmtVol(1000))
  ok(U.barU(20) === 45 && U.barU(10) === 25 && U.barU(null) == null, 'units: bars in lb')
  ok(JSON.stringify(plan.platesPerSide(135, 45, [45, 35, 25, 10, 5, 2.5])) === '[45]' && JSON.stringify(plan.warmupSets(225, 45, [45, 25, 10, 5, 2.5], 5).map(x => x.w)) === '[45,115,160,190]', 'units: plates and warm-up in lb', plan.warmupSets(225, 45, [45, 25, 10, 5, 2.5], 5).map(x => x.w))
  const wl = weight.parseList('2.11 181,6')
  ok(wl.length === 1 && Math.abs(wl[0].kg - 82.37) < 0.01, 'units: pasted body weights in lb are stored in kg', wl)
  P.units = 'kg'
  ok(U.fmtWU(61.25) === '61,25 kg' && plan.UNITS.kg.step === 2.5 && plan.incOf(g, 2.5) === (plan.INC[g.key] || 2.5), 'units: kg unchanged')
  for (const k of Object.keys(state.sessions)) delete state.sessions[k]
}

// week streak: how many trainings a week count
{
  for (const k of Object.keys(state.sessions)) delete state.sessions[k]
  const mon = new Date(); mon.setDate(mon.getDate() - ((mon.getDay() + 6) % 7)); mon.setHours(12)
  const day = (wk, d) => store.iso(new Date(mon.getTime() + (wk * 7 + d) * 864e5))
  const add = date => { const x = store.startSession(0); const g = plan.entriesOf(0)[0]; x.ex[g.key][0].d = true; x.ex[g.key][0].w = 50; x.date = date; store.finishSession(x.id) }
  add(day(-1, 0)); add(day(-1, 2)); add(day(-2, 1)); add(day(-3, 0)); add(day(-3, 3))
  ok(stats.weekStreak(1) === 3 && stats.weekStreak(2) === 1 && stats.weekStreak(3) === 0, 'streak: weeks count only with enough trainings', [stats.weekStreak(1), stats.weekStreak(2), stats.weekStreak(3)])
  for (const k of Object.keys(state.sessions)) delete state.sessions[k]
}

// anatomy of every animation (side view): knees never bend the wrong way, elbows never fold past 158°, and an
// elbow bends the wrong way only where the shoulder is rotated (bar on the back, hands behind the head, elbows out)
{
  const ang = (a, b) => Math.atan2(b.y - a.y, b.x - a.x) * 180 / Math.PI, norm = a => ((a + 540) % 360) - 180
  const ROTATED = new Set(['squat', 'split-squat', 'lunge', 'calf-raise', 'good-morning', 'crunch', 'sit-up', 'goblet-squat', 'face-pull', 'upright-row', 'cuban-press', 'pendulum', 'snatch', 'kb-swing', 'kb-snatch', 'reverse-hyper'])
  const bad = []
  for (const b of catalog.BASES) for (const eq of b.o.eq || ['']) for (const ax of ['', 'pos', 'v']) for (const val of ax ? (ax === 'v' ? (b.v || []).map(x => x[0]) : b.o[ax] || []) : ['']) {
    const sel = catalog.fullSel(b, { ...catalog.fullSel(b, eq ? { eq } : {}), ...(ax ? { [ax]: val } : {}) })
    const sc = scenes.sceneFor(b.id, sel, catalog.compose(b, sel)); if (!sc || sc.view === 'f' || sc.top) continue
    for (let i = 0; i <= 40; i++) {
      const J = rig.joints(rig.poseAt(sc.frames, i / 40), sc.view)
      for (const [r, m, e, knee] of [[J.S, J.E, J.W, 0], [J.H, J.K, J.A, 1], [J.H, J.K2, J.A2, 1]]) {
        if (!m || !e || Math.hypot(e.x - m.x, e.y - m.y) < 5) continue
        const rel = norm(ang(m, e) - ang(r, m)), flex = knee ? rel : -rel
        if (flex > 159 || (flex < -8 && (knee || !ROTATED.has(b.id)))) bad.push(b.id + (knee ? ' knee ' : ' elbow ') + Math.round(flex) + '° @' + i)
      }
    }
  }
  ok(!bad.length, 'anim: no hyperextended or over-folded elbows / knees', [...new Set(bad.map(x => x.split(' @')[0]))].slice(0, 12))
}

globalThis.T4 = { n, fails }
