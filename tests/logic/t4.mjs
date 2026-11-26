// Fourth set: notes per exercise, exercises added during a workout, supersets, plates on the bar.
const { store, plan, stats, muscles, prefsM } = await import('./b.mjs')
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

globalThis.T4 = { n, fails }
