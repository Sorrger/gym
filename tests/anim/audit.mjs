// Finds animation glitches over every catalogue combination: joints that jump between two close moments,
// and machine arms / landmine poles whose length changes (a rigid part must keep its length).
import { BASES, fullSel, compose } from '../../src/catalog.js'
import { sceneFor } from '../../src/anim/scenes.js'
import { poseAt, joints } from '../../src/anim/rig.js'
const N = 120, out = []
const d = (a, b) => Math.hypot(a.x - b.x, a.y - b.y)
for (const b of BASES) {
  const seen = new Set()
  for (const eq of b.o.eq || ['']) for (const ax of ['', 'pos', 'v', 'angle', 'side']) for (const val of ax ? (ax === 'v' ? (b.v || []).map(x => x[0]) : b.o[ax] || []) : ['']) {
    const sel = fullSel(b, { ...fullSel(b, eq ? { eq } : {}), ...(ax ? { [ax]: val } : {}) }), key = JSON.stringify(sel)
    if (seen.has(key)) continue; seen.add(key)
    const sc = sceneFor(b.id, sel, compose(b, sel)); if (!sc) continue
    const J = []; for (let i = 0; i <= N; i++) J.push(joints(poseAt(sc.frames, i / N), sc.view))
    const names = ['W', 'E', 'K', 'A', 'S', 'H', 'W2', 'E2', 'K2', 'A2']
    let worst = 0, wn = ''
    for (const n of names) { if (!J[0][n]) continue; const steps = []; for (let i = 1; i <= N; i++) steps.push(d(J[i][n], J[i - 1][n])); const avg = steps.reduce((a, c) => a + c, 0) / N; const mx = Math.max(...steps); const r = mx - 3 * Math.max(avg, 0.4); if (mx > 9 && r > worst) { worst = r; wn = n + ' ' + mx.toFixed(0) + ' @' + steps.indexOf(mx) } }
    // a hand or foot told to be somewhere it cannot reach (e.g. floating above the floor it should press on)
    let miss = ''
    for (let i = 0; i <= N; i += 10) {
      const p = poseAt(sc.frames, i / N), j = J[i]
      for (const [x, y, n] of [['ax', 'ay', 'W'], ['fx', 'fy', 'A']]) if (p[x] != null && !p.hold && !p.hp) { const dd = d(j[n], { x: p[x], y: p[y] }); if (dd > 4 && p[y] > -20) miss = `${n} misses floor target by ${dd.toFixed(0)} @${i}` }
    }
    // any hand/foot target the limb cannot reach (hands floating off a handle, a bar, a box)
    let reach = ''
    for (let i = 0; i <= N; i += 6) {
      const p = poseAt(sc.frames, i / N), j = J[i]
      for (const [x, y, n] of [['ax', 'ay', 'W'], ['bx', 'by', 'W2'], ['fx', 'fy', 'A'], ['gx', 'gy', 'A2']]) if (p[x] != null && !(n[0] === 'W' && (p.hold || p.hp))) { const dd = d(j[n], { x: p[x], y: p[y] }); if (dd > 6 && dd > (parseFloat(reach.split(' ')[2]) || 0)) reach = `${n} short ${dd.toFixed(0)} @${i}` }
      if ((p.hold || p.hp) && j.P) { const dd = Math.min(d(j.W, j.P), d(j.W2, j.P)); if (dd > 6) reach = `hold short ${dd.toFixed(0)} @${i}` }
    }
    // body parts under the floor (side/front view, not seen from above)
    let under = ''
    if (!sc.top) for (let i = 0; i <= N; i += 6) for (const n of ['W', 'E', 'K', 'A', 'H', 'S', 'C', 'W2', 'E2', 'K2', 'A2']) if (J[i][n] && J[i][n].y > 4) under = `${n} under floor ${J[i][n].y.toFixed(0)} @${i}`
    // hand path that loops (goes one way, back, and the same way again)
    let loop = ''
    { const xs = J.map(j => j.W.x), ys = J.map(j => j.W.y); for (const arr of [xs, ys]) { let dir = 0, flips = 0, last = arr[0]; for (const v of arr) { if (Math.abs(v - last) < 6) continue; const nd = Math.sign(v - last); if (dir && nd !== dir) flips++; dir = nd; last = v } if (flips > 3) loop = `hand path turns ${flips}x` } }
    // weight / cable missing for the equipment chosen
    let kit = ''
    const kinds = (sc.gear || []).map(g => g.k)
    if (['db', 'bb', 'kb', 'pl', 'ez', 'hx', 'tb'].includes(sel.eq) && !kinds.some(k => ['db', 'bb', 'kb', 'pl', 'pole', 'handle', 'belt', 'roller', 'ball', 'wheel'].includes(k)) && !['farmer', 'jumps'].includes(b.id)) kit = 'no weight drawn'
    if (sel.eq === 'cb' && !kinds.some(k => ['cable', 'band', 'bar2'].includes(k))) kit = 'no cable'
    if (sel.eq === 'bd' && !kinds.some(k => ['band', 'footband', 'bandloop'].includes(k))) kit = 'no band'
    const rigid = []
    for (const g of sc.gear || []) if ((g.k === 'lever' && typeof g.pivot === 'object' && (!g.to || g.to === 'hands')) || g.k === 'pole') {
      const P = g.pivot || g.from; if (!P) continue
      const ls = J.map(j => d(j.P || j.W, P)), v = (Math.max(...ls) - Math.min(...ls)) / Math.max(...ls)
      if (v > 0.08) rigid.push(g.k + ' ' + Math.round(v * 100) + '%')
    }
    const all = [wn && 'jump ' + wn, ...rigid, miss, reach, under, loop, kit].filter(Boolean)
    if (all.length) out.push(`${compose(b, sel).name}  [${b.id} ${key}]  ${all.join(' | ')}`)
  }
}
console.log(out.join('\n')); console.log(out.length + ' flagged')
