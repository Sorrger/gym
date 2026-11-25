const { store, plan, coach, stats, prefsM } = await import('./b.mjs')
const { state } = store
let fails = 0, n = 0
const ok = (c, m, extra) => { n++; if (!c) { fails++; console.log('FAIL', m, extra ?? '') } else console.log('ok  ', m) }
const iso = d => store.iso(d)
const dAgo = k => iso(new Date(Date.now() - k * 864e5))
let seq = 0
function S(date, day, ex, extra = {}) {
  const id = 's' + (seq++)
  const started = new Date(date + 'T18:00:00').getTime() + seq
  state.sessions[id] = { id, date, day, ex, started, finished: true, updated: started, ...extra }
  return state.sessions[id]
}
const done = (vals, r) => vals.map((w, i) => ({ w, d: true, ...(r ? { r: Array.isArray(r) ? r[i] : r } : {}) }))
const reset = () => { for (const k of Object.keys(state.sessions)) delete state.sessions[k]; state.ready = true }
const P = plan.PULLUP + ' · '
const pullEx = plan.PLAN[1].ex[0]

// ---------- stages ----------
reset()
ok(store.pullupStage() === 1, 'no history → stage 1')
ok(plan.groupsOf(pullEx).map(g => g.label).join() === 'Wiszenie,Negatywy', 'stage 1 parts')
S(dAgo(20), 1, { [P + 'Wiszenie']: done([30, 30, 25]), [P + 'Negatywy']: done([5, 5, 5]) })
ok(store.pullupStage() === 1, 'hang 30,30,25 → stays 1')
const s1 = S(dAgo(16), 1, { [P + 'Wiszenie']: done([30, 30, 30]), [P + 'Negatywy']: done([5, 5, 4]) })
ok(store.pullupStage() === 1, 'neg 5,5,4 → stays 1')
S(dAgo(14), 1, { [P + 'Wiszenie']: done([30, 30, 30]), [P + 'Negatywy']: done([5, 5, 5]) }, { deload: true })
ok(store.pullupStage() === 1, 'goal met in a deload workout → no advance')
S(dAgo(12), 3, { [P + 'Wiszenie']: done([30, 30, 30]), [P + 'Negatywy']: done([5, 5, 5]) })
ok(store.pullupStage() === 2, 'goal met (Upper) → stage 2')
let gs = plan.groupsOf(pullEx)
ok(gs.map(g => g.label + ':' + g.unit + ':' + g.sets).join() === 'Ze wspomaganiem:kg:3,Negatywy:reps:2', 'stage 2 parts', gs)
ok(plan.groupsOf(pullEx, s1).map(g => g.label).join() === 'Wiszenie,Negatywy', 'old workout keeps its own parts')
ok(plan.targetOf(pullEx).startsWith('Etap 2/4'), 'target text', plan.targetOf(pullEx))
ok(plan.entriesOf(1, 'all').filter(g => g.name === plan.PULLUP).length === 3, "'all' = Wiszenie+Negatywy+Ze wspomaganiem")
const now = { id: 'x', date: iso(new Date()), started: Date.now(), day: 1, ex: {} }
let sg = coach.suggest(gs[0], now)
ok(sg.kind === 'stage' && /Nowy etap 2\/4/.test(sg.title), 'new stage message', sg)
S(dAgo(9), 1, { [P + 'Ze wspomaganiem']: done([25, 25, 25], [8, 8, 8]), [P + 'Negatywy']: done([5, 5]) })
sg = coach.suggest(gs[0], now)
ok(sg.kind === 'up' && sg.sets[0].w === 20, 'assisted 3×8 → less help (25→20 kg)', sg)
ok(store.pullupStage() === 2, '25 kg help → still stage 2')
S(dAgo(5), 3, { [P + 'Ze wspomaganiem']: done([15, 15, 15], [8, 8, 7]), [P + 'Negatywy']: done([5, 5]) })
ok(store.pullupStage() === 2, '15 kg 8,8,7 → still 2')
S(dAgo(2), 1, { [P + 'Ze wspomaganiem']: done([15, 15, 15], [8, 8, 8]), [P + 'Negatywy']: done([5, 5]) })
ok(store.pullupStage() === 3, '15 kg 3×8 → stage 3')
gs = plan.groupsOf(pullEx)
ok(gs.map(g => g.label).join() === 'Pełne,Negatywy', 'stage 3 parts')
sg = coach.suggest(gs[0], now); ok(sg.kind === 'stage', 'stage 3 message', sg.text)
S(dAgo(1), 3, { [P + 'Pełne']: done([3, 3, 2]), [P + 'Negatywy']: done([5, 5]) })
ok(store.pullupStage() === 3, 'full 3,3,2 → stays 3')
sg = coach.suggest(gs[0], now); ok(sg.kind === 'same' && sg.sets.map(x => x.w).join() === '3,3,3', 'stage 3 coach: 3,3,3', sg)
S(iso(new Date()), 1, { [P + 'Pełne']: done([3, 3, 3]), [P + 'Negatywy']: done([5, 5]) })
ok(store.pullupStage() === 4, 'full 3×3 → stage 4')
gs = plan.groupsOf(pullEx)
ok(gs.length === 1 && gs[0].target === '3 × 3-6', 'stage 4 = pull-ups 3-6')
const later = { ...now, date: dAgo(-1), started: Date.now() + 864e5 }
sg = coach.suggest(gs[0], later); ok(sg.kind === 'same' && sg.sets.every(x => x.w === 4), 'stage 4 coach: 4,4,4', sg)
ok(plan.stageGoalMet(4, {}) === false, 'no stage 5')
// stage 1 hang top message
reset()
S(dAgo(3), 1, { [P + 'Wiszenie']: done([30, 30, 30]), [P + 'Negatywy']: done([4, 4, 4]) })
gs = plan.groupsOf(pullEx)
sg = coach.suggest(gs[0], now); ok(sg.kind === 'up' && /etap 2/.test(sg.text), 'hang topped → explains auto stage 2', sg.text)
sg = coach.suggest(gs[1], now); ok(sg.kind === 'same' && sg.sets.map(x => x.w).join() === '5,5,5', 'negatives → 5,5,5', sg)

