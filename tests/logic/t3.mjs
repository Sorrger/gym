// Third set: storage – one entry per workout, moving the old single entry, writing only what changed.
const { store, idb, plan, csv, catalog } = await import('./b.mjs')
const { state } = store
let fails = 0, n = 0
const ok = (c, m, extra) => { n++; if (!c) { fails++; console.log('FAIL', m, extra ?? '') } else console.log('ok  ', m) }
const tick = () => new Promise(r => setTimeout(r, 0))
const W = (id, date, upd, extra = {}) => ({ id, date, day: 0, ex: { 'Wyciskanie sztangi na ławce płaskiej': [{ w: 60, r: 8, d: true }] }, started: upd, finished: true, updated: upd, ...extra })

idb.mem.clear()
for (const k of Object.keys(state.sessions)) delete state.sessions[k]
state.ready = false
await idb.set('sessions', { a: W('a', '2026-11-01', 1), b: W('b', '2026-11-02', 2) })
await idb.set('s:b', W('b', '2026-11-02', 5, { note: 'newer' }))
await idb.set('s:c', W('c', '2026-11-03', 3))
await store.load()
ok(Object.keys(state.sessions).sort().join() === 'a,b,c', 'storage: old single entry + per-workout entries are all loaded', Object.keys(state.sessions))
ok(state.sessions.b.note === 'newer', 'storage: the newer copy of a workout wins')
const keys = await idb.keys()
ok(keys.includes('s:a') && keys.includes('s:b') && keys.includes('s:c'), 'storage: every workout has its own entry', keys)
ok(!keys.includes('sessions'), 'storage: the old single entry is no longer the live list')
const v1 = await idb.get('sessions-v1')
ok(v1?.a && v1?.b, 'storage: the old single entry is kept as a safety copy (sessions-v1)')

// a change writes only that workout
const before = JSON.stringify(await idb.get('s:c'))
state.sessions.a.ex['Wyciskanie sztangi na ławce płaskiej'][0].w = 62.5
state.sessions.a.updated = Date.now() // edits of a finished workout always move `updated` (WorkoutView touch())
await tick(); await tick()
ok((await idb.get('s:a')).ex['Wyciskanie sztangi na ławce płaskiej'][0].w === 62.5, 'storage: a change is written to that workout right away')
ok(JSON.stringify(await idb.get('s:c')) === before, 'storage: other workouts are not rewritten')

// delete keeps a tombstone and removes the entry
store.remove('c'); await tick(); await tick()
ok(!(await idb.keys()).includes('s:c') && (await idb.get('deleted'))?.c, 'storage: a deleted workout loses its entry and leaves a tombstone')

// a reload reads the same data back
for (const k of Object.keys(state.sessions)) delete state.sessions[k]
state.ready = false
await store.load()
ok(Object.keys(state.sessions).sort().join() === 'a,b' && state.sessions.a.ex['Wyciskanie sztangi na ławce płaskiej'][0].w === 62.5, 'storage: reload gives back what was saved')

// stable exercise ids
{
  const s = { id: 'x1', ex: { 'Wyciskanie sztangi na ławce płaskiej': [], 'Nauka podciągania · Wiszenie': [], 'Stare ćwiczenie': [] } }
  plan.stampIds(s)
  ok(s.xid['Wyciskanie sztangi na ławce płaskiej'] === 'x-wyciskanie-sztangi-na-lawce-plaskiej', 'ids: a workout gets a stable id per exercise', s.xid)
  ok(s.xid['Nauka podciągania · Wiszenie'] === 'x-nauka-podciagania/wiszenie', 'ids: a part of a multi-part exercise gets its own id', s.xid)
  plan.applyPlan({ renamed: { 'Stare ćwiczenie': 'Klata płasko' } })
  const id0 = s.xid['Stare ćwiczenie']
  plan.migrateNames(s); plan.stampIds(s)
  ok(s.ex['Klata płasko'] && s.xid['Klata płasko'] === id0 && !s.xid['Stare ćwiczenie'], 'ids: a renamed exercise keeps its id', s.xid)
  ok(plan.exId('Klata płasko') === id0, 'ids: the new name gives the same id as the first name')
  plan.applyPlan({ ids: { 'Moje ćwiczenie': 'u-abc' } })
  ok(plan.exId('Moje ćwiczenie') === 'u-abc', 'ids: an id from the plan data wins')
  plan.applyPlan(null)
  ok(Object.values(state.sessions).every(w => Object.keys(w.ex).every(k => w.xid?.[k])), 'ids: loaded workouts all carry ids')
}

