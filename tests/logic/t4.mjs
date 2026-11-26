// Fourth set: notes per exercise, exercises added during a workout, supersets, plates on the bar.
const { store, plan, stats, muscles, prefsM, idb, measuresM } = await import('./b.mjs')
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

globalThis.T4 = { n, fails }