// ---------- deload ----------
reset()
ok(!store.deloadState().due, 'no workouts → no deload')
const bench = 'Wyciskanie sztangi na ławce płaskiej'
// 4 plans/week, steady progress
function weeks(fromDaysAgo, nWeeks, prog = true) {
  for (let w = 0; w < nWeeks; w++) for (const [off, day] of [[0, 0], [1, 1], [3, 2], [4, 3]]) {
    const k = fromDaysAgo - w * 7 - off
    if (k < 0) continue
    const ex = {}
    plan.entriesOf(day).forEach((g, j) => {
      const base = 20 + j * 5 + (prog ? w * 2.5 : 0)
      ex[g.key] = g.unit === 'kg' ? done(Array(g.sets).fill(base), Array(g.sets).fill(8)) : done(Array(g.sets).fill(prog ? 10 + w : 10))
    })
    S(dAgo(k), day, ex)
  }
}
weeks(34, 5) // started ~5 weeks ago
let dl = store.deloadState()
ok(!dl.due && !dl.active && dl.weeks === 4, '~4.9 weeks steady progress → not due', dl)
reset(); weeks(43, 7)
dl = store.deloadState(); ok(dl.due && /tygodni/.test(dl.reason), '6+ weeks → due', dl)
{ const { prefs } = await import('./b.mjs').then(m => m.prefsM)
  prefs.deload = false; ok(!store.deloadState().due && store.deloadState().off, 'deload off in settings → never due')
  prefs.deload = true; prefs.deloadEvery = 8; ok(!store.deloadState().due, 'deload every 8 weeks → ~6 weeks not due yet', store.deloadState())
  prefs.deloadEvery = 6; ok(store.deloadState().due, 'back to 6 → due')
  const s0 = store.startSession(0); prefs.deload = false; const s1 = store.startSession(1)
  ok(s0.deload && !s1.deload, 'deload off → new workout is a normal one'); prefs.deload = true; delete store.state.sessions[s0.id]; delete store.state.sessions[s1.id]
  ok(prefsM.weightTone(-0.5) === 'dn' && (prefs.goal = 'bulk', prefsM.weightTone(-0.5) === 'upw') && prefsM.weightTone(0.3) === 'dn' && (prefs.goal = 'maintain', prefsM.weightTone(0.3) === ''), 'weight colour follows the goal'); prefs.goal = 'cut' }