// CSV
{
  const sessions = {
    w1: { id: 'w1', date: '2026-11-20', day: 0, started: new Date(2026, 10, 20, 18, 5).getTime(), finished: true, updated: 1,
      ex: { 'Wyciskanie sztangi na ławce płaskiej': [{ w: 80, r: 8, d: true, q: 1 }, { w: 80, r: 7, d: true, t: 'f' }, { w: 80, r: 6, d: false }],
        'Nauka podciągania · Wiszenie': [{ w: 25, d: true }], 'Unoszenie nóg w podporze na poręczach': [{ w: 12, d: true }] } },
    off: { id: 'off', date: '2026-11-21', day: 1, started: 0, finished: true, offApp: true, ex: {} },
  }
  const text = csv.toCSV(sessions)
  const lines = text.trim().split('\n')
  ok(lines.length === 1 + 4, 'csv: one row per done set (not done sets and marks without sets left out)', lines.length)
  ok(lines[1].startsWith('2026-11-20,18:05,') && lines[1].includes(',80,8,,1,,'), 'csv: date, time, kg, reps and reps-in-reserve in their columns', lines[1])
  ok(lines.some(l => l.includes('Nauka podciągania,Wiszenie,1,,,25,')), 'csv: seconds of a hang go to the seconds column')
  const back = csv.fromCSV(text)
  ok(back.kind === 'inchup' && back.sessions.w1, 'csv: our own file is recognised and keeps the workout id')
  const ex = back.sessions.w1.ex
  ok(ex['Wyciskanie sztangi na ławce płaskiej'].length === 2 && ex['Wyciskanie sztangi na ławce płaskiej'][1].t === 'f' && ex['Wyciskanie sztangi na ławce płaskiej'][0].q === 1, 'csv: sets, set type and reps in reserve come back', ex)
  ok(ex['Nauka podciągania · Wiszenie'][0].w === 25 && ex['Unoszenie nóg w podporze na poręczach'][0].w === 12, 'csv: seconds and reps come back as values')
  ok(back.sessions.w1.day === 0, 'csv: the workout goes back to its training')
  const strong = 'Date,Workout Name,Duration,Exercise Name,Set Order,Weight,Reps,Distance,Seconds,Notes,Workout Notes,RPE\n' +
    '2026-10-01 18:00:00,Push,1h,Bench Press (Barbell),1,80,8,0,0,,,8\n2026-10-01 18:00:00,Push,1h,Bench Press (Barbell),2,80,7,0,0,,,\n2026-10-01 18:00:00,Push,1h,Plank,1,0,0,0,60,,,\n'
  const en = catalog.enIndex()
  const st = csv.fromCSV(strong, en), sw = Object.values(st.sessions)[0]
  ok(st.kind === 'strong' && sw && sw.date === '2026-10-01', 'csv: a Strong export is read', st)
  ok(Object.keys(sw.ex).some(k => /Wyciskanie/.test(k)) && Object.values(sw.ex)[0].length === 2 && Object.values(sw.ex)[0][0].q === 2, 'csv: Strong exercise names become our catalogue names, RPE 8 = 2 in reserve', sw.ex)
  ok(Object.values(sw.ex).some(a => a[0].w === 60), 'csv: a timed set keeps its seconds')
  const hevy = 'title,start_time,end_time,description,exercise_title,superset_id,exercise_notes,set_index,set_type,weight_kg,reps,distance_km,duration_seconds,rpe\n' +
    '"Pull","26 Nov 2026, 17:30","26 Nov 2026, 18:30","","Lat Pulldown (Cable)","","",0,"warmup",40,12,,,\n"Pull","26 Nov 2026, 17:30","26 Nov 2026, 18:30","","Lat Pulldown (Cable)","","",1,"normal",60,10,,,\n'
  const hv = csv.fromCSV(hevy, en), hw = Object.values(hv.sessions)[0]
  ok(hv.kind === 'hevy' && hw && hw.date === '2026-11-26' && Object.values(hw.ex)[0].length === 2 && Object.values(hw.ex)[0][0].t === 'w', 'csv: a Hevy export is read (warm-up set marked)', hv)
  ok(hw.day === 1, 'csv: a workout called like a training goes to that training', hw.day)
  ok(csv.fromCSV('a,b\n1,2').kind === null, 'csv: an unknown file is refused')
  ok(csv.parseCSV('a;b\n"x;1";2').length === 2 && csv.parseCSV('a;b\n"x;1";2')[1][0] === 'x;1', 'csv: semicolons and quotes are handled')
}

// cloud upload timing: rare during an open workout, quick otherwise
{
  const { cloudM } = await import('./b.mjs')
  for (const k of Object.keys(state.sessions)) delete state.sessions[k]
  state.sessions.f = W('f', '2026-11-20', 1)
  const t0 = 1_000_000_000
  cloudM.cloud.lastSync = t0
  ok(cloudM.nextDelay(t0) === 4000, 'cloud: no open workout → upload after a few seconds')
  state.sessions.o = W('o', '2026-11-21', 2, { finished: null })
  ok(cloudM.nextDelay(t0 + 60e3) === cloudM.WORKOUT_GAP - 60e3, 'cloud: open workout → wait until 5 minutes after the last upload')
  ok(cloudM.nextDelay(t0 + 10 * 60e3) === 4000, 'cloud: open workout, last upload long ago → send soon')
  state.sessions.o.offApp = true
  ok(cloudM.nextDelay(t0 + 60e3) === 4000, 'cloud: a done-outside-app mark is not an open workout')
  delete state.sessions.o; delete state.sessions.f
}

globalThis.T3 = { n, fails }
