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
    const rigid = []
    for (const g of sc.gear || []) if ((g.k === 'lever' && typeof g.pivot === 'object' && (!g.to || g.to === 'hands')) || g.k === 'pole') {
      const P = g.pivot || g.from; if (!P) continue
      const ls = J.map(j => d(j.P || j.W, P)), v = (Math.max(...ls) - Math.min(...ls)) / Math.max(...ls)
      if (v > 0.08) rigid.push(g.k + ' ' + Math.round(v * 100) + '%')
    }
    if (wn || rigid.length) out.push(`${compose(b, sel).name}  [${b.id} ${key}]  ${wn ? 'jump ' + wn : ''} ${rigid.join(' ')}`)
  }
}
console.log(out.join('\n')); console.log(out.length + ' flagged')