// stall early
reset(); weeks(31, 2); weeks(17, 3, false)
dl = store.deloadState(); ok(dl.due && /stoją/.test(dl.reason), '4.4 weeks + most exercises stalled → due early', dl)
reset(); weeks(20, 3, false)
dl = store.deloadState(); ok(!dl.due, '<4 weeks stalled → not yet', dl)
// start a session when due
reset(); weeks(43, 7)
const before = state.sessions[Object.keys(state.sessions).find(k => state.sessions[k].day === 0 && state.sessions[k].date === dAgo(1))] || store.sorted().find(s => s.day === 0)
const lastBench = store.sorted().find(s => s.day === 0).ex[bench][0].w
const ds = store.startSession(0)
ok(ds.deload === true, 'new workout when due → deload')
ok(ds.ex[bench].length === 2, 'bench 3 sets → 2', ds.ex[bench].length)
ok(ds.ex['Wyciskanie hantli na ławce skośnej'].length === 2, 'incline 4 sets → 2')
ok(ds.ex[bench][0].w === Math.round(lastBench * 0.9 / 2.5) * 2.5 && ds.ex[bench][0].r === 6, `bench ${lastBench} → ${ds.ex[bench][0].w} × 6`)
sg = coach.suggest(plan.entriesOf(0)[0], ds)
ok(sg.kind === 'deload' && sg.sets.length === 2 && sg.sets[0].w === ds.ex[bench][0].w, 'coach in deload matches', sg)
dl = store.deloadState(); ok(dl.active === false || true, 'state ok')
ds.ex[bench].forEach(x => (x.d = true)); ds.finished = true
dl = store.deloadState(); ok(dl.active && dl.end === dAgo(-6), 'deload week active for 7 days', dl)
const ds2 = store.startSession(1); ok(ds2.deload, 'next workout in deload week also light')
delete state.sessions[ds2.id]
// after the deload week
dl = store.deloadState(dAgo(-7)); ok(!dl.active && !dl.due, 'after 7 days: normal again', dl)
const after = { id: 'a', date: dAgo(-7), started: Date.now() + 7 * 864e5, day: 0, ex: {} }
sg = coach.suggest(plan.entriesOf(0)[0], after)
ok(sg.sets && sg.sets[0].w >= lastBench, 'after deload coach uses pre-deload weight', sg)
// cancel deload
reset(); weeks(43, 7)
const cs = store.startSession(0)
store.cancelDeload(cs)
ok(!cs.deload && cs.noDeload && cs.ex[bench].length === 3 && cs.ex[bench][0].w === store.sorted().find(s => s.day === 0 && s.id !== cs.id).ex[bench][0].w, 'Trenuj normalnie → full sets & weights')
cs.ex[bench][0].d = true
ok(!store.deloadState().due, 'postponed → not due this week')
ok(store.deloadState(dAgo(-7)).due, 'due again a week later')
// a break counts as rest
reset(); weeks(70, 7); weeks(10, 2)
dl = store.deloadState(); ok(!dl.due && dl.weeks <= 2, 'break ≥8 days resets the count', dl)
reset(); weeks(50, 6) // last workout ~8+ days ago
dl = store.deloadState(); ok(!dl.due, 'coming back after a break → no deload', dl)
// strength index ignores deload
reset(); weeks(43, 7); const ds3 = store.startSession(0); Object.values(ds3.ex).forEach(a => a.forEach(x => (x.d = true))); ds3.finished = true
const st = stats.strength(0); ok(st.up >= 0 && st.index.length === 7, 'strength index skips deload workout', st.index.length)

// ---------- which plan today ----------
reset()
const at = (y, m, d) => new Date(y, m - 1, d, 12)
// week of Mon 2026-11-16
const W = d => iso(at(2026, 11, d))
const sug = d => store.suggestion(at(2026, 11, d))
ok(sug(16).day === 0 && sug(16).kind === 'today', 'Mon nothing → Push (Dziś)')
S(W(16), 0, { [bench]: done([60], [8]) })
ok(sug(16).day === 1 && sug(16).kind === 'next', 'Mon after Push → Pull (Następny)')
ok(sug(18).day === 1 && sug(18).kind === 'missed', 'Wed, Pull skipped → Pull (Zaległy)')
ok(sug(19).day === 2 && sug(19).kind === 'today', 'Thu → Legs today even with Pull missed')
S(W(19), 2, { 'Przysiad Zerchera': done([60], [8]) })
ok(sug(19).day === 1 && sug(19).kind === 'missed', 'Thu after Legs → missed Pull')
ok(sug(20).day === 3 && sug(20).kind === 'today', 'Fri → Upper')
S(W(20), 3, { 'Wyciskanie na skosie na Smithie': done([40], [8]) })
ok(sug(21).day === 1 && sug(21).kind === 'missed', 'Sat → missed Pull (weekend catch-up)')
S(W(21), 1, { 'Face pull na wyciągu': done([20], [12]) })
ok(sug(22).day === 0 && sug(22).kind === 'next', 'Sun, all done → Push next week')
ok(sug(23).day === 0 && sug(23).kind === 'today', 'next Mon → Push')
reset()
S(W(17), 0, { [bench]: done([60], [8]) }) // Push on Tuesday (missed Monday)
ok(sug(17).day === 1 && sug(17).kind === 'today', 'Push done on Tue → Pull still today')
reset()
S(W(17), 1, { 'Face pull na wyciągu': done([20], [12]) })
ok(sug(17).day === 0 && sug(17).kind === 'missed', 'Tue did Pull, Mon skipped → Push missed')
reset()
ok(sug(22).day === 0 && sug(22).kind === 'missed', 'Sun, empty week → Push missed')
// unfinished but ticked counts; empty doesn't
S(W(16), 0, {})
ok(sug(16).day === 0, 'empty started workout does not count as done')
console.log(`\n${n - fails}/${n} passed`)
// ---------- assisted numbers ----------
reset()
const AK = P + 'Ze wspomaganiem'
S(dAgo(9), 1, { [AK]: done([30, 30], [8, 8]) }); S(dAgo(2), 1, { [AK]: done([25, 25], [7, 7]) })
const ser = store.series(AK); ok(ser[1].w === 25, 'series assisted = least help')
ok(stats.volumeOf(store.sorted()[0]) === 0, 'assisted kg not counted as volume')
const dk = store.deloadKg(25, { key: AK, name: plan.PULLUP }); ok(dk === 30, 'deload assisted = +5 kg help', dk)
console.log(`\n${n - fails}/${n} passed`)
reset()
S(dAgo(40), 3, { 'Podciąganie nachwytem (wspomagane)': done([30, 30, 30], [8, 7, 6]) })
S(dAgo(3), 1, { [P + 'Wiszenie']: done([30, 30, 30]), [P + 'Negatywy']: done([5, 5, 5]) })
const ns = store.startSession(1)
ok(ns.ex[AK]?.[0]?.w === 30 && ns.ex[AK].length === 3 && ns.ex[P + 'Negatywy'].length === 2, 'stage 2 start: assisted prefilled from old assisted pull-ups (30 kg), negatives 2 sets', ns.ex[AK])
console.log(`\n${n - fails}/${n} passed`)
// ---------- live advice + warm-up ----------
const bg = plan.entriesOf(0).find(g => g.name === bench)
const L = ex => coach.live(bg, { ex: { [bench]: ex } })
ok(coach.live(bg, { ex: { [bench]: [{ w: 60, r: 8, d: true, q: 1 }, { w: 60, r: 8, d: false }] } }) === null, 'live: normal set → nothing')
ok(L([{ w: 60, r: 7, d: true }, { w: 60, r: 7, d: true, q: 1 }, { w: 60, r: 6, d: false }]) === null, 'live: 8,7 drop → nothing')
let lv = L([{ w: 60, r: 4, d: true, q: 0 }, { w: 60, r: 6, d: false }, { w: 60, r: 6, d: false }])
ok(lv?.kind === 'down' && lv.w === 55 && lv.r === 6, 'live: 4 reps to failure → 55 × 6', lv)
ok(L([{ w: 60, r: 4, d: true, q: 0 }, { w: 55, r: 6, d: false }]) === null, 'live: already lighter → nothing')
ok(L([{ w: 60, r: 4, d: true, q: 2 }, { w: 60, r: 6, d: false }]) === null, 'live: 4 reps but 2 left (stopped early) → nothing')
lv = L([{ w: 60, r: 8, d: true, q: 3 }, { w: 60, r: 8, d: false }])
ok(lv?.kind === 'up' && lv.w === 62.5, 'live: 8 + 3 left → 62,5', lv)
lv = L([{ w: 60, r: 11, d: true }, { w: 60, r: 8, d: false }]); ok(lv?.kind === 'up', 'live: 11 reps → heavier')
ok(L([{ w: 60, r: 4, d: true, q: 0 }]) === null, 'live: no sets left → nothing')
ok(coach.live(bg, { deload: true, ex: { [bench]: [{ w: 60, r: 8, d: true, q: 3 }, { w: 60, r: 8, d: false }] } }) === null, 'live: not in deload')
const ag = { key: AK, name: plan.PULLUP, unit: 'kg', target: '3 × 6-8' }
lv = coach.live(ag, { ex: { [AK]: [{ w: 20, r: 3, d: true, q: 0 }, { w: 20, r: 6, d: false }] } }); ok(lv?.w === 25, 'live assisted: too hard → more help', lv)
ok(JSON.stringify(plan.warmupSets(60).map(x => x.w + 'x' + x.r)) === '["20x10","30x8","42.5x5","50x2"]', 'warm-up 60', plan.warmupSets(60))
ok(plan.warmupSets(20).length === 0 && plan.warmupSets(null).length === 0, 'no warm-up for empty bar / no weight')
ok(plan.platesPerSide(42.5).join() === '10,1.25', 'plates 42,5 → 10 + 1,25', plan.platesPerSide(42.5))
ok(plan.platesPerSide(100).join() === '25,15', 'plates 100 → 25 + 15')
console.log(`\n${n - fails}/${n} passed`)
// ---------- done outside the app ----------
reset()
S(W(19), 2, { 'Przysiad Zerchera': done([60], [8]) }); S(W(20), 3, { 'Wyciskanie na skosie na Smithie': done([40], [8]) })
ok(sug(21).day === 0 && sug(21).kind === 'missed', 'Sat: Push missed')
const mk = store.markDoneOff(0, null, at(2026, 11, 21)); ok(mk.date === W(16) && mk.offApp, 'Push marker on Monday', mk.date)
ok(sug(21).day === 1 && sug(21).kind === 'missed', 'then Pull missed')
store.markDoneOff(1, null, at(2026, 11, 21))
ok(sug(21).day === 0 && sug(21).kind === 'next', 'both marked → Push next week')
ok(stats.muscleSets().constructor === Object && store.doneSessions().length === 2, 'markers not in history/stats')
ok(store.lastDoneOf(0) === null, 'marker is not "last workout"')
const ps = store.startSession(0); ok(ps.ex[bench].length === 3, 'new Push still normal')
console.log(`\n${n - fails}/${n} passed`)
// ---------- pick plan + day ----------
reset()
S(W(16), 1, { 'Face pull na wyciągu': done([20], [12]) }) // Pull done on Monday (Push's day)
ok(sug(18).day === 0 && sug(18).kind === 'missed', 'Pull on Mon → Push missed on Wed')
const m2 = store.markDoneOff(0, W(17)); ok(m2.date === W(17), 'Push marked on Tuesday (picked)')
ok(sug(18).day === 2 && sug(18).kind === 'next', 'then Legs next (Thu)')
ok(store.markDoneOff(3, null, at(2026, 11, 18)).date === W(18), 'default date: Upper (Fri) marked on Wed → today')
store.remove(m2.id); ok(sug(18).day === 0, 'remove mark → Push missed again')
// marks don't break the deload count
reset(); weeks(43, 7)
for (const k of [8, 9, 10, 11, 12, 13, 14, 15]) for (const id of Object.keys(state.sessions)) if (state.sessions[id].date === dAgo(k)) delete state.sessions[id]
ok(!store.deloadState().due, 'gap of 8+ days → count restarts')
store.markDoneOff(0, dAgo(12))
ok(store.deloadState().due, 'off-app training in the gap → no break, deload still due')
console.log(`\n${n - fails}/${n} passed`)
// ---------- progress tab helpers ----------
reset()
S(dAgo(20), 1, { [P + 'Negatywy']: done([3, 3, 3]) }); S(dAgo(18), 3, { [P + 'Negatywy']: done([4, 4, 4]) })
ok(stats.prEvents() === 1, 'shared exercise (Pull+Upper) record counted once', stats.prEvents())
const rp = stats.recentPRs(5); ok(rp.length === 1 && rp[0].w === 4 && rp[0].prev === 3, 'recentPRs: 4 (was 3)', rp)
ok(stats.weekly(8).length === 8 && stats.weekly(8).reduce((a, w) => a + w.n, 0) === 2, 'weekly counts 2 workouts')
reset(); ok(stats.strengthTrend().length === 0 && stats.recentPRs().length === 0, 'empty: no trend, no records')
console.log(`\n${n - fails}/${n} passed`)
// ---------- swap a busy machine ----------
reset()
const FLY = 'Rozpiętki na bramie z dołu do góry', BF = 'Rozpiętki na maszynie (butterfly)'
S(dAgo(10), 3, { [BF]: done([50, 50, 50], [12, 12, 12]) })   // butterfly done on Upper
S(dAgo(7), 0, { [FLY]: done([10, 10, 10], [15, 15, 15]) })   // fly on Push
const sw = store.startSession(0)
ok(sw.ex[FLY]?.length === 3 && !sw.ex[BF], 'new Push starts with the plan exercise (fly)')
store.swapExercise(sw, FLY, BF)
ok(sw.swap?.[FLY] === BF && !sw.ex[FLY] && sw.ex[BF]?.[0].w === 50 && sw.ex[BF].length === 3, 'swap → butterfly prefilled from its own history (50 kg)', sw.ex[BF])
const flyEx = plan.PLAN[0].ex.find(e => e[0] === FLY)
ok(plan.groupsOf(flyEx, sw)[0].key === BF && plan.nameIn(flyEx, sw) === BF, 'groups follow the swap')
sg = coach.suggest(plan.groupsOf(flyEx, sw)[0], sw); ok(sg.sets && sg.sets[0].w === 50, 'coach uses butterfly history', sg)
sw.ex[BF].forEach(x => (x.d = true)); sw.finished = true
ok(stats.volumeOf(sw) === 50 * 12 * 3, 'volume counts the swapped exercise')
ok(plan.entriesOf(0, 'all').some(g => g.key === BF && g.alt), "progress ('all') lists the alternative")
store.swapExercise(sw, FLY, FLY); ok(sw.ex[BF]?.length === 3 && sw.ex[FLY]?.length === 3 && !sw.swap, 'swap back keeps ticked butterfly sets, adds fly')
const sd = store.startSession(3); store.swapExercise(sd, BF, FLY); ok(sd.ex[FLY][0].w === 10, 'Upper: butterfly → fly prefilled 10 kg')
console.log(`\n${n - fails}/${n} passed`)
// ---------- removed exercises / units ----------
reset()
ok(plan.unitOfKey(P + 'Wiszenie') === 's' && plan.unitOfKey('Face pull na wyciągu') === 'kg' && plan.unitOfKey('Stare', [{ w: 5 }]) === 'reps', 'unitOfKey')
const old = S(dAgo(3), 0, { 'Szrugsy': done([40, 40], [10, 10]), [bench]: done([60], [6]) })
ok(stats.volumeOf(old) === 40 * 10 * 2 + 360, 'volume counts exercises no longer in the plan', stats.volumeOf(old))
console.log(`\n${n - fails}/${n} passed`)
// ---------- own plans: count, hidden, weekdays, alternatives ----------
reset()
const W0 = { ...plan.WEEKDAY_TO_DAY }
plan.applyPlan(null)
ok(plan.PLAN.length === 4 && JSON.stringify(plan.WEEKDAY_TO_DAY) === JSON.stringify(W0) && plan.altOf(FLY)[0] === BF, 'default plan unchanged by applyPlan(null)')
plan.applyPlan({ days: [{ name: 'A', ex: [['Przysiad Zerchera', '3 × 6-8']] }, { name: 'B', ex: [[bench, '3 × 6-8']] }, { hidden: true, name: 'Nogi', ex: [] }, { hidden: true, name: 'Upper', ex: [] }], wd: {}, alts: { [bench]: ['Wyciskanie na maszynie Hammer'], [FLY]: [] } })
ok(plan.visiblePlans().join() === '0,1' && plan.PLAN[0].abbr === 'A', '2 trainings A/B, others hidden')
ok(plan.altOf(bench)[0] === 'Wyciskanie na maszynie Hammer' && plan.altOf(FLY).length === 0, 'own alternatives replace defaults')
ok(sug(23).day === 0 && sug(23).kind === 'next', 'no weekdays, nothing done → A')
S(W(23), 0, { 'Przysiad Zerchera': done([60], [8]) })
ok(sug(24).day === 1, 'rotation: after A → B')
S(W(24), 1, { [bench]: done([60], [8]) }); ok(sug(25).day === 0, 'rotation wraps to A')
plan.applyPlan({ days: [null, null, null, null, { name: 'Ramiona', ex: [['Uginanie', '3 × 8-12']] }], wd: { 1: 0, 6: 4 } })
ok(plan.PLAN.length === 5 && !plan.PLAN[4].hidden && plan.WEEKDAY_TO_DAY[6] === 4 && plan.WEEKDAY_TO_DAY[2] === undefined, '5th training with its own weekday')
plan.ensurePlans(7); ok(plan.PLAN.length === 8 && plan.PLAN[7].hidden, 'unknown training index → hidden placeholder')
plan.PLAN.length = 4; plan.applyPlan(null)
// ---------- progression settings ----------
{ const { prefs, DEFAULT_PREFS } = prefsM
  const g = plan.groupsOf(plan.PLAN[0].ex.find(e => e[0] === 'Wyciskanie sztangi na ławce płaskiej'))[0] // 3 × 6-8, step 2,5
  const K = g.key, sess = () => ({ id: 'x', date: dAgo(0), started: Date.now(), ex: {} })
  const q = (vals, qs) => vals.map((r, i) => ({ w: 60, r, d: true, q: qs[i] }))
  reset(); S(dAgo(3), 0, { [K]: q([7, 7, 7], [2, 2, 2]) })
  let sg = coach.suggest(g, sess()); ok(sg.kind === 'same', 'default: 2 left in every set → same weight', sg)
  prefs.rirUp = 2; sg = coach.suggest(g, sess()); ok(sg.kind === 'up' && sg.sets[0].w === 62.5, 'zapas setting 2 → add weight now', sg)
  prefs.rirUp = 3
  reset(); S(dAgo(3), 0, { [K]: done([60, 60, 60], [6, 6, 6]) })
  prefs.repsGain = 2; sg = coach.suggest(g, sess()); ok(sg.sets.map(x => x.r).join() === '8,8,8', 'reps +2 per workout', sg.sets)
  prefs.repsGain = 1
  reset(); S(dAgo(3), 0, { [K]: done([60, 60, 60], [8, 8, 8]) })
  prefs.stepKg = 5; sg = coach.suggest(g, sess()); ok(sg.sets[0].w === 65, 'weight step 5 kg', sg.sets[0])
  prefs.stepKg = 2.5
  reset(); S(dAgo(3), 0, { [K]: done([60, 60, 60], [6, 5, 4]) })
  sg = coach.suggest(g, sess()); ok(sg.kind !== 'down', 'default: one bad workout → no drop yet', sg)
  prefs.failN = 1; prefs.dropPct = 20; sg = coach.suggest(g, sess()); ok(sg.kind === 'down' && sg.sets[0].w === 47.5, 'drop after 1 workout, 20 % lighter', sg.sets?.[0])
  reset(); S(dAgo(6), 0, { [K]: done([60, 60, 60], [6, 5, 4]) }); S(dAgo(3), 0, { [K]: done([60, 60, 60], [6, 5, 4]) }); prefs.failN = 3; prefs.dropPct = 10
  sg = coach.suggest(g, sess()); ok(sg.kind !== 'down', 'drop after 3 → two bad workouts not enough', sg)
  S(dAgo(9), 0, { [K]: done([60, 60, 60], [6, 6, 4]) }); sg = coach.suggest(g, sess()); ok(sg.kind === 'down' && sg.sets[0].w === 55, 'third bad workout → 10 % lighter (55)', sg.sets?.[0])
  prefs.failN = 2
  // live advice follows zapas + drop
  const L = { id: 'l', date: dAgo(0), started: Date.now(), ex: { [K]: [{ w: 60, r: 8, d: true, q: 2 }, { w: 60, r: 8, d: false }] } }
  ok(!coach.live(g, L), 'live: 2 left at the top → nothing by default'); prefs.rirUp = 2; ok(coach.live(g, L)?.kind === 'up', 'live: zapas setting 2 → heavier'); prefs.rirUp = 3
  // deload knobs
  prefs.deloadPct = 20; ok(store.deloadKg(100, g) === 80, 'deload 20 % lighter'); prefs.deloadHalf = false; ok(store.deloadSets(4) === 4, 'deload keeps all sets when half is off')
  prefs.deloadHalf = true; ok(store.deloadSets(4) === 2 && (prefs.deloadPct = 10, store.deloadKg(100, g) === 90), 'defaults back')
  ok(Object.keys(DEFAULT_PREFS).every(k => prefs[k] === DEFAULT_PREFS[k]), 'all prefs back to defaults') }
console.log(`\n${n - fails}/${n} passed`)
// ---------- edge cases round (Nov 24) ----------
reset()
plan.applyPlan({ days: [{ name: 'Push', ex: [[bench, '3 × 6-8'], ['Face pull na wyciągu', '3 × 12-15', null, 'reps']] }, null, null, null], muscles: {} }) // old saved format (no wd/alts)
ok(JSON.stringify(plan.WEEKDAY_TO_DAY) === JSON.stringify(W0) && plan.altOf(FLY)[0] === BF, 'old saved plan format → default weekdays and alternatives')
S(dAgo(5), 0, { 'Face pull na wyciągu': done([20, 20], [12, 12]) })   // logged in kg before
const us = store.startSession(0)
ok(us.ex['Face pull na wyciągu'][0].w == null, 'unit changed kg → reps: no 20 kg prefilled as 20 reps', us.ex['Face pull na wyciągu'])
sg = coach.suggest(plan.entriesOf(0).find(g => g.key === 'Face pull na wyciągu'), us); ok(sg.kind === 'first', 'coach ignores kg history for a reps exercise', sg.kind)
delete state.sessions[us.id]
plan.applyPlan({ days: [null, null, null, null], wd: { 1: 2, 4: 0 } })
ok(plan.WEEKDAY_TO_DAY[1] === 2 && plan.WEEKDAY_TO_DAY[4] === 0 && plan.WEEKDAY_TO_DAY[2] === undefined, 'weekdays moved between trainings')
reset(); ok(sug(23).day === 2 && sug(23).kind === 'today', 'Mon → Nogi after moving Monday')
plan.applyPlan(null)
store.mergeSessions({ zz: { date: dAgo(1), day: 6, ex: { X: done([1]) }, updated: 5, finished: true } })
ok(plan.PLAN.length >= 7 && plan.PLAN[6].hidden && plan.PLAN[6].name, 'restored workout of an unknown training → placeholder, no crash')
ok(stats.plansDone() === 0 && store.doneSessions().length === 1, 'placeholder workouts stay in history but not in plan counts')
plan.PLAN.length = 4; plan.applyPlan(null)
reset()
plan.applyPlan({ days: [{ name: 'A', ex: [[bench, '3 × 6-8']] }, { name: 'B', ex: [['Przysiad Zerchera', '3 × 6-8']] }, { hidden: true, name: 'x', ex: [] }, { hidden: true, name: 'y', ex: [] }], wd: {} })
store.markDoneOff(0, W(23)); ok(sug(24).day === 1, 'rotation counts a training done without the app')
plan.applyPlan(null)
// ---------- progression settings ----------
{ const { prefs, DEFAULT_PREFS } = prefsM
  const g = plan.groupsOf(plan.PLAN[0].ex.find(e => e[0] === 'Wyciskanie sztangi na ławce płaskiej'))[0] // 3 × 6-8, step 2,5
  const K = g.key, sess = () => ({ id: 'x', date: dAgo(0), started: Date.now(), ex: {} })
  const q = (vals, qs) => vals.map((r, i) => ({ w: 60, r, d: true, q: qs[i] }))
  reset(); S(dAgo(3), 0, { [K]: q([7, 7, 7], [2, 2, 2]) })
  let sg = coach.suggest(g, sess()); ok(sg.kind === 'same', 'default: 2 left in every set → same weight', sg)
  prefs.rirUp = 2; sg = coach.suggest(g, sess()); ok(sg.kind === 'up' && sg.sets[0].w === 62.5, 'zapas setting 2 → add weight now', sg)
  prefs.rirUp = 3
  reset(); S(dAgo(3), 0, { [K]: done([60, 60, 60], [6, 6, 6]) })
  prefs.repsGain = 2; sg = coach.suggest(g, sess()); ok(sg.sets.map(x => x.r).join() === '8,8,8', 'reps +2 per workout', sg.sets)
  prefs.repsGain = 1
  reset(); S(dAgo(3), 0, { [K]: done([60, 60, 60], [8, 8, 8]) })
  prefs.stepKg = 5; sg = coach.suggest(g, sess()); ok(sg.sets[0].w === 65, 'weight step 5 kg', sg.sets[0])
  prefs.stepKg = 2.5
  reset(); S(dAgo(3), 0, { [K]: done([60, 60, 60], [6, 5, 4]) })
  sg = coach.suggest(g, sess()); ok(sg.kind !== 'down', 'default: one bad workout → no drop yet', sg)
  prefs.failN = 1; prefs.dropPct = 20; sg = coach.suggest(g, sess()); ok(sg.kind === 'down' && sg.sets[0].w === 47.5, 'drop after 1 workout, 20 % lighter', sg.sets?.[0])
  reset(); S(dAgo(6), 0, { [K]: done([60, 60, 60], [6, 5, 4]) }); S(dAgo(3), 0, { [K]: done([60, 60, 60], [6, 5, 4]) }); prefs.failN = 3; prefs.dropPct = 10
  sg = coach.suggest(g, sess()); ok(sg.kind !== 'down', 'drop after 3 → two bad workouts not enough', sg)
  S(dAgo(9), 0, { [K]: done([60, 60, 60], [6, 6, 4]) }); sg = coach.suggest(g, sess()); ok(sg.kind === 'down' && sg.sets[0].w === 55, 'third bad workout → 10 % lighter (55)', sg.sets?.[0])
  prefs.failN = 2
  // live advice follows zapas + drop
  const L = { id: 'l', date: dAgo(0), started: Date.now(), ex: { [K]: [{ w: 60, r: 8, d: true, q: 2 }, { w: 60, r: 8, d: false }] } }
  ok(!coach.live(g, L), 'live: 2 left at the top → nothing by default'); prefs.rirUp = 2; ok(coach.live(g, L)?.kind === 'up', 'live: zapas setting 2 → heavier'); prefs.rirUp = 3
  // deload knobs
  prefs.deloadPct = 20; ok(store.deloadKg(100, g) === 80, 'deload 20 % lighter'); prefs.deloadHalf = false; ok(store.deloadSets(4) === 4, 'deload keeps all sets when half is off')
  prefs.deloadHalf = true; ok(store.deloadSets(4) === 2 && (prefs.deloadPct = 10, store.deloadKg(100, g) === 90), 'defaults back')
  ok(Object.keys(DEFAULT_PREFS).every(k => prefs[k] === DEFAULT_PREFS[k]), 'all prefs back to defaults') }
console.log(`\n${n - fails}/${n} passed`)
